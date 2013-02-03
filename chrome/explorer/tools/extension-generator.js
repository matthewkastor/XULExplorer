
function ExtensionGenerator() {
  this.rootFolder = null;
  this.name = "";
  this.id = "";
  this.version = "";
  this.description = "";

  this.homepageURL = "";
  this.updateURL = "";
  this.aboutURL = "";
  this.optionsURL = "";
  this.iconURL = "";

  this.author = "";
  this.contributors = [];

  this.targets = [];

  this.ui = [];

  this.templateFolder = null;
}

ExtensionGenerator.prototype = {
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

  createInstall : function() {
    if (this.rootFolder == null)
      return;

    // Hook up the options dialog if requested
    if (this.ui.indexOf("options") != -1 && (!this.optionsURL || this.optionsURL.length == 0)) {
      this.optionsURL = "chrome://" + this.package + "/content/options.xul";
    }

    var installFolder = this.rootFolder.clone();
    this._processTemplates(installFolder, ["install-rdf.tmpl"], ["install.rdf"]);
  },

  createManifest : function(fileName) {
    if (fileName == null)
      fileName = "chrome.manifest";

    var dataManifest = "content\t" + this.package + "\tchrome/content/\n";
    dataManifest += "locale\t" + this.package + "\ten-US\tchrome/locale/en-US/\n";
    dataManifest += "skin\t" + this.package + "\tclassic/1.0\tchrome/skin/\n";

    dataManifest += "\n";

    for (var target=0; target<this.targets.length; target++) {
      if (this.targets[target].id == "{ec8030f7-c20a-464f-9b0e-13a3a9e97384}")
        dataManifest += "overlay\tchrome://browser/content/browser.xul\tchrome://" + this.package + "/content/ff-overlay.xul\n";

      if (this.targets[target].id == "{3550f703-e582-4d05-9a08-453d09bdfdc6}")
        dataManifest += "overlay\tchrome://messenger/content/messenger.xul\tchrome://" + this.package + "/content/tb-overlay.xul\n";

      if (this.targets[target].id == "xulexplorer@developer.mozilla.org")
        dataManifest += "overlay\tchrome://explorer/content/explorer.xul\tchrome://" + this.package + "/content/xe-overlay.xul\n";

      //if(exists $data->{toolbar}) {
      //    $mf .= qq(style\tchrome://global/content/customizeToolbar.xul\tchrome://" + this.package + "/skin/overlay.css\n);
      //}
    }

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

    var contentTemplates = ["overlay-js.tmpl", "ff-overlay-xul.tmpl", "ff-overlay-js.tmpl"];
    var contentFiles = ["overlay.js", "ff-overlay.xul", "ff-overlay.js"];

    // add in optional files
    if (this.ui.indexOf("sidebar") != -1) {
      contentTemplates.push("ff-sidebar-xul.tmpl");
      contentFiles.push("ff-sidebar.xul");
      contentTemplates.push("ff-sidebar-js.tmpl");
      contentFiles.push("ff-sidebar.js");
    }
    if (this.ui.indexOf("about") != -1) {
      contentTemplates.push("about-xul.tmpl");
      contentFiles.push("about.xul");
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

    var langTemplates = ["overlay-dtd.tmpl", "overlay-properties.tmpl"];
    var langFiles = ["overlay.dtd", "overlay.properties"];

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

    var skinTemplates = ["overlay-css.tmpl"];
    var skinFiles = ["overlay.css"];
    this._processTemplates(skinFolder, skinTemplates, skinFiles);

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
    this.createInstall();
    this.createManifest();
    this.createContent();
  }
};
