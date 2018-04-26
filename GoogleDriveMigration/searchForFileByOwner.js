function findFiles() {
    new _SharedFilesUtils().findSharedFiles();
}
function _SharedFilesUtils() {
    var LOG_SHEET, RUNTIME = new Date(),
        STATUS_COMPLETE = 'COMPLETE';


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
            if (i++ > 1000) {
                break;
            }
            var f = files.next();

            logFileInfo(f, i, actionName);
        }
        logStatus(actionName, STATUS_COMPLETE);
    };
    this.findSharedFiles  = findSharedFiles;

    function logStatus(action, status) {
        recordToLog(action, status, null /* no index */, message);
    }
    function logFileInfo(f, fileIndex, actionName) {
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

        var ownerEmailToSearchFor = getScriptProperties().SHARED_FILES_OWNER_EMAIL_SEARCH;
        if (!ownerEmailToSearchFor) {
            throw Error('owner email is not specified in script properties yet');
        }
        if (ownerEmail == ownerEmailToSearchFor || ownerEmail == 'none') {
            recordToLog(actionName, null, fileIndex, [name, isTrashed, size, url, fid, sharingPermission, sharingAccess, ownerEmail, viewersString, editorsString, parentsString ]);
        }
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

        var headers = ['name', 'isTrashed', 'size', 'url', 'ID', 'sharingPermission', 'sharingAccess', 'owner', 'viewers', 'editors', 'folder'];
        headers.splice(0,0,'date/time', 'action', 'status', 'index');
        sheet.getRange(getColumnLetterRange(headers, 1 /* row 1 */)).setValues([headers]);

    }

    function recordToLog(action, status, index, itemToLog) {
        if (!LOG_SHEET) {
            return;
        }
        var sheet = LOG_SHEET;


        sheet.insertRowBefore(2);

        var logLine;
        if (!(itemToLog instanceof Array)) {
            logLine = [itemToLog];
        } else {
            logLine = Array.prototype.constructor.apply(null, itemToLog);
        }
        logLine.splice(0,0, RUNTIME, action, status, (typeof index == 'undefined' ? '' : index));

        sheet.getRange(getColumnLetterRange(logLine, 2 /* row 2 */)).setValues([logLine]);

        return true;
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


}