
function ApplicationGenerator() {
  this.rootFolder = null;
  this.templateFolder = null;

  this.package = "";
  this.source = "main";
  this.title = "Test App";
  
  this.name = "";
  this.id = "";
  this.version = "";
  this.build = "";
  this.vendor = "";

  this.target = null;

  this.workspace = "none";  
  this.ui = [];
}

ApplicationGenerator.prototype = {
  _writeToFile : function(file, data) {
    var foStream = Components.classes["@mozilla.org/network/file-output-stream;1"]
                             .createInstance(Components.interfaces.nsIFileOutputStream);
    
    foStream.init(file, IO_MODE_WRONLY | IO_MODE_CREATE | IO_MODE_TRUNCATE, IO_PERMS_FILE, 0);
    foStream.write(data, data.length);
    foStream.close();
  },
  
  _readFromFile : function(file) {
    var data = "";
    var fstream = Components.classes["@mozilla.org/network/file-input-stream;1"]
                            .createInstance(Components.interfaces.nsIFileInputStream);
    var sstream = Components.classes["@mozilla.org/scriptableinputstream;1"]
                            .createInstance(Components.interfaces.nsIScriptableInputStream);
    fstream.init(file, -1, 0, 0);
    sstream.init(fstream); 
    
    var str = sstream.read(4096);
    while (str.length > 0) {
      data += str;
      str = sstream.read(4096);
    }
    
    sstream.close();
    fstream.close();
    
    return data;
  },
  
  _processTemplates : function(destFolder, templates, files) {
    for (var index=0; index<files.length; index++) {
      var fileIn = this.templateFolder.clone();
      fileIn.append(templates[index]);
      var fileData = this._readFromFile(fileIn);
  
      var fileData = Template.parse(fileData, this);
  
      var fileOut = destFolder.clone();
      fileOut.append(files[index]);
      this._writeToFile(fileOut, fileData);
    }
  },

  _copyResources : function(destFolder, sourceFolder, files) {
    for (var index=0; index<files.length; index++) {
      
      // If the file already exists at the location, remove it.
      // copyTo() throws an exception if the destination file exists.
      var destFile = destFolder.clone();
      destFile.append(files[index]);
      if (destFile.exists() && destFile.isFile()) {
        destFile.remove(false);
      }
      
      var file = sourceFolder.clone();
      file.append(files[index]);
      file.copyTo(destFolder, files[index]);
    }
  },

  createINI : function() {
    if (this.rootFolder == null)
      return;

    var installFolder = this.rootFolder.clone();
    this._processTemplates(installFolder, ["application-ini.tmpl"], ["application.ini"]);
  },

  createManifest : function(fileName) {
    if (fileName == null)
      fileName = "chrome.manifest";
      
    var dataManifest = "content\t" + this.package + "\tchrome/content/\n";
    dataManifest += "locale\t" + this.package + "\ten-US\tchrome/locale/en-US/\n";
    dataManifest += "skin\t" + this.package + "\tclassic/1.0\tchrome/skin/\n";

    var file = this.rootFolder.clone();
    file.append(fileName);
    this._writeToFile(file, dataManifest);
  },

  createContent : function() {
    var chromeFolder = this.rootFolder.clone();
    chromeFolder.append("chrome");
    ensureDirectory(chromeFolder);

    // build the content files
    var contentFolder = chromeFolder.clone();
    contentFolder.append("content");
    ensureDirectory(contentFolder);
    
    var contentTemplates = ["main-js.tmpl", "main-xul.tmpl", "controller-js.tmpl"];
    var contentFiles = [this.source + ".js", this.source + ".xul", "controller.js"];

    // add in optional files
    if (this.workspace == "browser") {
      contentTemplates.push("webprogresslistener-js.tmpl");
      contentFiles.push("webprogresslistener.js");
    }
    if (this.ui.indexOf("about") != -1) {
      contentTemplates.push("about-xul.tmpl");
      contentTemplates.push("about-js.tmpl");
      contentFiles.push("about.xul");
      contentFiles.push("about.js");
    }
    if (this.ui.indexOf("options") != -1) {
      contentTemplates.push("options-xul.tmpl");
      contentFiles.push("options.xul");
    }

    this._processTemplates(contentFolder, contentTemplates, contentFiles);
    
    // build the locale files
    var localeFolder = chromeFolder.clone();
    localeFolder.append("locale");
    ensureDirectory(localeFolder);

    var langFolder = localeFolder.clone();
    langFolder.append("en-US");
    ensureDirectory(langFolder);

    var langTemplates = ["main-dtd.tmpl"];
    var langFiles = [this.source + ".dtd"];

    // add in optional files
    if (this.ui.indexOf("about") != -1) {
      langTemplates.push("about-dtd.tmpl");
      langFiles.push("about.dtd");
    }
    if (this.ui.indexOf("options") != -1) {
      langTemplates.push("options-dtd.tmpl");
      langFiles.push("options.dtd");
    }

    this._processTemplates(langFolder, langTemplates, langFiles);

    // build the skin files
    var skinFolder = chromeFolder.clone();
    skinFolder.append("skin");
    ensureDirectory(skinFolder);

    var skinTemplates = ["main-css.tmpl"];
    var skinFiles = [this.source + ".css"];

    // add in optional files
    if (this.ui.indexOf("about") != -1) {
      skinTemplates.push("about-css.tmpl");
      skinFiles.push("about.css");
    }
    if (this.ui.indexOf("options") != -1) {
      skinTemplates.push("options-css.tmpl");
      skinFiles.push("options.css");
    }

    this._processTemplates(skinFolder, skinTemplates, skinFiles);

    var imagesFolder = skinFolder.clone();
    imagesFolder.append("images");
    ensureDirectory(imagesFolder);

    var sourceFolder = this.templateFolder.clone();
    sourceFolder.append("images");

    var imageFiles = ["copy.png"];
    if (this.workspace == "editor") {
      imageFiles.push("open.png");
      imageFiles.push("save.png");
      imageFiles.push("cut.png");
      imageFiles.push("paste.png");
      imageFiles.push("delete.png");
      imageFiles.push("bold.png");
      imageFiles.push("italic.png");
      imageFiles.push("underline.png");
    }
    if (this.workspace == "browser") {
      imageFiles.push("back.png");
      imageFiles.push("back-disabled.png");
      imageFiles.push("forward.png");
      imageFiles.push("forward-disabled.png");
      imageFiles.push("stop.png");
      imageFiles.push("stop-disabled.png");
      imageFiles.push("reload.png");
      imageFiles.push("go.png");
    }
    if (this.ui.indexOf("sidebar") != -1) {
      imageFiles.push("close.png");
    }
    if (this.ui.indexOf("options") != -1) {
      imageFiles.push("options-big.png");
    }
    this._copyResources(imagesFolder, sourceFolder, imageFiles);
    
    // build the preference files
    var defaultsFolder = this.rootFolder.clone();
    defaultsFolder.append("defaults");
    ensureDirectory(defaultsFolder);
    
    var prefsFolder = defaultsFolder.clone();
    prefsFolder.append("preferences");
    ensureDirectory(prefsFolder);

    var prefsTemplates = ["prefs-js.tmpl"];
    var prefsFiles = ["prefs.js"];
    this._processTemplates(prefsFolder, prefsTemplates, prefsFiles);    
  },
  
  run : function() {
    this.createINI();
    this.createManifest();
    this.createContent();
  }
};
