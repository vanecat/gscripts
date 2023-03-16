function FIND_FILES_OWNED_OR_EDITED_BY_BOBBY() {
    new _SharedFilesUtils().findSharedFiles();
}

function CHANGE_FOLDER_CONTENTS_OWNER_RECURSIVELY() {
    new _SharedFilesUtils().getFoldersAndFilesIterative();
}
function _SharedFilesUtils() {
    var LOG_SHEET, RUNTIME = new Date(), COPY_DIR,
        STATUS_COMPLETE = 'COMPLETE',
        STATUS_IN_PROGRESS = 'IN_PROGRESS';


    COPY_DIR = getScriptProperties().SHARED_FILES_COPY_DIR;

    var findSharedFiles = function() {
        var actionName = 'find_files_owned';

        initLogSpreadsheet();

        var files = DriveApp.searchFiles("sharedWithMe");

        if (!files || !files.hasNext) {
            logStatus('error', "no shared files");
            return;
        }

        var i = 0;
        while (files.hasNext()) {
            i++;
            //if (i > 1000) {  break;  }
            var f = files.next();


            var lastIndex = parseInt(getLastIndexIfLastRunDidNotComplete(actionName));

            // If last index is set, and is greater than the current index
            //    =>  we have already scanned this file, SKIP IT
            if (!!lastIndex && i < lastIndex) { // will re-run last file processed
                continue;
            }

            var ownerEmailToSearchFor = getScriptProperties().SHARED_FILES_OWNER_EMAIL_SEARCH;
            if (!ownerEmailToSearchFor) {
                throw Error('owner email is not specified in script properties yet');
            }

            var ownerEmail = 'none';
            try {
                var owner = f.getOwner();
                ownerEmail = owner.getEmail();
            } catch (e) {}

            var editorsEmails = {};
            try {
                var editors = f.getEditors();
                for(var j=0;j<editors.length;j++) {
                    editorsEmails[editors[j].getEmail()] = true;
                }
            } catch(e) {}

            // CONDITIONAL:
            //if (ownerEmail == ownerEmailToSearchFor || !!editorsEmails[ownerEmail]) {
                logFileInfo(f, i, actionName, true /* is in loop */);
            //}


        }
        logStatus(actionName, STATUS_COMPLETE);
    };
    this.findSharedFiles  = findSharedFiles;

    function logStatus(action, status) {
        recordToLog(action, status, null /* no index */);
    }
    function logFileInfo(f, fileIndex, actionName, isInLoop) {
        if (!f) {
            return;
        }

        var name = 'not enough permissions for name';
        try {
            name = f.getName();
        } catch (e) {}

        var isTrashed = 'not enough permissions for name';
        try {
            isTrashed = f.isTrashed();
        } catch (e) {}

        var size = 'not enough permissions for size';
        try {
            size = f.getSize();
        } catch (e) {}

        var url = 'not enough permissions for url';
        try {
            url = f.getUrl();
        } catch (e) {}

        var fid = 'not enough permissions for id';
        try {
            fid = f.getId();
        } catch (e) {}

        var downloadUrl = 'not enough permissions for download URL';
        try {
            downloadUrl = f.getDownloadUrl();
        } catch (e) {}

        var sharingPermission = 'not enough permissions for sharing permission';
        try {
            sharingPermission = f.getSharingPermission();
        } catch (e) {}

        var sharingAccess = 'not enough permissions for sharing access';
        try {
            sharingAccess = f.getSharingAccess();
        } catch (e) {}

        var owner = 'not enough permissions for owner';
        var ownerEmail = 'none';
        try {
            owner = f.getOwner();
            ownerEmail = owner.getEmail();
        } catch (e) {}

        var viewers = 'not enough permission for viewers';
        var viewersString = '';
        try {
            viewers = f.getViewers();
            for(var j=0;j<viewers.length;j++)
                viewersString += viewers[j].getEmail() + ', ';
        } catch (e) {}
        var editors = 'not enough permission for editors';
        var editorsString = '';
        try {
            editors = f.getEditors();
            for(var j=0;j<editors.length;j++)
                editorsString += editors[j].getEmail() + ', ';

        } catch(e) {}

        var parents = 'not enough persmissions', parentsString = 'none';
        try {
            parents = f.getParents();
            if (!!parents && parents.hasNext()) {
                parentsString = 'some';
                while(parents.hasNext()) {
                    var p = parents.next();
                    parentsString += p.getName() + "\\";
                }
            }
        } catch(e) {}

        recordToLog(actionName, null, fileIndex, [name, isTrashed, size, url, fid, downloadUrl, sharingPermission, sharingAccess, ownerEmail, viewersString, editorsString, parentsString ], isInLoop);
    }


    function getFolderIdFromURL(idOrUrl) {
        var theId = idOrUrl;
        if (theId.indexOf('http') == 0) {
            var re = new RegExp("^https?://drive.google.com/drive/folders/([^/]+)");
            theId = re.exec(theId)[1];
        }
        return theId;
    }

    function getScriptProperties() {
        var props = PropertiesService.getScriptProperties();
        if (!props || !props.getProperties) {
            var errorDetails = '';
            if (!props) {
                errorDetails = 'cannot fetch script properties';
            } else if (!props.getProperties) {
                errorDetails = 'bad script properties returned';
            }
            throw Error(errorDetails);
        }
        return props.getProperties();
    }

    function initLogSpreadsheet() {
        var logFileId = getScriptProperties().SHARED_FILES_LOG;
        if (!logFileId) {
            throw Error('log file name not specified in script properties yet');
        }
        var logFile = DriveApp.getFileById(getDocIdFromURL(logFileId));
        if (!logFile) {
            throw Error('log file cannot be located');
        } else {
            var spreadsheet = SpreadsheetApp.open(logFile);
            if (!spreadsheet) {
                throw Error('log file wont open: ' + logFile.getName());
            }
            var currentUserEmail = Session.getActiveUser().getEmail(),
                sheetName = currentUserEmail.replace('@','<at>'), // let's name the sheet by the current user's email
                sheet = spreadsheet.getSheetByName(sheetName);
            if (!sheet) {
                sheet = spreadsheet.insertSheet(sheetName, spreadsheet.getNumSheets() + 1);
                if (!sheet) {
                    throw Error('cant open the 1st of the spreadsheet ' + logFile.getName());
                }
            }

            LOG_SHEET = sheet;
        }

        var headers = ['name', 'isTrashed', 'size', 'url', 'ID', 'downloadURL', 'sharingPermission', 'sharingAccess', 'owner', 'viewers', 'editors', 'folder'];
        headers.splice(0,0,'date/time', 'action', 'status', 'index');
        sheet.getRange(getColumnLetterRange(headers, 1 /* row 1 */)).setValues([headers]);

        // set the date column date-time format:
        sheet.getRange('A:A').setNumberFormat('mmm d,  h:mm:ss am/pm');
    }

    function recordToLog(action, status, index, itemToLog, isInLoop) {
        if (!LOG_SHEET) {
            return;
        }
        var sheet = LOG_SHEET;

        var rowNumber = 2; // by defaul all log records go to top row (but under the header row) i.e. into row 2

        // if we are recording to log, while being in a loop (find files/folders)
        //   let's update/add an INPROGRESS bar
        if (!!isInLoop) {
            updateActiveInProgressRow(action, index);
            rowNumber = 3; // update row number to three to account for the IN-PROGRESS line
        }

        sheet.insertRowBefore(rowNumber);

        var logLine;
        if (!itemToLog) {
            logLine = [];
        } else if (!(itemToLog instanceof Array)) {
            logLine = [itemToLog];
        } else {
            logLine = Array.prototype.constructor.apply(null, itemToLog);
        }
        logLine.splice(0,0, RUNTIME, action, status, (typeof index == 'undefined' ? '' : index));

        sheet.getRange(getColumnLetterRange(logLine, rowNumber)).setValues([logLine]);

        return true;
    }

    function getLastIndexIfLastRunDidNotComplete(action) {
        // get range and values (in an array object)
        var inProgressRow = getActiveInProgressRow(action);

        if (!!inProgressRow) {
            return inProgressRow[1][0][3]; //
        }
        return 0;
    }

    function updateActiveInProgressRow(action, newIndex) {
        // get range of first 4 columns (date/time, action, status, index) to check
        var inProgressRow = getActiveInProgressRow(action);

        // if progress row exists, update it
        if (!!inProgressRow) {
            var range = inProgressRow[0],
                values = inProgressRow[1];
            values[0][3] = newIndex; // update index to current index
            range.setValues(values);
        } else {
            // else add it (at row 2)
            LOG_SHEET.insertRowBefore(2); // row 2
            var range = LOG_SHEET.getRange('A2:D2'); // row 2 => 4 values  (columns)
            var values = [[RUNTIME, action, STATUS_IN_PROGRESS, newIndex]];
            range.setValues(values);
        }
    }
    // try to get the active in-Progress row for a given action
    //   i.e. (it should be row 2 if active) or if last run of type ACTION did not complete
    function getActiveInProgressRow(action) {
        // get range of first 4 columns (date/time, action, status, index) to check
        var inProgressCellsRange = LOG_SHEET.getRange('A2:D2'),
            inProgressCellsValues = inProgressCellsRange.getValues();
        if (inProgressCellsValues[0][1] == action && inProgressCellsValues[0][2] == STATUS_IN_PROGRESS) {
            return [inProgressCellsRange, inProgressCellsValues]; // return range + values in an array
        }
        return null; // none
    }

    function getDocIdFromURL(idOrUrl) {
        var theId = idOrUrl;
        if (theId.indexOf('http') == 0) {
            var re = new RegExp("^https?://docs.google.com/\\w+/d/([^/]+)");
            theId = re.exec(theId)[1];
        }
        return theId;
    }

    function getColumnLetterRange(arrayish, rowNum) {
        var firstColumnLetter = 'A',
            lastColumnLetter = getColumnLetter(arrayish.length);
        return firstColumnLetter+rowNum+':'+lastColumnLetter+rowNum;
    }

// "i" is 1-based index
    function getColumnLetter(i) {
        return String.fromCharCode("A".charCodeAt(0) + i - 1); // substract one so that column 1 = A (because i is 1-based)
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
    function copyFile(fileId, destinationPath) {

        var folderStatus = createParentFolders(destinationPath, COPY_DIR);
        if (!folderStatus.status) {
            return folderStatus;
        }

        var f1;
        try {
            var folder = folderStatus.folder;
            var fExistingIter = folder.getFilesByName(f.getName());
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


    var ii = 0;
    function getFoldersAndFilesIterative(opt_folder) {

        var folder;

        if (!opt_folder) {
            initLogSpreadsheet();
            var folderId = getScriptProperties().SHARED_FOLDER_TO_CHANGE_OWNER;

            if (!folderId) {
                throw Error('no folder ID in script properties to change owner for');
            }

            folder = DriveApp.getFolderById(getFolderIdFromURL(folderId));
        } else {
            folder = opt_folder;
        }


        if (!folder) {
            throw Error('no such folder change owner for: ' + folderId);
        }

        var actionName = 'owner-change';
        var newOwner = 'antikabgblog@gmail.com';

        if (!folder) {
            throw Error("folder to iterate on is bad");
        }

        ii++;
        var changeOwnerStatus = 'done';
        // change owner
        try {
            folder.setOwner(newOwner);
        } catch(e) {
            changeOwnerStatus = 'X';
        }
        recordToLog(actionName, changeOwnerStatus, ii, folder.getName());


        var childFiles = folder.getFiles();
        if (!!childFiles && childFiles.hasNext()) {
            while (childFiles.hasNext()) {
                ii++;
                var f = childFiles.next();

                changeOwnerStatus = 'done';
                // change owner
                try {
                    f.setOwner(newOwner);
                } catch(e) {
                    changeOwnerStatus = 'X';
                }
                recordToLog(actionName, changeOwnerStatus, ii, f.getName());
            }
        }

        var folders = folder.getFolders();
        while (folders.hasNext()) {
            var f2 = folders.next();
            if (!!f) {
                getFoldersAndFilesIterative(f2);
            }
        }
    }
    this.getFoldersAndFilesIterative = getFoldersAndFilesIterative;

}