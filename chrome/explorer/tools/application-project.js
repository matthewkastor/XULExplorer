
window.addEventListener("load", function() { ApplicationWizard.init(); }, false);

var ApplicationWizard = {
  __proto__: AbstractGeneratorWizard,

  init : function() {
    var self = this;

    // setup some defaults
    $("target-minver").value = "1.8";
    $("target-maxver").value = "1.9.0.*";
    $("ui-toolbar").checked = true;
    $("ui-mainmenu").checked = true;
    $("ui-about").checked = true;

    // Setup event handlers
    $("choosefolder").addEventListener("command", function(event) { self.chooseFolder(event) }, false);

    // Setup wizards handlers
    $("destination").addEventListener("pageadvanced", function(event) { self.validateDestination(event) }, false);
    $("general").addEventListener("pageadvanced", function(event) { self.validateGeneral(event) }, false);
    $("target").addEventListener("pageadvanced", function(event) { self.validateTarget(event) }, false);
    window.addEventListener("wizardfinish", function() { self.finish() }, false);

    var json = this.getAutoComplete("explorer.application.locations");
    $("folder").searchParam = json;
  },


  validateGeneral : function(event) {
    try {
      this._assertEmpty($("name"), "Name cannot be empty");
      this._assertEmpty($("version"), "Version cannot be empty");
      this._assertEmpty($("build"), "Build ID cannot be empty");

      this._checkID();
      this._checkPackage();

      // add a default to other fields based on entered data
      if ($("source").value.length == 0)
        $("source").value = $("package").value;
      if ($("title").value.length == 0)
        $("title").value = $("name").value;
    }
    catch (e) {
      event.preventDefault();
    }
  },

  validateTarget : function(event) {
      this._assertEmpty($("target-minver"), "Minimum version cannot be empty");
      this._assertEmpty($("target-maxver"), "Maximum version cannot be empty");
  },

  finish : function() {
    try {
      var folder = this.getDestination();
      ensureDirectory(folder);

      // add the folder to the autocomplete list
      this.setAutoComplete("explorer.application.locations", folder.path);

      var uri = Components.classes["@mozilla.org/network/io-service;1"]
                          .getService(Components.interfaces.nsIIOService).newURI("chrome://explorer/locale/explorer.dtd", null, null);
      var reg = Components.classes["@mozilla.org/chrome/chrome-registry;1"]
                          .getService(Components.interfaces.nsIChromeRegistry);
      uri = reg.convertChromeURL(uri);
      var template = uri.QueryInterface(Components.interfaces.nsIFileURL).file.parent;
      template.append("templates");
      template.append("application");

      var appgen = new ApplicationGenerator();
      appgen.rootFolder = folder;
      appgen.templateFolder = template;

      appgen.package = $("package").value;
      appgen.source = $("source").value;
      appgen.title = $("title").value;

      appgen.name = $("name").value;
      appgen.id = $("id").value;
      appgen.version = $("version").value;
      appgen.build = $("build").value;
      appgen.vendor = $("vendor").value;

      appgen.target = { minVersion: "", maxVersion: "" };
      appgen.target.minVersion = $("target-minver").value;
      appgen.target.maxVersion = $("target-maxver").value;

      // Check desired UI pieces
      if ($("ui-toolbar").checked) {
        appgen.ui.push("toolbar");
      }
      if ($("ui-mainmenu").checked) {
        appgen.ui.push("mainmenu");
      }
      if ($("ui-contextmenu").checked) {
        appgen.ui.push("contextmenu");
      }
      if ($("ui-sidebar").checked) {
        appgen.ui.push("sidebar");
      }
      if ($("ui-options").checked) {
        appgen.ui.push("options");
      }
      if ($("ui-about").checked) {
        appgen.ui.push("about");
      }

      appgen.workspace = $("workspace").selectedItem.value;

      appgen.run();

      // Show the files to the user
      revealDirectory(folder);

    }
    catch (e) {
      alert("Sorry, an error occurred while generating your application.  \n" +
            "Please report the following error to http://bugzilla.mozilla.org:\n\n" +
            e.toString());
    }
  }
};
