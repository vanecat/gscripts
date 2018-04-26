var LOG_FILE, LOG_SHEET, RUNTIME = new Date();
var MY_LOG = [];

function log(a) {
    MY_LOG.push(a);
}

function getSharedFiles() {
    initLogSpreadsheet();

    var files = DriveApp.searchFiles("sharedWithMe");
    getFiles(files, "shared files");
}

function testLogFile() {
    initLogSpreadsheet();

    log([1,2,3]);
    log('b');

    recordLog('logger test');
}

function getFiles(files, label, doNotLog) {
    if (!files || !files.hasNext) {
        log(" has no/invalid child files");
        recordLog('error');
        return;
    }

    var i = 0;
    while (files.hasNext()) {
        if (i++ > 10) {
            break;
        }
        var f = files.next();

        logProperties(f);
    }
    recordLog('success');
}

var logPropertyHeaders = [];
function logProperties(f) {
    if (!f) {
        return;
    }
    logPropertyHeaders = [];
    var name = 'not enough permissions for name';
    try {

        name = f.getName();
    } catch (e) {}

    var isTrashed = 'not enough permissions for name';
    try {
        isTrashed = f.isTrashed();
    } catch (e) {}

    f.isTrashed() ? "trashed" : "";

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


    log([name, isTrashed, size, url, fid, sharingPermission, sharingAccess, owner, ownerEmail, viewersString, editorsString, parents, parentsString ]);
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
        var sheet = spreadsheet.getSheets()[0];
        if (!sheet) {
            logError('cant open the 1st of the spreadsheet ' + LOG_FILE.getName());
            return;
        }
        LOG_SHEET = sheet;
    }
}

function recordLog(subject) {
    var spreadsheet = SpreadsheetApp.open(LOG_FILE);
    if (!spreadsheet) {
        logError('cant open spreadsheet ' + LOG_FILE.getName());
        return;
    }
    var sheetName = 'test';
    var sheet = spreadsheet.getSheetByName(sheetName);
    if (!sheet) {
        sheet = spreadsheet.insertSheet(sheetName, spreadsheet.getNumSheets() + 1);
        if (!sheet) {
            return false;
        }
    }

    log('User running: ' + Session.getActiveUser().getEmail());

    for (var i=0; i<MY_LOG.length; i++) {
        sheet.insertRowBefore(1);

        if (!(MY_LOG[i] instanceof Array)) {
            MY_LOG[i] = [RUNTIME, subject, MY_LOG[i]];
        } else {
            MY_LOG[i].unshift(subject);
            MY_LOG[i].unshift(RUNTIME);
        }
        var lastColumn = getColumnLetter(MY_LOG[i].length - 1);
        sheet.getRange('A1:'+lastColumn+'1').setValues([MY_LOG[i]]);
    }

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

function getColumnLetter(i) {
    return String.fromCharCode("A".charCodeAt(0) + i);
}