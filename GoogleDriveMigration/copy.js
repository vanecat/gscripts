/**
 * Created by ivanvelev (vanecat@gmail.com) on 7/26/17
 * This script is governed by Creative Commons License Attribution-ShareAlike (CC BY-SA)
 *   This license lets others remix, tweak, and build upon this code-base even for commercial purposes,
 *   as long as they credit the developer (Ivan Velev) and license their new creations under the identical
 *   terms. This license is often compared to “copyleft” free and open source software licenses. All new
 *   works based on yours will carry the same license, so any derivatives will also allow commercial use.
 * Summary of permissions of the CC BY-SA license : https://creativecommons.org/licenses/by-sa/4.0/
 * Full legal text of the CC BY-SA license: https://creativecommons.org/licenses/by-sa/4.0/legalcode
 */

// -----------------------  HYPHAE FILES --------------------------
function COPY() {
    initHyphaeDriveFiles().copy();
}

function MERGE() {
    initHyphaeDriveFiles().merge();
}

function TEST_initSpreadSheet() {
    initHyphaeDriveFiles().testInitSpreadsheet();
}

function initHyphaeDriveFiles() {
    var props = PropertiesService.getScriptProperties();
    if (!props || !props.getProperties || !props.getProperties().spreadsheet) {
        throw Error('no hyphae drive file migration properties');
    }
    props = props.getProperties();

    Logger.log(props);
    return new HyphaeDriveFiles(props.spreadsheet, props.tempRootFolder, props.finalRootFolder, props.priority);
}

function HyphaeDriveFiles(masterSpreadsheetId, tempRootFolderId, finalRootFolderId, prioritiesToCopy) {
    var UNDEFINED;
    var LOG_SHEET, LOG_SHEET_FIELDS = {};
    var LOG_FILE = null, LOG_SHEET = null, LOG_SHEET_FIELDS = {}, LOG_SHEET_FIELDS_COUNT = 0;
    var DEBUG_ONLY_FUNCTION_IDS = [];
    var that = this;
    var RUNTIME = new Date();

    function init() {

        var debugIds = PropertiesService.getScriptProperties().getProperty('debugIds');
        if (!!debugIds && typeof debugIds == 'string') {
            DEBUG_ONLY_FUNCTION_IDS = debugIds.split(',');
            Logger.log(DEBUG_ONLY_FUNCTION_IDS);
        }
    }

    this.copy = function () {
        try {
            init();
            copy();
            recordLog('copy to temporary', true);
        } catch (e) {
            logError(e.message + ' (line:' + e.lineNumber + ')');
            recordLog('copy to temporary (ERROR)', true);
        }
    };

    function copy() {
        var destinationRoot = DriveApp.getFolderById(getFolderIdFromURL(tempRootFolderId));

        if (!destinationRoot) {
            logError('no destination root folder');
            return;
        }

        var fileInfo = scanSpreadsheet();

        for (var i = 0; i < fileInfo.length; i++) {
            var f = fileInfo[i];
            if (!!f.copied) { // don't run a row again (twice+), if already marked copied
                continue;
            }
            setCopyStatusInProgress(i);
            if (!!prioritiesToCopy) {
                var priorityFound = false;
                var prioritiesArr = prioritiesToCopy.split(',');
                for (var j = 0; j < prioritiesArr.length; j++) {
                    priorityFound = priorityFound || prioritiesArr[j] == f['priority'];
                }
                if (!priorityFound) {
                    updateCopyStatus(i, {status: false, message: 'skipped'});
                    continue;
                }
            }
            var status = copyFile(f['id'], f['destinationPath'], destinationRoot);
            if (!!status.status && !!status.file) {
                updateCopyStatus(i, status);
            } else {
                updateCopyStatus(i, status);
            }
        }
    }

    function scanSpreadsheet() {
        initLogSpreadsheet();

        logDebug(LOG_SHEET_FIELDS, 11);
        var values = LOG_SHEET.getSheetValues(1, 1, 100, LOG_SHEET_FIELDS_COUNT);

        var fileInfo = [];
        for (var i = 1; i < values.length; i++) {
            if (values[i][0] == "END") {
                break;
            }
            if (values[i][0] === "" || values[i][0] === null || typeof values[i][0] == "undefined") {
                continue;
            }

            fileInfo.push({
                'copied': values[i][LOG_SHEET_FIELDS['COPIED']],
                'merged': values[i][LOG_SHEET_FIELDS['MERGED']],
                'sourcePath': values[i][LOG_SHEET_FIELDS['PATHSOURCE']],
                'id': values[i][LOG_SHEET_FIELDS['DOCID']],
                'newId': values[i][LOG_SHEET_FIELDS['NEWDOCID']],
                'destinationPath': values[i][LOG_SHEET_FIELDS['PATHDESTINATION']],
                'priority': values[i][LOG_SHEET_FIELDS['PRIORITY']],
                'index': i + 1 // the real-absolute 1-based index (accounting for a header column)
            });
        }

        logDebug(fileInfo, 12);
        return fileInfo;
    }

    function setCopyStatusInProgress(i) {
        if (!!LOG_SHEET_FIELDS['LOG']) {
            LOG_SHEET.getRange(getColumnLetter(LOG_SHEET_FIELDS['LOG']) + (i + 2))
                .setValue('copy in progress');
        }

        if (!!LOG_SHEET_FIELDS['COPIEDDATETIME']) {
            LOG_SHEET.getRange(getColumnLetter(LOG_SHEET_FIELDS['COPIEDDATETIME']) + (i + 2))
                .setValue(RUNTIME);
        }
    }
    function updateCopyStatus(i, fileStatus) {

        if (!!LOG_SHEET_FIELDS['WHORAN']) {
            var whoRanRange = LOG_SHEET.getRange(getColumnLetter(LOG_SHEET_FIELDS['WHORAN']) + (i + 2));
            whoRanRange.setValue(mergeEmailIntoString(whoRanRange.getValues()[0][0], Session.getActiveUser().getEmail()));
        }

        if (!!LOG_SHEET_FIELDS['COPIED']) {
            LOG_SHEET.getRange(getColumnLetter(LOG_SHEET_FIELDS['COPIED']) + (i + 2))
                .setValue(fileStatus.status);
        }

        if (!!LOG_SHEET_FIELDS['COPIEDDATETIME']) {
            LOG_SHEET.getRange(getColumnLetter(LOG_SHEET_FIELDS['COPIEDDATETIME']) + (i + 2))
                .setValue(RUNTIME);
        }

        if (!!LOG_SHEET_FIELDS['LOG']) {
            LOG_SHEET.getRange(getColumnLetter(LOG_SHEET_FIELDS['LOG']) + (i + 2))
                .setValue(fileStatus.message);
        }

        if (!!fileStatus.status && !!fileStatus.fileId) {
            LOG_SHEET.getRange(getColumnLetter(LOG_SHEET_FIELDS['NEWDOCID']) + (i + 2))
                .setValue(fileStatus.fileId);

            var file = fileStatus.file;
            LOG_SHEET.getRange(getColumnLetter(LOG_SHEET_FIELDS['NEWURL']) + (i + 2))
                .setFormula('=HYPERLINK("'+file.getUrl()+'","'+file.getName()+'")');

            var fileParent = getLastParent(file);
            if (!!fileParent) {
                var fileParentPath = getFileOrFolderPath(file);
                LOG_SHEET.getRange(getColumnLetter(LOG_SHEET_FIELDS['NEWPATH']) + (i + 2) )
                    .setFormula('=HYPERLINK("' + fileParent.getUrl() + '", "' + fileParentPath + '")');
            }
        }
    }

    function initLogSpreadsheet() {
        LOG_FILE = DriveApp.getFileById(getDocIdFromURL(masterSpreadsheetId));
        if (!LOG_FILE) {
            logError('no log file found');
            return;
        } else {
            var spreadsheet = SpreadsheetApp.open(LOG_FILE);
            if (!spreadsheet) {
                logError('cant open spreadsheet ' + LOG_FILE.getName());
                return;
            }
            var sheet = spreadsheet.getSheets()[0];
            if (!sheet) {
                logError('cant open the 1st of the spreadsheet ' + LOG_FILE.getName());
                return;
            }
            LOG_SHEET = sheet;

            if (!LOG_SHEET_FIELDS_COUNT) {
                var values0 = LOG_SHEET.getSheetValues(1, 1, 1, 100);

                for (var i = 0; i < values0[0].length; i++) {
                    if (!values0[0][i]) {
                        continue;
                    }
                    LOG_SHEET_FIELDS[values0[0][i]] = i;
                    LOG_SHEET_FIELDS_COUNT++;
                }
            }
        }
    }
    function createParentFolders(path, root) {
        if (!path || path == '?') {
            return {status: false, message: 'folder name is empty'};
        }
        var foldersNames = path.split('\\');
        var currentFolder = root;

        for(var i=0; i<foldersNames.length; i++) {
            var folderName = foldersNames[i];
            if (!folderName) {
                continue;
            }
            var foldersFound = currentFolder.getFoldersByName(folderName);
            if (!!foldersFound && foldersFound.hasNext()) {
                currentFolder = foldersFound.next();
                continue;
            } else {
                try {
                    currentFolder = currentFolder.createFolder(folderName);
                } catch(e) {
                    var errorMessage = 'tmp parent folder ('+folderName+') cannot be created: '+e.message;
                    logError(errorMessage);
                    return { status : false, message: errorMessage };
                }

            }
        }
        return {status: true, folder: currentFolder};

    }
    function copyFile(fileId, destinationPath, destinationRoot) {
        var f;
        try {
            f = DriveApp.getFileById(getDocIdFromURL(fileId));
        } catch (e) {
            logError('file NOT found: ' + fileId);
            return { message: e.message, status: false };
        }

        if (!f) {
            logError('file found but NOT open:' + id);
            return { message: 'file not found', status: false };
        }

        var folderStatus = createParentFolders(destinationPath, destinationRoot);
        if (!folderStatus.status) {
            return folderStatus;
        }

        var status = [];
        var permissionType = 'not enough permissions for sharing permission';
        try {
            permissionType = f.getSharingPermission();
        } catch (e) {
            status.push('cant see permissions');
        }

        var accessType = 'not enough permissions for sharing access';
        try {
            accessType = f.getSharingAccess();
        } catch (e) {
            status.push('cant see access');
        }

        var owner = 'not enough permissions for owner';
        var ownerEmail = 'none';
        try {
            owner = f.getOwner();
            ownerEmail = owner.getEmail();
        } catch (e) {
            status.push('cant see owner');
        }

        var viewers = 'not enough permission for viewers';
        var viewersEmails = [];
        try {
            viewers = f.getViewers();
            for (var j = 0; j < viewers.length; j++) {
                viewersEmails.push(viewers[j].getEmail());
            }
        } catch (e) {
            status.push('cant see viewers');
        }


        var editors = 'not enough permission for editors';
        var editorsEmails = [ownerEmail];
        try {
            editors = f.getEditors();
            for (var j = 0; j < editors.length; j++) {
                editorsEmails.push(editors[j].getEmail());
            }
        } catch (e) {
            status.push('cant see editors');
        }

        var parents = 'not enough persmissions', parentsString = 'none';
        try {
            parents = f.getParents();
            if (!!parents && parents.hasNext()) {
                parentsString = 'some';
                while (parents.hasNext()) {
                    var p = parents.next();
                    parentsString += p.getName() + "\\";
                }
            }
        } catch (e) {
            status.push('cant see parents');
        }

        logDebug([accessType, permissionType, status], 12);

        var f1;
        try {
            var folder = folderStatus.folder;
            var fExistingIter = folder.getFilesByName(f.getName());
            logDebug('dup file in temp folder? ' + fExistingIter.hasNext(), 12);
            if (!fExistingIter.hasNext()) {
                f1 = f.makeCopy(f.getName(), folder);
                //setFilePermissions(f, f1);
                return { message: 'copied' + (status.length ? ': ' + status.join('; ') : ''), status: true, fileId: f1.getId(), file: f1 };
            } else {
                var fExisting = fExistingIter.next();
                return { message: 'already copied' + (status.length ? ': ' + status.join('; ') : ''), status: true, fileId: fExisting.getId(), file: fExisting };
            }
        } catch (e) {
            return { message: 'file not copied: '+e.message, status: false };
        }
    }

    function setFilePermissions(f, f1) {


        if (!!f1) {
            try {
                f1.setSharing(accessType, permissionType);
            } catch (e) {
                status.push('cant set sharing: ' + e.message);
            }


            try {
                f1.addViewers(viewersEmails);
            } catch (e) {
                status.push('cant set viewers:' + e.message);
            }

            try {
                f1.addEditors(editorsEmails);
            } catch (e) {
                status.push('cant set editors:' + e.message);
            }

            try {
                f1.setShareableByEditors(f.isShareableByEditors());
            } catch (e) {
                status.push('cant set shareable-by-editors:' + e.message);
            }

        }
    }
    function logProperties(f) {
        if (!f) {
            return;
        }
        var name = 'not enough permissions for name';
        try {
            name = f.getName();
        } catch (e) {
        }

        var isTrashed = 'not enough permissions for name';
        try {
            isTrashed = f.isTrashed();
        } catch (e) {
        }

        isTrashed = f.isTrashed() ? "trashed" : "";

        var size = 'not enough permissions for size';
        try {
            size = f.getSize();
        } catch (e) {
        }

        var url = 'not enough permissions for url';
        try {
            url = f.getUrl();
        } catch (e) {
        }

        var fid = 'not enough permissions for id';
        try {
            fid = f.getId();
        } catch (e) {
        }

        var sharingPermission = 'not enough permissions for sharing permission';
        try {
            sharingPermission = f.getSharingPermission();
        } catch (e) {
        }

        var sharingAccess = 'not enough permissions for sharing access';
        try {
            sharingAccess = f.getSharingAccess();
        } catch (e) {
        }

        var owner = 'not enough permissions for owner';
        var ownerEmail = 'none';
        try {
            owner = f.getOwner();
            ownerEmail = owner.getEmail();
        } catch (e) {
        }

        var viewers = 'not enough permission for viewers';
        var viewersString = '';
        try {
            viewers = f.getViewers();
            for (var j = 0; j < viewers.length; j++)
                viewersString += viewers[j].getEmail() + ', ';
        } catch (e) {
        }
        var editors = 'not enough permission for editors';
        var editorsString = '';
        try {
            editors = f.getEditors();
            for (var j = 0; j < editors.length; j++)
                editorsString += editors[j].getEmail() + ', ';

        } catch (e) {
        }

        var parents = 'not enough persmissions', parentsString = 'none';
        try {
            parents = f.getParents();
            if (!!parents && parents.hasNext()) {
                parentsString = 'some';
                while (parents.hasNext()) {
                    var p = parents.next();
                    parentsString += p.getName() + "\\";
                }
            }
        } catch (e) {
        }


        logDebug([name, isTrashed, size, url, fid, sharingPermission, sharingAccess, owner, ownerEmail, viewersString, editorsString, parents, parentsString], 12);
    }


    this.merge = function() {
        try {
            init();
            merge();
            recordLog('move from temporary to final', true);
        } catch (e) {
            logError(e.message + ' (line:'+e.lineNumber+')');
            recordLog('move from temporary to final (ERROR)', true);
        }
    };

    function merge (sourceRootOrNull, destinationRootOrNull) {
        var sourceRoot, destinationRoot;
        if (!sourceRootOrNull) {
            sourceRoot = DriveApp.getFolderById(getFolderIdFromURL(tempRootFolderId));
        } else {
            sourceRoot = sourceRootOrNull;
        }

        if (!destinationRootOrNull) {
            if (!finalRootFolderId) {
                try {
                    destinationRoot = DriveApp.getRootFolder();
                } catch(e) {
                    logError('cant access MyDrive: ' + e.message + ' (line:'+e.lineNumber+')');
                }
            } else {
                destinationRoot = DriveApp.getFolderById(getFolderIdFromURL(finalRootFolderId));
            }
        } else {
            destinationRoot = destinationRootOrNull;
        }


        if (!sourceRoot) {
            logError('no source root folder');
            return;
        }

        if (!destinationRoot) {
            logError('no destination root folder');
            return;
        }

        var files = sourceRoot.getFiles();
        var folders = sourceRoot.getFolders();

        var filesAtDestination = destinationRoot.getFiles();
        var foldersAtDestination = destinationRoot.getFolders();

        var fileNamesAtDestination = {};
        if (!!filesAtDestination && !!filesAtDestination.hasNext) {
            while (filesAtDestination.hasNext()) {
                var f = filesAtDestination.next();
                fileNamesAtDestination[f.getName()] = f;
            }
        }

        var folderNamesAtDestination = {};
        if (!!foldersAtDestination && !!foldersAtDestination.hasNext) {
            while (foldersAtDestination.hasNext()) {
                var f1 = foldersAtDestination.next();
                folderNamesAtDestination [f1.getName()] = f1;
            }
        }

        if (!!files && !!files.hasNext) {
            while (files.hasNext()) {
                var file = files.next();
                setMergeStatusInProgress(file);
                var destinationFile = fileNamesAtDestination[file.getName()];
                if (!!destinationFile) {
                    // DUPLICATE, log it
                    updateMergeStatus({status: false, message: 'existing file'}, file, null, destinationFile);
                } else {
                    var newParent = destinationRoot.addFile(file);
                    var oldParent = sourceRoot.removeFile(file);
                    var status = {status: true, message: 'copied+moved'};
                    if (newParent.getId() != destinationRoot.getId() || oldParent.getId() != sourceRoot.getId()) {
                        status.status = false;
                        if (newParent.getId() != destinationRoot.getId()) {
                            status.message += 'cannot add file to destination folder; ';
                        }
                        if (oldParent.getId() != sourceRoot.getId()) {
                            status.message += 'cannot remove file from source folder';
                        }
                    }
                    updateMergeStatus(status, file, newParent);
                }
            }
        }
        if (!!folders && !!folders.hasNext) {
            while (folders.hasNext()) {
                var folder = folders.next();
                var destinationFolder = folderNamesAtDestination[folder.getName()];
                if (!destinationFolder) {
                    destinationFolder = destinationRoot.createFolder(folder.getName());
                    //updateMergeStatus('new folder (did not exist in destination)', newFolder);
                }
                merge(folder, destinationFolder);
                if (!folder.getFiles().hasNext() && !folder.getFolders().hasNext()) {
                    sourceRoot.removeFolder(folder);
                    folder.setTrashed(true);
                }
            }
        }

    }

    var LOG_INDEX_BY_NEW_IDS = null;
    function getIndexOfFileByNewId (file) {
        if (!file || !file.getId || !file.getId()) {
            return UNDEFINED;
        }

        if (!LOG_INDEX_BY_NEW_IDS) {
            LOG_INDEX_BY_NEW_IDS = {};
            var filesInfo = scanSpreadsheet();
            for (var i = 0; i < filesInfo.length; i++) {
                var f = filesInfo[i];
                LOG_INDEX_BY_NEW_IDS[f.newId] = f;
            }
        }

        logDebug([LOG_INDEX_BY_NEW_IDS, file, file.getId()], 12);

        if (!LOG_INDEX_BY_NEW_IDS[file.getId()]) {
            logError('File not in spreadsheet: ' + file.getName() + ' / ' + file.getUrl());
            return UNDEFINED;
        }

        return LOG_INDEX_BY_NEW_IDS[file.getId()].index;
    }


    function setMergeStatusInProgress(file) {
        var i = getIndexOfFileByNewId(file);
        if (isUndefined(i)) {
            return;
        }

        LOG_SHEET.getRange(getColumnLetter(LOG_SHEET_FIELDS['LOG']) + i)
            .setValue('merge in progress');

        LOG_SHEET.getRange(getColumnLetter(LOG_SHEET_FIELDS['MERGEDDATETIME']) + i )
            .setValue(RUNTIME);
    }
    function updateMergeStatus(status, file, fileParent, dupFile) {
        var logIndex = getIndexOfFileByNewId(file);
        if (isUndefined(logIndex)) {
            return;
        }

        logDebug([LOG_SHEET_FIELDS, getColumnLetter(LOG_SHEET_FIELDS['MERGED']) + logIndex], 12);
        LOG_SHEET.getRange(getColumnLetter(LOG_SHEET_FIELDS['MERGED']) + logIndex )
            .setValue(status.status);

        LOG_SHEET.getRange(getColumnLetter(LOG_SHEET_FIELDS['MERGEDDATETIME']) + logIndex )
            .setValue(RUNTIME);

        LOG_SHEET.getRange(getColumnLetter(LOG_SHEET_FIELDS['LOG']) + logIndex )
            .setValue(status.message);

        if (!fileParent) {
            fileParent = getLastParent(file);
        }
        if (!!fileParent) {
            var fileParentPath = getFolderPathWithFolderNameItself(fileParent);
            LOG_SHEET.getRange(getColumnLetter(LOG_SHEET_FIELDS['NEWPATH']) + (logIndex) )
                .setFormula('=HYPERLINK("' + fileParent.getUrl() + '", "' + fileParentPath + '")');
        }

        if (!!dupFile) {
            LOG_SHEET.getRange(getColumnLetter(LOG_SHEET_FIELDS['EXISTINGURL']) + logIndex )
                .setFormula('=HYPERLINK("' + dupFile.getUrl() + '", "' + dupFile.getName() + '")');

            var dupFileParent = getLastParent(dupFile);
            if (!!dupFileParent) {
                var dupFileParentPath = getFileOrFolderPath(dupFile);
                LOG_SHEET.getRange(getColumnLetter(LOG_SHEET_FIELDS['EXISTINGPATH']) + logIndex)
                    .setFormula('=HYPERLINK("' + dupFileParent.getUrl() + '", "' + dupFileParentPath + '")');
            }

        }
    }

    function getLastParent(file) {
        var parents = file.getParents();
        var lastParent = null;
        // get last parent
        while(parents.hasNext()) {
            lastParent = parents.next();
        }
        return lastParent;
    }
    function getFileOrFolderPath(file) {
        var parent = getLastParent(file);
        if (!!parent) {
            return getFileOrFolderPath(parent) + '/' + parent.getName();
        } else {
            return '';
        }
    }
    function getFolderPathWithFolderNameItself(folder) {
        return getFileOrFolderPath(folder) + '/' + folder.getName();
    }

    function logDebug(stuff, debugId) {
        if (DEBUG_ONLY_FUNCTION_IDS.length == 0) {
            return;
        }

        var c = '|';
        // if the debug id is contained in the ids array, then add the debug
        if ((c+DEBUG_ONLY_FUNCTION_IDS.join(c)+c).indexOf(c+debugId+c) >= 0) {
            Logger.log(stuff);
        }
    }

    function logError(stuff) {
        Logger.log(stuff);
    }

    function recordLog(subject) {
        recordLogToSpreadsheet(subject) || mailLog(subject);
    }

    function recordLogToSpreadsheet(subject) {
        var spreadsheet = SpreadsheetApp.open(LOG_FILE);
        if (!spreadsheet) {
            logError('cant open spreadsheet ' + LOG_FILE.getName());
            return;
        }
        var sheet = spreadsheet.getSheetByName('COPY+MERGE LOG');
        if (!sheet) {
            sheet = spreadsheet.insertSheet("COPY+MERGE LOG", spreadsheet.getNumSheets() + 1);
            if (!sheet) {
                return false;
            }
        }

        Logger.log('User running: ' + Session.getActiveUser().getEmail());

        sheet.insertRowBefore(1);
        sheet.getRange("A1:C1").setValues([[RUNTIME, subject, Logger.getLog()]]);

        return true;
    }
    function mailLog(subject) {
        var subject = 'Google Scripts: ' + subject;
        var recipient = Session.getActiveUser().getEmail();

        var body = Logger.getLog();
        Logger.clear();
        MailApp.sendEmail(recipient, subject, body);
    }


    function getColumnCount(firstLetter, lastLetter) {
        return lastLetter.charCodeAt(0) - firstLetter.charCodeAt(0) + 1;
    }

    function getColumnLetter(i) {
        return String.fromCharCode("A".charCodeAt(0) + i);
    }

    function getDocIdFromURL(idOrUrl) {
        var theId = idOrUrl;
        if (theId.indexOf('http') == 0) {
            var re = new RegExp("^https?://docs.google.com/\\w+/d/([^/]+)");
            theId = re.exec(theId)[1];
        }
        return theId;
    }

    function getFolderIdFromURL(idOrUrl) {
        var theId = idOrUrl;
        if (theId.indexOf('http') == 0) {
            var re = new RegExp("^https?://drive.google.com/drive/folders/([^/]+)");
            theId = re.exec(theId)[1];
        }
        return theId;
    }

    function mergeEmailIntoString(emailString, newEmail) {
        var delim = ', ';
        var emailArr = emailString ? emailString.split(delim) : [];
        var emailHash = {};

        for(var i = 0; i < emailArr.length; i++) {
            var email = emailArr[i];
            if (!!emailHash[email]) {
                continue;
            }
            emailHash[email] = i;
        }

        if (typeof emailHash[newEmail] != 'undefined') {
            emailArr.splice(emailHash[newEmail], 1);
        }
        emailArr.unshift(newEmail);
        return emailArr.join(delim);
    }

    function isUndefined(a) {
        return typeof a == 'undefined';
    }

    this.testInitSpreadsheet = function() {
        init();
        scanSpreadsheet();
        recordLog('testing init spreadsheet', true);
    }
}



