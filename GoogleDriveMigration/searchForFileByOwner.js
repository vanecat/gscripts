var LOG_FILE, LOG_SHEET, RUNTIME = new Date();

function getSharedFiles() {
    initLogSpreadsheet();

    var files = DriveApp.searchFiles("sharedWithMe");
    getFiles(files, "shared files");
}


function getFiles(files, label, doNotLog) {
    if (!files || !files.hasNext) {
        logStatus('error', "has no/invalid child files");
        return;
    }

    var i = 0;
    while (files.hasNext()) {
        if (i++ > 10) {
            break;
        }
        var f = files.next();

        logProperties(f, i);
    }
    logStatus('success', 'DONE scanning');
}

function logError(message) {
    logStatus('error', message);
}
function logStatus(status, message) {
    recordToLog('status: '+status, null, message);
}
function logProperties(f, fileIndex) {
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

    recordToLog('file', fileIndex, [name, isTrashed, size, url, fid, sharingPermission, sharingAccess, ownerEmail, viewersString, editorsString, parentsString ]);
}


function getFolderIdFromURL(idOrUrl) {
    var theId = idOrUrl;
    if (theId.indexOf('http') == 0) {
        var re = new RegExp("^https?://drive.google.com/drive/folders/([^/]+)");
        theId = re.exec(theId)[1];
    }
    return theId;
}

function initLogSpreadsheet() {
    var logFileIdorUrl  = 'https://docs.google.com/spreadsheets/d/12nC1bvOkNLJD0aMfNEYn0E9_QBsgyik4N6K_sCxs43I';

    LOG_FILE = DriveApp.getFileById(getDocIdFromURL(logFileIdorUrl));
    if (!LOG_FILE) {
        logError('no log file found');
        return;
    } else {
        var spreadsheet = SpreadsheetApp.open(LOG_FILE);
        if (!spreadsheet) {
            logError('cant open spreadsheet ' + LOG_FILE.getName());
            return;
        }
        var currentUserEmail = Session.getActiveUser().getEmail(),
            sheetName = currentUserEmail.replace('@','<at>'), // let's name the sheet by the current user's email
            sheet = spreadsheet.getSheetByName(sheetName);
        if (!sheet) {
            sheet = spreadsheet.insertSheet(sheetName, spreadsheet.getNumSheets() + 1);
            if (!sheet) {
                logError('cant open the 1st of the spreadsheet ' + LOG_FILE.getName());
                return false;
            }
            // ONLY if creating it from scratch => clear the sheet
            sheet.getRange('A1:Z1000').deleteCells(); // clear the sheet
        }

        LOG_SHEET = sheet;
    }

    var headers = ['name', 'isTrashed', 'size', 'url', 'ID', 'sharingPermission', 'sharingAccess', 'owner', 'viewers', 'editors', 'folder'];
    headers.splice(0,0,'date/time', 'subject', 'index');
    sheet.getRange(getColumnLetterRange(headers, 1 /* row 1 */)).setValues([headers]);

}

function recordToLog(subject, index, itemToLog) {
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
    logLine.splice(0,0, RUNTIME, subject, (typeof index == 'undefined' ? '' : index));

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