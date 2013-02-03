var Options = {
  chooseSnippetsFolder : function () {
    const Cc = Components.classes;
    const Ci = Components.interfaces;

    var fp = Cc["@mozilla.org/filepicker;1"].createInstance(Ci.nsIFilePicker);

    var strings = document.getElementById("strings_options");
    var title = strings.getString("userSnippets.dialog");
    fp.init(window, title, Ci.nsIFilePicker.modeOpen);

    fp.appendFilters(Ci.nsIFilePicker.filterAll);
    if (fp.show() == Ci.nsIFilePicker.returnOK) {
      var userSnippetPref = document.getElementById("pref_usersnippets");
      userSnippetPref.value = fp.file.path;
    }
  },

  chooseManifestsFolder : function () {
    const Cc = Components.classes;
    const Ci = Components.interfaces;

    var fp = Cc["@mozilla.org/filepicker;1"].createInstance(Ci.nsIFilePicker);

    var strings = document.getElementById("strings_options");
    var title = strings.getString("userManifests.dialog");
    fp.init(window, title, Ci.nsIFilePicker.modeGetFolder);

    fp.appendFilters(Ci.nsIFilePicker.filterAll);
    if (fp.show() == Ci.nsIFilePicker.returnOK) {
      var txt = document.getElementById("manifests");
      txt.value = fp.file.path;
    }
  },

  addManifestsFolder : function() {
    var txt = document.getElementById("manifests");
    if (txt.value.length > 0)
      Options.addManifest(txt.value);
  },

  removeManifest : function(event){
    var listbox = document.getElementById("usermanifests_list");
    var target = listbox.selectedItem;
    var locations = listbox.getAttribute("value").split(";");
    locations = locations.filter(function(location) {
      return location != target.label;
    }, this);
    listbox.setAttribute("value", locations.join(";"));
    document.getElementById("paneManifests").userChangedValue(listbox);
  },

  addManifest : function(path){
    var listbox = document.getElementById("usermanifests_list");
    var locations = listbox.getAttribute("value").split(";");
    if (locations.indexOf(path) ==-  1) {
      locations.push(path);
      listbox.setAttribute("value", locations.join(";"));
      document.getElementById("paneManifests").userChangedValue(listbox);
    }
  },

  manifestLocationsKeypress : function(event) {
    if (event.keyCode == KeyEvent.DOM_VK_DELETE)
      this.removeManifest(event);
  },

  getManifestLocations : function() {
    return document.getElementById("usermanifests_list").getAttribute("value");
  },

  displayManifestLocations : function() {
    var listbox = document.getElementById("usermanifests_list");
    var prefValue = document.getElementById("paneManifests").preferenceForElement(listbox).value;
    var locations = prefValue.split(";");

    while (listbox.lastChild)
      listbox.removeChild(listbox.lastChild);

    locations.forEach(function(location) {
      if (location) {
        var listitem = document.createElement("listitem");
        listitem.setAttribute("label", location);
        listitem.label = location;
        listitem.setAttribute("context", "manifests_list_popup");
        listbox.appendChild(listitem);
      }
    },this);

    listbox.setAttribute("value", locations.join(";"));
    return listbox.getAttribute("value");
  }
};
