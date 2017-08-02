function testCreateFolder() {
    DriveApp.createFolder("_Test");
}

function testCopyFileWithViewPermission() {
    var f = DriveApp.getFileById('1vhtJJk43nepju2StdOZ_ku4jVLiFwWuCCeghEVdnaVQ');
    if (!f || !f.getId) {
        return;
    }
    f.makeCopy(DriveApp.getRootFolder());
}

function getTestFolderViaSearch() {
    var searchResults = DriveApp.searchFolders('title contains "_Test"');

    var folder = searchResults.next();
    Logger.log([
        folder.getName(),
        folder.getOwner().getEmail()
    ]);

    mailLog("get test folder", true);
}

function getFoldersInTrash() {

    var folders = DriveApp.getTrashedFolders();

    getFolders(folders, "trash folder");

}
function getRootFolderChildren() {
    var folder = DriveApp.getRootFolder();
    Logger.log([
        folder.getName(),
        folder.getOwner().getEmail()
    ]);

    getFolders(folder, "root folder");

}


function getSharedFolders() {
    var folders = DriveApp.searchFolders("sharedWithMe");
    getFolders(folders, "shared folders");
}


function getSharedFiles() {
    var files = DriveApp.searchFiles("sharedWithMe");
    getFiles(files, "shared files");
}

function getSharedFilesAndFolders() {
    var folders = DriveApp.searchFolders("sharedWithMe");
    getFoldersAndFilesIterative(folders, "shared files and folders", 1);
}

function getSpecificFileWithId() {
    var file = DriveApp.getFileById("1StywWHfwAhsFuu0SNCImOy2mmIQySNNZbM2LlEle5BM");
    if (!file || !file.getId) {
        return;
    } else {
        logProperties(file);
    }
    mailLog("specific file", true);
}



function getFolders(folder, label) {
    if (!folder) {
        return;
    }

    var folders = (!!folder || !!folder.hasNext) ? folder : folder.getFolders();
    if (!folders || !(folders.hasNext)) {
        Logger.clear();
        Logger.log(folder.getName() + " has no/invalid child folders" + folders.hasNext());
        mailLog();
        return;
    }

    var i = 0;
    while (folders.hasNext()) {
        if (i++ > 10) {
            break;
        }
        var f = folders.next();
        logProperties(f);
    }

    mailLog(label + ": child folders", true);
}



function getFoldersAndFilesIterative(folder, label, depth, doNotLog) {
    if (!folder) {
        return;
    }

    var folders = (!!folder || !!folder.hasNext) ? folder : folder.getFolders();
    if (!folders || !(folders.hasNext)) {
        Logger.clear();
        Logger.log(folder.getName() + " has no/invalid child folders" + folders.hasNext());
        mailLog();
        return;
    }

    var i = 0;
    while (folders.hasNext()) {
        if (i++ > 10) {
            break;
        }
        var f = folders.next();
        logProperties(f);
        var childFiles = f.getFiles();
        Logger.log('files? ' + childFiles.hasNext());
        if (!!childFiles && childFiles.hasNext()) {
            getFiles(childFiles, label, true);
        }
        if (depth > 1) {
            var childFolders = f.getFolders();
            Logger.log('folders? ' + childFolders.hasNext());
            if (!!childFolders && childFolders.hasNext()) {
                getFoldersAndFilesIterative(childFolders, label, depth-1, true);
            }
        }

    }


    if (!doNotLog) {
        mailLog(label + ": child folders", true);
    }
}

function getFiles(files, label, doNotLog) {
    if (!files || !files.hasNext) {
        Logger.clear();
        Logger.log(" has no/invalid child files");
        mailLog();
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

    if (!doNotLog) {
        mailLog(label, true);
    }
}




/* ==============================  COPY FOLDERS ==================================== */

function copyFolders() {

    var folders = DriveApp.searchFolders('title = "Original"');
    while (folders.hasNext()) {
        var sourceFolder = folders.next();
        var targetFolder = 'Copy of ' + sourceFolder;
        Logger.log(sourceFolder);
        Logger.log(targetFolder);

        var source = DriveApp.getFoldersByName(sourceFolder);
        var target = DriveApp.createFolder(targetFolder);

        if (source.hasNext()) {
            copyFolder(source.next(), target);
        }

    }
}

function copyFolder(source, target) {

    var folders = source.getFolders();
    var files   = source.getFiles();

    while(files.hasNext()) {
        var file = files.next();
        file.makeCopy(file.getName(), target);
    }

    while(folders.hasNext()) {
        var subFolder = folders.next();
        var folderName = subFolder.getName();
        var targetFolder = target.createFolder(folderName);
        copyFolder(subFolder, targetFolder);
    }
}


function logProperties(f) {
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


    Logger.log([name, isTrashed, size, url, fid, sharingPermission, sharingAccess, owner, ownerEmail, viewersString, editorsString, parents, parentsString ]);
}

/* ==============================  MAIL LOG ==================================== */
function mailLog(subject, shouldClearLog) {
    var subject = 'Google Scripts: ' + subject;
    var recipient = Session.getActiveUser().getEmail();

    var body = Logger.getLog();
    if (shouldClearLog) {
        Logger.clear();
    }
    MailApp.sendEmail(recipient, subject, body);
}


function hyphaeCopy (id, source, destination, destinationRoot) {
    Logger.log([id, source, destination]);

    var f;
    try {
        f = DriveApp.getFileById(id);
    } catch(e) {
        Logger.log('file NOT found: ' + id);
        return e.message;
    }

    if (!f || !destination) {
        Logger.log('file found but NOT open:' +id);
        return false;
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
    var viewersEmails  = [];
    try {
        viewers = f.getViewers();
        for(var j=0;j<viewers.length;j++)
            viewersEmails.push(viewers[j].getEmail());
        status.push('viewers: '+viewersEmails);
    } catch (e) {
        status.push('cant see viewers');
    }


    var editors = 'not enough permission for editors';
    var editorsEmails = [ownerEmail];
    try {
        editors = f.getEditors();
        for(var j=0;j<editors.length;j++)
            editorsEmails.push(editors[j].getEmail());
        status.push('editors:'+editorsEmails);
    } catch(e) {
        status.push('cant see editors');
    }

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
        status.push('parents: '+parentsString);
    } catch(e) {
        status.push('cant see parents');
    }


    var f1;
    try {
        f1 = f.makeCopy(f.getName(), destinationRoot);
    } catch(e) {
        status.push('file NOT copied: '+ e.message);
    }

    if (!!f1) {
        try {
            f1.setSharing(accessType, permissionType);
        } catch(e) {
            status.push('cant set sharing: ' + e.message);
        }


        try {
            f1.addViewers(viewersEmails);
        } catch(e) {
            status.push('cant set viewers:' + e.message);
        }

        try {
            f1.addEditors(editorsEmails);
        } catch(e) {
            status.push('cant set editors:' + e.message);
        }

        try {
            f1.setShareableByEditors(f.isShareableByEditors());
        } catch(e) {
            status.push('cant set shareable-by-editors:' + e.message);
        }

    }
    Logger.log([accessType, permissionType, status]);
    return true;
}


/* ==============================  SPREADSHEET ==================================== */
function runHyphaeSpreadsheet() {
    var f = DriveApp.getFileById('1fxDSp_9NKxqsdkweDSTyMuQMcEz-liKjT6Fq6jNHQ4E');
    if (!f || !f.getId) {
        return;
    }

    var destinationRoot = DriveApp.getFolderById('0B7kqBR5fP2nJWm9BNXZxb096aEk');

    Logger.clear();

    var spreadsheet = SpreadsheetApp.open(f);
    var sheet = spreadsheet.getSheets()[0];

    var values0 = sheet.getSheetValues(1, 1, 1, 100);
    var fields = {};
    var fieldsCount = 0;
    for(var i=0; i<values0[0].length; i++) {
        if (!values0[0][i]) {
            break;
        }
        fields[values0[0][i]] = i;
        fieldsCount++;
    }
    Logger.log(fieldsCount);
    var values = sheet.getSheetValues(1, 1, 100, fieldsCount);

    for (var i=1;i < values.length; i++) {
        if (values[i][0] == "END") {
            break;
        }
        if (values[i][0] === "" || values[i][0] === null || typeof values[i][0] == "undefined" )  {
            continue;
        }
        var sourcePath = values[i][fields['SOURCEPATH']];
        var docId = values[i][fields['DOCID']];
        var destinationPath = values[i][fields['DESTINATIONPATH']];

        var status = hyphaeCopy(docId, sourcePath, destinationPath, destinationRoot);
        var statusCell = sheet.getRange(getColumnLetter(fields['COMPLETED'])+(i+1));
        statusCell.setValue(status);
    }


    mailLog('spreadsheet values', true);
}

function getColumnCount(firstLetter, lastLetter) {
    return lastLetter.charCodeAt(0) - firstLetter.charCodeAt(0) + 1;
}

function getColumnLetter(i) {
    return String.fromCharCode("A".charCodeAt(0) + i);
}



