/**
 * Created by ivanvelev on 7/26/17.
 */


function CopyIvansTestFiles_Priority_1_and_2() {
    var props = {
        log: '1o3LOPYmN4dKEZV5Bh31aDYhq5IkZlslsQZyzRtgMGMg',
        temp: '0B7kqBR5fP2nJOUZPa0M3ZWlrcW8',
        final: '0B7kqBR5fP2nJYzU1QnU2aE90U2M',
        priority: [1,2]
    };


    new HyphaeDriveFiles(props.log, props.temp, props.final, props.priority).copyToTemp();
}

function MoveIvansTestFiles_Priority_1_and_2() {
    var props = {
        log: '1o3LOPYmN4dKEZV5Bh31aDYhq5IkZlslsQZyzRtgMGMg',
        temp: '0B7kqBR5fP2nJOUZPa0M3ZWlrcW8',
        final: '0B7kqBR5fP2nJYzU1QnU2aE90U2M',
        priority: [1,2]
    };


    new HyphaeDriveFiles(props.log, props.temp, props.final, props.priority).moveFromTempToFinal();
}



function HyphaeDriveFiles(masterSpreadsheetId, tempRootFolderId, finalRootFolderId, prioritiesToCopy) {
    var LOG_SHEET, LOG_SHEET_FIELDS = {};
    var LOG_FILE = null, LOG_SHEET = null, LOG_SHEET_FIELDS = {}, LOG_SHEET_FIELDS_COUNT = 0;
    var that = this;

    this.copyToTemp = function() {
        try {
            copyToTemp();
            mailLog('copy to temporary', true);
        } catch (e) {
            logError(e.message + ' (line:'+e.lineNumber+')');
            mailLog('copy to temporary (ERROR)', true);
        }
    };

    function copyToTemp () {
        var destinationRoot = DriveApp.getFolderById(tempRootFolderId);
        var fileInfo = scanSpreadsheet();

        for(var i=0; i<fileInfo.length; i++) {
            var f = fileInfo[i];

            if (!!prioritiesToCopy) {
                var priorityFound = false;
                for (var j=0; j<prioritiesToCopy.length; j++) {
                    priorityFound = priorityFound || prioritiesToCopy[j] == f['priority'];
                }
                if (!priorityFound) {
                    updateMoveToTempStatus(i, {status: false, message: 'skipped'});
                    continue;
                }
            }
            var status = copyFile(f['id'], f['destinationPath'], destinationRoot);
            if (!!status.status && !!status.file) {
                updateMoveToTempStatus(i, status);
            } else {
                updateMoveToTempStatus(i, status);
            }
        }
    }

    function scanSpreadsheet() {
        initLogSpreadsheet();

        logDebug(LOG_SHEET_FIELDS, 12);
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
                'sourcePath': values[i][LOG_SHEET_FIELDS['PATHSOURCE']],
                'id': values[i][LOG_SHEET_FIELDS['DOCID']],
                'newId': values[i][LOG_SHEET_FIELDS['NEWDOCID']],
                'destinationPath': values[i][LOG_SHEET_FIELDS['PATHDESTINATION']],
                'priority' : values[i][LOG_SHEET_FIELDS['PRIORITY']],
                'index': i + 1 // the real-absolute 1-based index (accounting for a header column)
            });
        }

        logDebug(fileInfo, 12);
        return fileInfo;
    }

    function updateMoveToTempStatus(i, fileStatus) {
        LOG_SHEET.getRange(getColumnLetter(LOG_SHEET_FIELDS['COMPLETED']) + (i + 2))
            .setValue(fileStatus.status);

        LOG_SHEET.getRange(getColumnLetter(LOG_SHEET_FIELDS['LOG']) + (i + 2))
            .setValue(fileStatus.message);

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
        LOG_FILE = DriveApp.getFileById(masterSpreadsheetId);
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
                logError('cant open the 2nd LOG_SHEET of the spreadsheet ' + LOG_FILE.getName());
                return;
            }
            LOG_SHEET = sheet;

            if (!LOG_SHEET_FIELDS_COUNT) {
                var values0 = LOG_SHEET.getSheetValues(1, 1, 1, 100);

                for (var i = 0; i < values0[0].length; i++) {
                    if (!values0[0][i]) {
                        break;
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
            f = DriveApp.getFileById(fileId);
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


        var f1;
        try {
            f1 = f.makeCopy(f.getName(), folderStatus.folder);
        } catch (e) {
            return { message: 'file not copied: '+e.message, status: false };
        }
        //setFilePermissions(f, f1);
        logDebug([accessType, permissionType, status], 12);
        return { message: 'copied' + (status.length ? ': ' + status.join('; ') : ''), status: true, fileId: f1.getId(), file: f1 };
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


    this.moveFromTempToFinal = function() {
        try {
            moveFromTempToFinal();
            mailLog('move from temporary to final', true);
        } catch (e) {
            logError(e.message + ' (line:'+e.lineNumber+')');
            mailLog('move from temporary to final (ERROR)', true);
        }
    };

    function moveFromTempToFinal (sourceRootOrNull, destinationRootOrNull) {
        var sourceRoot, destinationRoot;
        if (!sourceRootOrNull) {
            sourceRoot = DriveApp.getFolderById(tempRootFolderId);
        } else {
            sourceRoot = sourceRootOrNull;
        }

        if (!destinationRootOrNull) {
            destinationRoot = DriveApp.getFolderById(finalRootFolderId);
        } else {
            destinationRoot = destinationRootOrNull;
        }


        if (!sourceRoot || !destinationRoot) {
            logError('no root or destination folder');
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
                var destinationFile = fileNamesAtDestination[file.getName()];
                if (!!destinationFile) {
                    // DUPLICATE, log it
                    updateMoveToFinalStatus({status: false, message: 'existing file'}, file, null, destinationFile);
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
                    updateMoveToFinalStatus(status, file, newParent);
                }
            }
        }
        if (!!folders && !!folders.hasNext) {
            while (folders.hasNext()) {
                var folder = folders.next();
                var destinationFolder = folderNamesAtDestination[folder.getName()];
                if (!destinationFolder) {
                    destinationFolder = destinationRoot.createFolder(folder.getName());
                    //updateMoveToFinalStatus('new folder (did not exist in destination)', newFolder);
                }
                moveFromTempToFinal(folder, destinationFolder);
                if (!folder.getFiles().hasNext() && !folder.getFolders().hasNext()) {
                    sourceRoot.removeFolder(folder);
                    folder.setTrashed(true);
                }
            }
        }

    }

    var LOG_INDEX_BY_NEW_IDS = null;
    function getIndexOfFileByNewId (file) {
        if (!LOG_INDEX_BY_NEW_IDS) {
            LOG_INDEX_BY_NEW_IDS = {};
            var filesInfo = scanSpreadsheet();
            for (var i = 0; i < filesInfo.length; i++) {
                var f = filesInfo[i];
                LOG_INDEX_BY_NEW_IDS[f.newId] = f;
            }
        }
        logDebug([LOG_INDEX_BY_NEW_IDS, file, file.getId()], 12);
        return LOG_INDEX_BY_NEW_IDS[file.getId()].index;
    }

    function updateMoveToFinalStatus(status, file, fileParent, dupFile) {
        var logIndex = getIndexOfFileByNewId(file);

        logDebug([LOG_SHEET_FIELDS, getColumnLetter(LOG_SHEET_FIELDS['COMPLETED']) + logIndex], 12);
        LOG_SHEET.getRange(getColumnLetter(LOG_SHEET_FIELDS['COMPLETED']) + logIndex )
            .setValue(status.status);

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
        var debugOnlyIds = [];
        var c = '|';
        // if the debug id is contained in the ids array, then add the debug
        if ((c+debugOnlyIds.join(c)+c).indexOf(c+debugId+c) >= 0) {
            Logger.log(stuff);
        }
    }

    function logError(stuff) {
        Logger.log(stuff);
    }

    function mailLog(subject, shouldClearLog) {
        var subject = 'Google Scripts: ' + subject;
        var recipient = Session.getActiveUser().getEmail();

        var body = Logger.getLog();
        if (shouldClearLog) {
            Logger.clear();
        }
        MailApp.sendEmail(recipient, subject, body);
    }


    function getColumnCount(firstLetter, lastLetter) {
        return lastLetter.charCodeAt(0) - firstLetter.charCodeAt(0) + 1;
    }

    function getColumnLetter(i) {
        return String.fromCharCode("A".charCodeAt(0) + i);
    }
}
/* ==============================  MAIL LOG ==================================== */




