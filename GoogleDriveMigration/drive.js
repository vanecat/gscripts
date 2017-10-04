/**
 * Created by ivanvelev on 8/8/17.
 */


var DriveIterator = function(items) {
    this.queue = items;
    this.queueIndex = 0;
};
DriveIterator.prototype.queue = [];
DriveIterator.prototype.queueIndex = 0;

DriveIterator.prototype.next = function() {

};
DriveIterator.prototype.hasNext = function() {
    return this.queue.length > 0 && this.queueIndex < this.queue.length;
};

var DriveFileClass = function() {};

DriveFileClass.UNTITLED = 'untitled';

DriveAppClass.prototype.parents = [];
DriveAppClass.prototype.getParents = function() {
    return new DriveIterator(this.parents);
};

DriveAppClass.prototype.name = null;
DriveAppClass.prototype.getName = function() {
    return this.name;
};

DriveAppClass.prototype.url = null;
DriveAppClass.prototype.getUrl = function() {
    return this.url;
};

DriveAppClass.prototype.name = null;
DriveAppClass.prototype.getName = function() {
    return this.name;
};

DriveAppClass.prototype.id = null;
DriveAppClass.prototype.getId = function() {
    return this.id;
};


var DriveFolderClass = function() {};
DriveFolderClass.extends(DriveFileClass);

DriveFolderClass.prototype.files = [];
DriveFolderClass.prototype.filesNameIndex = {};

DriveFolderClass.prototype.addFiles = function(a,b,c) {
    for(var i = 0; i < arguments.length; i++) {
        var f = arguments[i];

        if (!f.isInstanceOf(DriveFileClass)) {
            continue;
        }

        var fileName = f.getName();
        if (!fileName) {
            fileName = DriveFileClass.UNTITLED;
        }

        var filesByName = this.filesNameIndex[fileName];

        if (!filesByName) {
            this.filesNameIndex[fileName] = filesByName = [];
        }
        filesByName.push(f);
        this.files.push(f);
    }
    return new DriveIterator(this.files);
};

DriveFolderClass.prototype.getFiles = function() {
    return new DriveIterator(this.files);
};

DriveFolderClass.prototype.getFilesByName = function(name) {
    var files = this.filesNameIndex[name];
    if (!files) {
        files = [];
    }
    return new DriveIterator(files);
};

DriveFolderClass.prototype.folders = [];
DriveFolderClass.prototype.addFolders = function(a,b,c) {
    for(var i = 0; i < arguments.length; i++) {
        var f = arguments[i];

        if (!f.isInstanceOf(DriveFolderClass)) {
            continue;
        }
        this.folders.push(f);
    }
    return new DriveIterator(this.files);
};

DriveFolderClass.prototype.getFolders = function() {
    return new DriveIterator(this.folders);
};



var DriveAppClass = function() {};
DriveAppClass.extends(DriveFolderClass);

DriveAppClass.prototype.getFolderById  = function(id) {

};


DriveAppClass.prototype.getFileById  = function(id) {
    return
};


DriveAppClass.prototype.getRootFolder = function(id) {

};



function getArgs(a) {
    return Array.prototype.slice.apply(a);
}

Object.prototype.extend = function(klass) {
    klass.prototype.__proto__ = this.prototype;
};

Object.prototype.extends = function(klass) {
    this.prototype.__proto__ = klass.prototype;
};

Object.prototype.parent= function(klass) {
    klass.prototype.__proto__ = this.prototype;
};

Object.prototype.isInstanceOf = function(k) { return (this instanceof k); };