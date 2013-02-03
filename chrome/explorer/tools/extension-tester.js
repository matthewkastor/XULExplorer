function ExtensionTester() {
  this.rootFolder = null;
  this.profileFolder = null;
  this.targetApp = null;
}

ExtensionTester.prototype = {
  _findApplicationINI : function() {
      var file = this.rootFolder.clone();
      file.append("application.ini");

      return (file && file.exists() ? file : null);
  },

  _findInstallRDF : function() {
      var file = this.rootFolder.clone();
      file.append("install.rdf");

      return (file && file.exists() ? file : null);
  },

  // this should be called only after we have the extension directory
  // tries to find the extension id from the application.ini file or the
  // install.rdf file
  // returns an extension id or null if one isn't found
  _findExtensionID : function() {
    var file;
    var extID = null;

    if ((file = this._findApplicationINI()) !== null) {
      var INIFACTORY = "@mozilla.org/xpcom/ini-parser-factory;1";
      var parserfactory = Components.manager.getClassObjectByContractID(INIFACTORY,
          Components.interfaces.nsIINIParserFactory);
      var parser = parserfactory.createINIParser(file);

      try {
          extID = parser.getString("App", "ID");
      }
      catch (ex)
      {
      }
    }
    else if ((file = this._findInstallRDF()) !== null) {
      var rdf = Components.classes["@mozilla.org/rdf/rdf-service;1"].getService(Components.interfaces.nsIRDFService);
      var ds = rdf.GetDataSourceBlocking("file://" + file.path);
      var source = rdf.GetResource("urn:mozilla:install-manifest");
      var target = rdf.GetResource("http://www.mozilla.org/2004/em-rdf#id");
      var node = ds.GetTarget(source, target, true);
      var resource = node.QueryInterface(Components.interfaces.nsIRDFLiteral);
      extID = resource.Value;
    }

    return extID;
  },

  // Tries to create a plain text file in the extensions folder inside the users
  // directory. Will attempt to create the folder if it does not already exist.
  // This should only be called once you have the extension id and profile
  // directory
  _createTest : function(extensionID) {
      var dir = this.profileFolder.clone();
      dir.append("extensions");

      if (!dir.exists()) {
          dir.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, IO_PERMS_DIRECTORY);
      }

      if (!dir.isDirectory()) {
          dump("Your Profile has extensions as a file, and not as a directory");
          return null;
      }

      var file = dir.clone();

      file.append(extensionID);
      if (file.exists()) {
          // ok, this exists. hmm, lets prompt the user to see if they want to
          // delete it
          if (confirm("The extension is already installed in firefox under this profile. Should I try to remove it?") == true) {
              file.remove(true);
          }
          else {
              return null;
          }

          // Oh well, we failed
          if (file.exists()) {
              dump("I wasn't able to remove the extension's directory");
              return null;
          }
      }

      file.create(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, IO_PERMS_DIRECTORY);
      stringToFile(this.rootFolder.path, file);

      return file;
  },

  // Runs host with a specific profile
  _executeHost : function() {
    // we are extracting the name of the profile from the folder path
    var profile = this.profileFolder.path;
    profile = profile.substring(profile.indexOf(".") + 1, profile.length);

    var process = Components.classes["@mozilla.org/process/util;1"].createInstance(Components.interfaces.nsIProcess);
    var args = ["-P", profile, "-no-remote"];
    process.init(this.targetApp);

    // wait for the process to end before continuing
    process.run(true, args, args.length);
  },

  run : function() {
    // get the extension id so we can make a test file
    var extensionID = this._findExtensionID();
    if (extensionID == null) {
      return false;
    }

    // create the test file in the "profiles/<name>/extensions" subfolder
    var file = this._createTest(extensionID);
    if (file == null) {
        return false;
    }

    // launch the target and the extension
    this._executeHost();

    // cleanup the file after the target closes
    file.remove(false);

    return true;
  }
};
