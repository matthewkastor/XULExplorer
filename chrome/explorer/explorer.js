/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Xul Explorer.
 *
 * The Initial Developer of the Original Code is Mark Finkle.
 * Portions created by the Initial Developer are Copyright (C) 2006
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Mark Finkle, <mark.finkle@gmail.com>, <mfinkle@mozilla.com>
 *   Cesar Oliveira, <coliveira@mozilla.com>
 *   Paul Medlock, <paul@medlock.com>
 *   John Marshall, <johnm555@gmail.com>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */
const Cc = Components.classes;
const Ci = Components.interfaces;

const NS_CHROME_MANIFESTS_FILE_LIST = "ChromeML";

// ------------------------------------------------------------------
// use helper functions to hook up the Explorer object so "this"
// works in the Explorer object
// ------------------------------------------------------------------

function explorer_startup() {
  Explorer.startup();
}

function explorer_shutdown() {
  Explorer.shutdown();
}


// ------------------------------------------------------------------
// attach to window events so Explorer object can startup / shutdown
// ------------------------------------------------------------------

window.addEventListener("load", explorer_startup, false);
window.addEventListener("unload", explorer_shutdown, false);


// ------------------------------------------------------------------
// Explorer object
// ------------------------------------------------------------------

var Explorer = {
  initialized : false,
  previewWindow : null,
  prefService : null,
  curEditor : null,

  _initSnippets : function() {
    // init the snippets
    SnippetManager.init(this, "chrome://explorer/content/snippets.json", this.prefService.getCharPref("explorer.snippets.user"));

    var stringbundle = document.getElementById("explorer_strings");
    var allCategory = stringbundle.getString("categoryAll.category");

    var categoryList = document.getElementById("snippet-type");
    categoryList.appendItem(allCategory, -1);

    var categories = SnippetManager.categories;
    for each(var category in categories) {
      categoryList.appendItem(category, categories.indexOf(category));
    }

    // let's get the startup snippet category in the menulist
    var startupCategory = this.prefService.getCharPref("explorer.startup.category");
    var startupIndex = categories.indexOf(startupCategory);
    categoryList.selectedIndex = startupIndex + 1;

    // fill the list based on the default category
    var snippetList = document.getElementById("snippets-list");
    var snippetIndices = SnippetManager.filterByCategory(startupIndex);
    for (var iSnippet in snippetIndices) {
      var templateIndex = snippetIndices[iSnippet];
      snippetList.appendItem(SnippetManager.snippets[templateIndex].title, templateIndex);
    }

    // Add the special 'templates' snippets to the file | new submennu
    var fileNewCategory = stringbundle.getString("fileNew.category");

    var categoryIndex = SnippetManager.categories.indexOf(fileNewCategory);
    var templateIndices = SnippetManager.filterByCategory(categoryIndex);
    var newPopup = document.getElementById("popup_new");
    for (var iIndex in templateIndices) {
      var templateIndex = templateIndices[iIndex];
      var menuitem = document.createElement("menuitem");
      menuitem.setAttribute("label", SnippetManager.snippets[templateIndex].title);
      menuitem.setAttribute("class", "menuitem-iconic menu-new-template");
      menuitem.setAttribute("oncommand", "SnippetHelper.load(" + templateIndex + ");");

      newPopup.appendChild(menuitem);
    }
  },

  _initSandboxManifest : function() {
    ChromeProvider.init();

    ManifestObserver.init(this, ChromeProvider);
    ManifestObserver.refresh();
  },

  _initSidebar : function(sidebarID) {
    if (sidebarID) {
      var sidebar = document.getElementById(sidebarID);
      var sidebarDeck = document.getElementById("sidebar_deck");
      sidebarDeck.selectedPanel = sidebar;
      var sidebarTitle = document.getElementById("sidebar_title");
      sidebarTitle.value = sidebar.getAttribute("label");
    }
  },

  _handleHelpMenu : function(event) {
    var updates = Cc["@mozilla.org/updates/update-service;1"].getService(Ci.nsIApplicationUpdateService);
    var um = Cc["@mozilla.org/updates/update-manager;1"].getService(Ci.nsIUpdateManager);

    // Disable the UI if the update enabled pref has been locked by the 
    // administrator or if we cannot update for some other reason
    var checkForUpdates = document.getElementById("menu_update");
    var canUpdate = updates.canUpdate;
    checkForUpdates.setAttribute("disabled", !canUpdate);
    if (!canUpdate)
      return; 

    var strings = document.getElementById("explorer_strings");
    var activeUpdate = um.activeUpdate;
    
    // If there's an active update, substitute its name into the label
    // we show for this item, otherwise display a generic label.
    function getStringWithUpdateName(key) {
      if (activeUpdate && activeUpdate.name)
        return strings.getFormattedString(key, [activeUpdate.name]);
      return strings.getString(key + "Fallback");
    }
    
    // By default, show "Check for Updates..."
    var key = "default";
    if (activeUpdate) {
      switch (activeUpdate.state) {
      case "downloading":
        // If we're downloading an update at present, show the text:
        // "Downloading Firefox x.x..." otherwise we're paused, and show
        // "Resume Downloading Firefox x.x..."
        key = updates.isDownloading ? "downloading" : "resume";
        break;
      case "pending":
        // If we're waiting for the user to restart, show: "Apply Downloaded
        // Updates Now..."
        key = "pending";
        break;
      }
    }
    checkForUpdates.label = getStringWithUpdateName("updatesItem_" + key);
    if (um.activeUpdate && updates.isDownloading)
      checkForUpdates.setAttribute("loading", "true");
    else
      checkForUpdates.removeAttribute("loading");
  },
  
  _handleWindowClose : function(event) {
    // handler for clicking on the 'x' to close the window
    return this.shutdownQuery();
  },

  _handleTabChange : function(event) {
    EditorListener.attach(this.getTextEditor());

    // simple minded way to set the view mode
    var editor = document.getElementById("workspaceview_editor");
    editor.click();

    // reset any preview
    this.refreshPreview();
  },

  _handleViewChange : function(event) {
    var editorButton = document.getElementById("workspaceview_editor");
    var previewButton = document.getElementById("workspaceview_preview");
    var panels = document.getElementById("workspace_tabpanels");
    var preview = document.getElementById("preview_frame");

    if (event.target.id == editorButton.id) {
      preview.collapsed = true;
      panels.collapsed = false;
      editorButton.checked = true;
      previewButton.checked = false;
    }
    else {
      panels.collapsed = true;
      preview.collapsed = false;
      editorButton.checked = false;
      previewButton.checked = true;

      // force a refresh on preview since you asked to see a preview
      this.refreshPreview();
    }
  },

  _handleEditorChange : function() {
    // mark editor as 'dirty'
    var tab = this.getTabForEditor(this.getCurrentEditor());
    if (tab) {
      tab.setAttribute("modified", "true");
    }

    // reset any preview
    if (AutoRefreshObserver.enabled) {
      this.refreshPreview();
    }
  },

  openUpdates : function(event) {
    var um = Cc["@mozilla.org/updates/update-manager;1"].getService(Ci.nsIUpdateManager);
    var prompter = Cc["@mozilla.org/updates/update-prompt;1"].createInstance(Ci.nsIUpdatePrompt);

    // If there's an update ready to be applied, show the "Update Downloaded"
    // UI instead and let the user know they have to restart the browser for
    // the changes to be applied. 
    if (um.activeUpdate && um.activeUpdate.state == "pending")
      prompter.showUpdateDownloaded(um.activeUpdate);
    else
      prompter.checkForUpdates();
  },
  
  startup : function() {
    if (this.initialized)
      return;
    this.initialized = true;

    var self = this;

    this.prefService = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefBranch2);

    // initialize
    this._initSnippets();
    this._initSandboxManifest();

    XULChecker.init("chrome://explorer/content/validator/xulschema.json");

    EditorListener.init(function() { self._handleEditorChange(); });

    // init the error watching
    ConsoleErrors.startup(this);
    this.hasErrors(false);

    fileController.init(this);
    editController.init(this);
    viewController.init(this);
    toolsController.init(this);
    helpController.init(this);
    messagesController.init(this);

    window.controllers.appendController(fileController);
    window.controllers.appendController(editController);
    window.controllers.appendController(viewController);
    window.controllers.appendController(toolsController);
    window.controllers.appendController(helpController);
    window.controllers.appendController(messagesController);

    window.addEventListener("close", function(event) { self._handleWindowClose(event); }, false);

    document.getElementById("workspace_tabs").addEventListener("select", function(event) { self._handleTabChange(event); }, false);

    document.getElementById("sidebar_close").addEventListener("command", function(event) { self.toggleSidebar(null, null); }, false);
    document.getElementById("messages_close").addEventListener("command", function(event) { self.toggleMessages(null, null); }, false);

    document.getElementById("workspaceview_editor").addEventListener("command", function(event) { self._handleViewChange(event); }, false);
    document.getElementById("workspaceview_preview").addEventListener("command", function(event) { self._handleViewChange(event); }, false);

    document.getElementById("popup_help").addEventListener("popupshowing", function(event) { self._handleHelpMenu(event); }, false);

    SnippetHelper.init();

    // let's get the startup snippet script to load into the editor
    var stringbundle = document.getElementById("explorer_strings");
    var scriptCategory = stringbundle.getString("fileNew.category");
    var startupScript = this.prefService.getCharPref("explorer.startup.script");
    var startupText = "";
    var snippets = SnippetManager.snippets;
    for (var iSnippet in snippets) {
      if (snippets[iSnippet].category == scriptCategory && snippets[iSnippet].title == startupScript) {
        startupText = snippets[iSnippet].code;
      }
    }

    // let's setup the initial sidebar
    var startupSidebar = this.prefService.getCharPref("explorer.startup.sidebar");
    if (startupSidebar.length == 0) {
      startupSidebar = "sidebar_snippets";
    }
    this._initSidebar(startupSidebar);

    // add the default editor
    this.addEditor(null, null, startupText);

    // hook up an observer on the auto preview pref
    // we delay this so the editor can completely load it's source
    setTimeout(function() { AutoRefreshObserver.init(self); }, 100);
  },

  shutdownQuery : function() {
    var tabbox = document.getElementById("workspace_tabbox");
    var tabs = document.getElementById("workspace_tabs");
    var tabElems = tabs.getElementsByTagName("tab");
    for (var iTab=0; iTab<tabElems.length; iTab++) {
      var tab = tabElems[iTab];
      if (tab.getAttribute("modified") == "true") {
        var stringbundle = document.getElementById("explorer_strings");
        var message = stringbundle.getFormattedString("saveFile.prompt", [tab.label]);

        var prompts = Cc["@mozilla.org/embedcomp/prompt-service;1"].getService(Ci.nsIPromptService);
        var check = {value: false};
        var flags = prompts.BUTTON_TITLE_SAVE      * prompts.BUTTON_POS_0 +
                    prompts.BUTTON_TITLE_DONT_SAVE * prompts.BUTTON_POS_1 +
                    prompts.BUTTON_POS_0_DEFAULT;
        var button = prompts.confirmEx(window, stringbundle.getString("explorer.title"), message, flags, "", "", "", null, check);

        if (button == 0) {
          tabbox.selectedTab = tab;
          CommandUpdater.doCommand("cmd_save");
        }
      }
    }

    return true;
  },

  shutdown : function() {
    EditorListener.attach(null);
    ConsoleErrors.shutdown();
  },

  getCurrentEditor : function() {
    var workspaceTabbox = document.getElementById("workspace_tabbox");
    var editors = workspaceTabbox.selectedPanel.getElementsByTagName("editor");
    if (editors.length == 1) {
      return editors[0];
    }
    return null;
  },

  getEditorForTab : function(aTab) {
    var aPanel = document.getElementById(aTab.linkedPanel);
    if (aPanel) {
      var editors = aPanel.getElementsByTagName("editor");
      if (editors.length == 1) {
        return editors[0];
      }
    }
    return null;
  },

  getTabForEditor : function(aEditor) {
    // Find the linked tab
    var tabPanel = aEditor.parentNode;
    var tabs = document.getElementById("workspace_tabs");
    var tabElems = tabs.getElementsByTagName("tab");
    for (var iTab=0; iTab<tabElems.length; iTab++) {
      var tab = tabElems[iTab];
      if (tab.linkedPanel == tabPanel.id) {
        return tab;
      }
    }
    return null;
  },

  addEditor : function(caption, title, source) {
    if (!caption) {
      caption = "Untitled";
    }

    var uuid = createUUID();

    var tabbox = document.getElementById("workspace_tabbox");
    var tabs = document.getElementById("workspace_tabs");
    var newTab = document.createElement("tab");
    newTab.setAttribute("id", "tab-" + uuid);
    newTab.setAttribute("label", caption);
    tabs.appendChild(newTab);

    var tabpanels = document.getElementById("workspace_tabpanels");
    var newPanel = document.createElement("tabpanel");
    newPanel.setAttribute("id", "tabpanel-" + uuid);
    tabpanels.appendChild(newPanel);

    newTab.linkedPanel = newPanel.id;

    var newEditor = document.createElement("editor");
    newEditor.setAttribute("type", "content");
    newEditor.setAttribute("context", "popup_editor");
    newEditor.setAttribute("flex", "1");
    newPanel.appendChild(newEditor);

    var self = this;
    function delayedInit() {
      newEditor.makeEditable("plaintext", false);

      var textEditor = newEditor.getEditor(newEditor.contentWindow).QueryInterface(Ci.nsIPlaintextEditor);
      textEditor.enableUndo(true);
      textEditor.rootElement.style.fontFamily = "-moz-fixed";
      textEditor.rootElement.style.fontSize = "10pt";
      textEditor.rootElement.style.whiteSpace = "nowrap";
      textEditor.rootElement.style.margin = 0;

      if (title)
        textEditor.document.title = title;
      else
        textEditor.document.title = "";

      // Load the source, if we have it. This is done before the editlistener
      // is attached
      if (source) {
        textEditor.insertText(source);
      }

      // Make sure the editor is ready before activating it
      tabbox.selectedTab = newTab;
      newEditor.contentWindow.focus();
    }
    setTimeout(delayedInit, 100);
  },

  removeEditor : function(aEditor) {
    // Find the linked tab and remove both tab and panel
    var tabPanel = aEditor.parentNode;
    var tab = this.getTabForEditor(aEditor);
    if (tab.linkedPanel == tabPanel.id) {
      if (tab.getAttribute("modified") == "true") {
        var stringbundle = document.getElementById("explorer_strings");
        var message = stringbundle.getFormattedString("saveFile.prompt", [tab.label]);
        if (confirm(message)) {
          //XXX assuming it is the currently selected editor
          CommandUpdater.doCommand("cmd_save");
        }
      }

      // Remove the tab, panel and editor
      tab.parentNode.removeChild(tab);
      tabPanel.parentNode.removeChild(tabPanel);
    }

    // Select another tab (first tab for now)
    var tabs = document.getElementById("workspace_tabs");
    var tabElems = tabs.getElementsByTagName("tab");
    if (tabElems.length > 0) {
      // Use selectedItem so the linked tabpanel is also selected
      tabs.selectedItem = tabElems[0];

      var newEditor = this.getEditorForTab(tabElems[0]);
      if (newEditor) {
        // In order for focus to work, we need to delay it
        function delayedFocus(aEditor) {
          aEditor.contentWindow.focus();
        }
        setTimeout(delayedFocus, 100, newEditor);
      }
    }
    else {
      // Auto add a new tab so we always have 1 editor
      this.addEditor();
    }
  },

  renameEditor : function(aEditor, caption, fileName, clearDirty) {
    // Find the linked tab and remove both tab and panel
    var tabPanel = aEditor.parentNode;
    var tab = this.getTabForEditor(aEditor);
    if (tab.linkedPanel == tabPanel.id) {
      tab.label = caption;
      if (clearDirty) {
        tab.setAttribute("modified", "false");
      }

      var textEditor = this.getTextEditor();
      textEditor.document.title = fileName;
    }
  },

  getTextEditor : function() {
    var editor = this.getCurrentEditor();
    if (editor) {
      var textEditor = editor.getEditor(editor.contentWindow).QueryInterface(Ci.nsIPlaintextEditor);
      return textEditor;
    }
    return null;
  },

  clearSource : function() {
    var textEditor = this.getTextEditor();
    textEditor.enableUndo(false);
    textEditor.selectAll();
    textEditor.deleteSelection(textEditor.eNone);
    textEditor.enableUndo(true);
    textEditor.resetModificationCount();

    textEditor.document.title = "";

    this.getCurrentEditor().contentWindow.focus();
    CommandUpdater.doCommand("cmd_moveTop");
  },

  getSource : function() {
    var textEditor = this.getTextEditor();
    var source = textEditor.outputToString("text/plain", 2);
    return source;
  },

  setSource : function(aText) {
    this.clearSource();
    this.insertText(aText);
  },

  insertText : function(aText) {
    var textEditor = this.getTextEditor();
    textEditor.insertText(aText);
  },

  refreshPreview : function() {
    this.hasErrors(false);

    var os = Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService);
    os.notifyObservers(null, "chrome-flush-caches", null);

    var source = this.getSource();
    var dataURI = "data:application/vnd.mozilla.xul+xml," + encodeURIComponent(source);

    var preview = document.getElementById("preview_frame");
    if (preview) {
      preview.setAttribute("src", dataURI);
    }

    if (this.previewWindow != null && this.previewWindow.closed == false) {
      this.previewWindow.document.location = dataURI;
    }
  },

  openPreview : function() {
    if (this.previewWindow == null || this.previewWindow.closed == true) {
      this.previewWindow = window.open("about:blank", "explorer-preview", "chrome,dependent,all,centerscreen,resizable=yes,width=400,height=400");
      this.refreshPreview();
    }
    return this.previewWindow;
  },

  getHelpURI : function(cmd) {
    var stringbundle = document.getElementById("explorer_strings");
    var helpURI;
    switch (cmd) {
      case "cmd_help":
        helpURI = stringbundle.getString("appReference.url");
        break;
      case "cmd_xulref":
        helpURI = stringbundle.getString("xulReference.url");
        break;
      case "cmd_xultut":
        helpURI = stringbundle.getString("xulTutorial.url");
        break;
      case "cmd_jsref":
        helpURI = stringbundle.getString("jsReference.url");
        break;
      case "cmd_keyword":
      {
        var keyword = this.getCurrentEditor().contentWindow.getSelection().toString();
        if (keyword.length > 0)
          helpURI = stringbundle.getString("xulKeyword.url") + keyword;
        else
          helpURI = stringbundle.getString("xulReference.url");
        break;
      }
    }
    return helpURI;
  },

  hasErrors : function(errors) {
    var errorImg = document.getElementById("img_jsconsole");
    if (errors) {
      errorImg.setAttribute("mode", "error");
    }
    else {
      errorImg.setAttribute("mode", "ok");
    }
  },

  toggleSidebar : function(sidebarID, forceOpen) {
    var sidebarBox = document.getElementById("sidebar_box");
    var sidebarSplitter = document.getElementById("sidebar_split");
    if (forceOpen || sidebarBox.hidden) {
      sidebarBox.hidden = false;
      sidebarSplitter.hidden = false;

      this._initSidebar(sidebarID);
    }
    else {
      sidebarBox.hidden = true;
      sidebarSplitter.hidden = true;
    }
  },

  toggleMessages : function(messageID, forceOpen) {
    var messagesBox = document.getElementById("messages_box");
    var messagesSplitter = document.getElementById("messages_split");
    if (forceOpen || messagesBox.hidden) {
      messagesBox.hidden = false;
      messagesSplitter.hidden = false;
    }
    else {
      messagesBox.hidden = true;
      messagesSplitter.hidden = true;
    }
  },

  clearMessages : function() {
    var outputTable = document.getElementById("output");
    while (outputTable.childNodes.length > 0) {
      outputTable.removeChild(outputTable.childNodes[0]);
    }
  },

  showOutput : function(outputs) {
    this.clearMessages();

    var showUI = true;
    var showA11y = true;

    var outputTable = document.getElementById("output");
    for (var iOutput=0; iOutput<outputs.length; iOutput++) {
      var isCode = outputs[iOutput].type.indexOf("CODE") != -1;
      var isUI = outputs[iOutput].type.indexOf("UI") != -1;
      var isA11y = outputs[iOutput].type.indexOf("A11Y") != -1;

      if (isCode || (showUI && isUI) || (showA11y && isA11y)) {
        var row = document.createElement("row");
        var type = document.createElement("label");
        var desc = document.createElement("description");

        type.setAttribute("value", "[" + outputs[iOutput].type + "]");

        desc.appendChild(document.createTextNode(outputs[iOutput].message + ":"));
        desc.appendChild(document.createTextNode("\n"));
        desc.appendChild(document.createTextNode(outputs[iOutput].context));

        row.appendChild(type);
        row.appendChild(desc);
        outputTable.appendChild(row);
      }
    }

    this.toggleMessages("output", true);
  }
};


// ------------------------------------------------------------------
// helper object that watches for autorefresh pref changes
// ------------------------------------------------------------------
var AutoRefreshObserver = {
  _pref : "explorer.preview.autorefresh",
  _app : null,

  observe: function(aSubject, aTopic, aPrefName)
  {
    if (aTopic != "nsPref:changed" || aPrefName != this._pref)
      return;

    if (this.enabled)
      this._app.refreshPreview();
  },

  init : function(aApp) {
    this._app = aApp;
    this._app.prefService.addObserver(this._pref, this, false);

    if (this.enabled)
      this._app.refreshPreview();
  },

  get enabled() {
    return this._app.prefService.getBoolPref(this._pref);
  }
};


var ManifestObserver = {
  _pref : "explorer.manifest.locations",
  _app : null,
  _provider : null,

  observe : function(aSubject, aTopic, aPrefName) {
    if (aTopic != "nsPref:changed" || aPrefName != this._pref)
      return;

    this.refresh();
  },

  init : function(aApp, aProvider) {
    this._app = aApp;
    this._provider = aProvider;
    this._app.prefService.addObserver(this._pref, this, false);
  },

  refresh : function() {
    this._provider.update();
    Cc["@mozilla.org/chrome/chrome-registry;1"].getService(Ci.nsIChromeRegistry).checkForNewChrome();
  }
}


// ------------------------------------------------------------------
// helper object that handles snippet interactions
// ------------------------------------------------------------------
var SnippetHelper = {
  init: function() {
    var snippetList = document.getElementById("snippets-list");
    snippetList.addEventListener("dblclick", this, false);
    snippetList.addEventListener("keypress", this, false);
    snippetList.addEventListener("draggesture", this, false);

    var categoryList = document.getElementById("snippet-type");
    categoryList.addEventListener("command", this, false)
  },

  load: function(templateIndex) {
    var snippetCode = SnippetManager.snippets[templateIndex].code;
    snippetCode = snippetCode.replace(/^\s*/, "").replace(/\s*$/, "");
    Explorer.addEditor(null, null, snippetCode);
  },

  insert: function() {
    var snippetList = document.getElementById("snippets-list");
    if (snippetList.selectedItem) {
      var snippetCode = SnippetManager.snippets[snippetList.selectedItem.value].code;
      snippetCode = snippetCode.replace(/^\s*/, "").replace(/\s*$/, "");
      Explorer.insertText(snippetCode);
    }
  },

  onCategoryChange: function() {
    var categoryList = document.getElementById("snippet-type");
    if (categoryList.selectedItem) {
      // save the current category
      Explorer.prefService.setCharPref("explorer.startup.category", categoryList.selectedItem.label);

      // clear the list of snippets
      var snippetList = document.getElementById("snippets-list");
      while (snippetList.getRowCount() > 0)
        snippetList.removeItemAt(0);

      // get a list of snippets in the given category and fill the list
      var snippetIndices = SnippetManager.filterByCategory(categoryList.selectedItem.value);
      for (var iSnippet in snippetIndices) {
        var templateIndex = snippetIndices[iSnippet];
        snippetList.appendItem(SnippetManager.snippets[templateIndex].title, templateIndex);
      }
    }
  },

  handleEvent: function(aEvent) {
    switch (aEvent.type) {
      case "dblclick":
        this.insert();
        break;
      case "keypress":
        if (aEvent.keyCode == KeyEvent.DOM_VK_RETURN)
          this.insert();
        break;
      case "draggesture":
        nsDragAndDrop.startDrag(aEvent, this);
        break;
      case "command":
        this.onCategoryChange();
        break;
    }
  },

  onDragStart: function(aEvent, aTransferData, aAction) {
    var snippetList = document.getElementById("snippets-list");
    if (snippetList.selectedItem) {
      var plainText = SnippetManager.snippets[snippetList.selectedItem.value].code;
      plainText = plainText.replace(/^\s*/, "").replace(/\s*$/, "");
      aTransferData.data = new TransferData();
      aTransferData.data.addDataForFlavour("text/unicode", plainText);
    }
  }
}


/**
 * helper methods
 * TODO: move to a utility file
 */
function createUUID()
{
  return [4, 2, 2, 2, 6].map(function(length) {
    var uuidpart = "";
    for (var i=0; i<length; i++) {
      var uuidchar = parseInt((Math.random() * 256)).toString(16);
      if (uuidchar.length == 1)
        uuidchar = "0" + uuidchar;
      uuidpart += uuidchar;
    }
    return uuidpart;
  }).join('-');
}


/**
 * utility that is not defined in toolkit, but the main app script
 * for some reason. It can be (and is) used by extensions.
 */
function toOpenWindowByType(inType, uri, features)
{
  var windowManager = Cc['@mozilla.org/appshell/window-mediator;1'].getService();
  var windowManagerInterface = windowManager.QueryInterface(Ci.nsIWindowMediator);
  var topWindow = windowManagerInterface.getMostRecentWindow(inType);

  if (topWindow)
    topWindow.focus();
  else if (features)
    window.open(uri, "_blank", features);
  else
    window.open(uri, "_blank", "chrome,extrachrome,menubar,resizable,scrollbars,status,toolbar");
}


/**
 * Directory provider that provides access to external chrome
 */
var ChromeProvider = {
  _manifests : [],

  getFile: function(prop, persistent) {
    return Components.results.NS_ERROR_FAILURE;
  },

  getFiles: function(prop) {
    if (prop == NS_CHROME_MANIFESTS_FILE_LIST && this._manifests.length > 0) {
      return new ArrayEnumerator(this._manifests);
    }
    return Components.results.NS_ERROR_FAILURE;
  },

  init : function() {
    var dirSvc = Cc["@mozilla.org/file/directory_service;1"].getService(Ci.nsIDirectoryService);
    dirSvc.registerProvider(this);
  },

  update : function(){
    this._manifests = [];
    var chromelist = Cc["@mozilla.org/file/directory_service;1"].getService(Ci.nsIProperties).get(NS_CHROME_MANIFESTS_FILE_LIST, Ci.nsISimpleEnumerator);
    while (chromelist.hasMoreElements()) {
      var path = chromelist.getNext().QueryInterface(Ci.nsIFile);
      this._manifests.push(path);
    }

    var self = this;
    var prefs = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefBranch2);
    var locations = prefs.getCharPref("explorer.manifest.locations").split(";");
    locations.forEach(function(location) {
      if (location) {
        var manifestFile = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsILocalFile);
        manifestFile.initWithPath(location);
        self._manifests.push(manifestFile);
      }
    }, this);
  },

  QueryInterface: function(iid) {
    if (iid.equals(Ci.nsIDirectoryServiceProvider)
     || iid.equals(Ci.nsIDirectoryServiceProvider2)
     || iid.equals(Ci.nsISupports))
      return this;

    throw Components.results.NS_ERROR_NO_INTERFACE;
  }
};


function ArrayEnumerator(array)
{
  this.array = array;
}

ArrayEnumerator.prototype = {
  pos: 0,
  array: null,

  hasMoreElements: function() {
    return this.pos < this.array.length;
  },

  getNext: function() {
    if (this.pos < this.array.length)
      return this.array[this.pos++];
    throw Components.results.NS_ERROR_FAILURE;
  },

  QueryInterface: function(iid) {
    if (iid.equals(Ci.nsISimpleEnumerator)
     || iid.equals(Ci.nsISupports))
      return this;

    throw Components.results.NS_ERROR_NO_INTERFACE;
  }
};
