
window.addEventListener("load", function() { ExtensionTest.init(); }, false);

// communicates between the wizard and extensionTestManager
var ExtensionTest = {
  _strings : null,
  _prefs : null,
  
  init : function(_app) {
    var bundle = Components.classes["@mozilla.org/intl/stringbundle;1"]
                           .getService(Components.interfaces.nsIStringBundleService);
    this._strings = bundle.createBundle("chrome://explorer/locale/tools/extension-test.properties");

    this._prefs = Components.classes["@mozilla.org/preferences-service;1"]
                            .getService(Components.interfaces.nsIPrefBranch);  

    try {
      $("target-path").value = this._prefs.getCharPref("explorer.extension.test.target");
      $("profile-path").value = this._prefs.getCharPref("explorer.extension.test.profile");
      $("root-path").value = this._prefs.getCharPref("explorer.extension.test.root");
    }
    catch (e)
    {
    }

    var self = this;

    // Setup event handlers
    $("target").addEventListener("pageadvanced", function(event) { self.validateTarget(event) }, false);
    $("profile").addEventListener("pageadvanced", function(event) { self.validateProfile(event) }, false);
    $("root").addEventListener("pageadvanced", function(event) { self.validateRoot(event) }, false);
    $("choose-target").addEventListener("command", function(event) { self.chooseTarget(event) }, false);
    $("choose-profile").addEventListener("command", function(event) { self.chooseProfile(event) }, false);
    $("choose-root").addEventListener("command", function(event) { self.chooseRoot(event) }, false);

    // Setup finish handler
    window.addEventListener("wizardfinish", function() { self.finish() }, false);
  },
  
  validateTarget : function(event) {
    return !($("target-path").value == null);
  },
  
  validateProfile : function(event) {
    return !($("profile-path").value == null);
  },
  
  validateRoot : function(event) {
    return !($("root-path").value == null);
  },

  chooseTarget : function(event) {
    var loc = promptFile(this._strings.GetStringFromName("prompt.firefox"));
    $("target-path").value = loc;
  },

  chooseProfile : function(event) {
    var loc = promptDirectory(this._strings.GetStringFromName("prompt.profile"));
    $("profile-path").value = loc;
  },

  chooseRoot : function(event) {
    var loc = promptDirectory(this._strings.GetStringFromName("prompt.extension"));
    $("root-path").value = loc;
  },

  finish : function() {
    this._prefs.setCharPref("explorer.extension.test.target", $("target-path").value);
    this._prefs.setCharPref("explorer.extension.test.profile", $("profile-path").value);
    this._prefs.setCharPref("explorer.extension.test.root", $("root-path").value);

    var tester = new ExtensionTester();
    tester.rootFolder = fileFromPath($("root-path").value);
    tester.profileFolder = fileFromPath($("profile-path").value);
    tester.targetApp = fileFromPath($("target-path").value);
    tester.run();
  }
};
