
window.addEventListener("load", function() { ExtensionWizard.init(); }, false);

var ExtensionWizard = {
  __proto__ : AbstractGeneratorWizard,

  init : function() {
    var self = this;

    // Setup event handlers
    $("choosefolder").addEventListener("command", function(event) { self.chooseFolder(event) }, false);
    $("target-firefox").addEventListener("command", function(event) { self.updateTarget(event) }, false);
    $("target-xulexplorer").addEventListener("command", function(event) { self.updateTarget(event) }, false);

    // Setup wizards handlers
    $("destination").addEventListener("pageadvanced", function(event) { self.validateDestination(event) }, false);
    $("general").addEventListener("pageadvanced", function(event) { self.validateGeneral(event) }, false);
    $("resources").addEventListener("pageadvanced", function(event) { self.validateResources(event) }, false);
    $("contributors").addEventListener("pageadvanced", function(event) { self.validateContributors(event) }, false);
    $("targets").addEventListener("pageadvanced", function(event) { self.validateTargets(event) }, false);
    window.addEventListener("wizardfinish", function() { self.finish() }, false);

    var json = this.getAutoComplete("explorer.extension.locations");
    $("folder").searchParam = json;
  },

  validateGeneral : function(event) {
    try {
      this._assertEmpty($("name"), "Name cannot be empty");
      this._assertEmpty($("version"), "Version cannot be empty");

      this._checkID();
      this._checkPackage();
    }
    catch (e) {
      event.preventDefault();
    }
  },

  validateResources : function(event) {
  },

  validateContributors : function(event) {
    try {
      this._assertEmpty($("author"), "Author should not be empty");
    }
    catch (e) {
      event.preventDefault();
    }
  },

  validateTargets : function(event) {
    if ($("target-firefox").checked == false && $("target-xulexplorer").checked == false) {
      alert("You must choose a target application");
      event.preventDefault();
    }
  },

  updateTarget : function(event) {
    var min = $(event.target.id + "-minver");
    var max = $(event.target.id + "-maxver");
    if (event.target.checked) {
      min.disabled = false;
      max.disabled = false;
    }
    else {
      min.disabled = true;
      max.disabled = true;
    }
  },

  finish : function() {
    try {
      var folder = this.getDestination();
      ensureDirectory(folder);

      // add the folder to the autocomplete list
      this.setAutoComplete("explorer.extension.locations", folder.path);

      var uri = Components.classes["@mozilla.org/network/io-service;1"]
                          .getService(Components.interfaces.nsIIOService).newURI("chrome://explorer/locale/explorer.dtd", null, null);
      var reg = Components.classes["@mozilla.org/chrome/chrome-registry;1"]
                          .getService(Components.interfaces.nsIChromeRegistry);
      uri = reg.convertChromeURL(uri);
      var template = uri.QueryInterface(Components.interfaces.nsIFileURL).file.parent;
      template.append("templates");
      template.append("extension");

      var extgen = new ExtensionGenerator();
      extgen.rootFolder = folder;
      extgen.templateFolder = template;
      extgen.name = $("name").value;
      extgen.package = $("package").value;
      extgen.id = $("id").value;
      extgen.version = $("version").value;
      extgen.description = $("description").value;

      extgen.homeURL = $("homeurl").value;
      extgen.updateURL = $("updateurl").value;
      extgen.optionsURL = $("optionsurl").value;
      extgen.iconURL = $("iconurl").value;

      extgen.author = $("author").value;

      // Add contributors
      if ($("contributors").value) {
        var contributors = $("contributors").value.split("\n");
        for (var contributorIndex=0; contributorIndex<contributors.length; contributorIndex++) {
          var contributor = {};
          contributor.name = contributors[contributorIndex];

          extgen.contributors.push(contributor);
        }
      }

      // Check desired targets
      if ($("target-firefox").checked) {
        var target = {id:"{ec8030f7-c20a-464f-9b0e-13a3a9e97384}", name:"Firefox", minVersion:"", maxVersion:""};
        target.minVersion = $("target-firefox-minver").value;
        target.maxVersion = $("target-firefox-maxver").value;
        extgen.targets.push(target);
      }
  /*
      if ($("target-thunderbird").checked) {
        var target = {id:"{3550f703-e582-4d05-9a08-453d09bdfdc6}", name:"Thunderbird", minVersion:"", maxVersion:""};
        target.minVersion = $("target-thunderbird-minver").value;
        target.maxVersion = $("target-thunderbird-maxver").value;
        extgen.targets.push(target);
      }
  */
      if ($("target-xulexplorer").checked) {
        var target = {id:"xulexplorer@developer.mozilla.org", name:"XUL Explorer", minVersion:"", maxVersion:""}
        target.minVersion = $("target-xulexplorer-minver").value;
        target.maxVersion = $("target-xulexplorer-maxver").value;
        extgen.targets.push(target);
      }


      // Check desired UI pieces
      if ($("ui-toolbarbutton").checked) {
        extgen.ui.push("toolbarbutton");
      }
      if ($("ui-mainmenu").checked) {
        extgen.ui.push("mainmenu");
      }
      if ($("ui-contextmenu").checked) {
        extgen.ui.push("contextmenu");
      }
      if ($("ui-sidebar").checked) {
        extgen.ui.push("sidebar");
      }
      if ($("ui-options").checked) {
        extgen.ui.push("options");
      }
      if ($("ui-about").checked) {
        extgen.ui.push("about");
      }

      extgen.run();

      // Show the files to the user
      revealDirectory(folder);
    }
    catch (e) {
      alert("Sorry, an error occurred while generating your extension.  \n" +
            "Please report the following error to http://bugzilla.mozilla.org:\n\n" +
            e.toString());
    }
  }
};
