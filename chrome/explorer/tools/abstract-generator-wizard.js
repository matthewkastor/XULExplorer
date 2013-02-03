const Cc = Components.classes;
const Ci = Components.interfaces;

// Base prototype containing functionality common to all
// file generating wizards.
var AbstractGeneratorWizard = {
  _assertEmpty : function(control, msg) {
    if (control.value.length == 0) {
      alert(msg);
      control.focus();
      throw Components.results.NS_ERROR_FAILURE;
    }
  },

  _checkDestination: function() {
    var folder = this.getDestination();

    // Make sure the folder is valid
    if (folder == null || (folder.exists() && !folder.isDirectory())) {
      alert("Invalid folder.");
      throw("invalid destination folder");
    }

    // Prompt if the folder exists and is not empty
    if (folder.exists() && folder.isDirectory()) {
      var folderContents = folder.directoryEntries;
      if (folderContents.hasMoreElements()) {
        var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                                      .getService(Components.interfaces.nsIPromptService);

        var confirmed = promptService.confirm(window,
                          "Overwrite?",
                          "There are already files in '" +
                          folder.path + "'.  " +
                          "If you proceed you may overwrite existing files.\n\n" +
                          "Continue with the selected folder?");
        if (!confirmed)
          throw("destination folder not empty");
      }
    }
  },

  _checkID: function() {
    // Check for valid ID
    this._assertEmpty($("id"), "ID cannot be empty");
    var idTest = /^(\{[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\}|[a-z0-9-\._]*\@[a-z0-9-\._]+)$/i;
    if (!idTest.test($("id").value)) {
      alert("Please provide a GUID or email-style ID");
      $("id").focus();
      throw("invalid id");
    }
  },

  _checkPackage: function() {
    // Check for a valid package name
    this._assertEmpty($("package"), "Package cannot be empty");
    var packageTest = /^[a-z0-9-\._]+$/i;
    if (!packageTest.test($("package").value)) {
      alert("Invalid package. Package name may not contain spaces or punctuation.");
      $("package").focus();
      throw("invalid package");
    }
  },

  getAutoComplete : function(pref) {
    var prefs = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefBranch2);
    var json = "[";
    try {
      var list = prefs.getCharPref(pref).split(";");
      for (var i=0; i<list.length; i++) {
        var item = list[i];
        if (item.length == 0)
          continue;

        if (i > 0)
          json += ",";
        json += "{value:\"" + item.replace("\\", "\\\\") + "\"}";
      }
      json += "]";
    }
    catch (e) {
    }
    return json;
  },

  setAutoComplete : function(pref, item) {
    var prefs = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefBranch2);
    try {
      var list = prefs.getCharPref(pref).split(";");
      var pos = list.indexOf(item);
      if (pos != -1)
          list.splice(pos, 1);
      list.splice(0, 0, [item]);
      prefs.setCharPref(pref, list.join(";"));
    }
    catch (e) {
    }
  },

  chooseFolder : function(event) {
    $("folder").value = promptDirectory("Select an existing empty folder or create a new one.");
  },

  // Get the destination as an nsILocalFile
  getDestination: function() {
    var path = $("folder").value;
    if (!path) {
      return null;
    }

    var file;
    try {
      file = fileFromPath(path);
    }
    catch(e) {
      file = null;
    }

    return file;
  },

  validateDestination : function(event) {
    try {
      this._checkDestination();
    }
    catch (e) {
      event.preventDefault();
    }
  }
};
