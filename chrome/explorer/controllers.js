
var fileController = {
  _app : null,
  
  init : function(aApp) {
    this._app = aApp;
  },
  
  supportsCommand : function(cmd) {
    var isSupported = false;
    switch (cmd) {
      case "cmd_newBlank":
      case "cmd_newExtension":
      case "cmd_newApplication":
      case "cmd_open": 
      case "cmd_save":
      case "cmd_saveAs":
      case "cmd_close":
      case "cmd_pageSetup":
      case "cmd_print":
      case "cmd_exit":
        isSupported = true;
        break;
      default:
        isSupported = false;
        break;
    }
    return isSupported;
  },
  
  isCommandEnabled : function(cmd) {
    if (cmd == "cmd_close") {
      var tabs = document.getElementById("workspace_tabs");
      var tabElems = tabs.getElementsByTagName("tab");
      return (tabElems.length > 1);
    }
    return true;
  },
  
  doCommand : function(cmd) {
    switch (cmd) {
      case "cmd_newBlank": 
      {
        this._app.addEditor(null, null, null);
        break;
      }
      case "cmd_newExtension": 
      {
        window.openDialog("chrome://explorer/content/tools/extension-project.xul", "extproject", "centerscreen,modal");
        break;
      }
      case "cmd_newApplication": 
      {
        window.openDialog("chrome://explorer/content/tools/application-project.xul", "appproject", "centerscreen,modal");
        break;
      }
      case "cmd_open":
      {
        /* See: http://developer.mozilla.org/en/docs/XUL_Tutorial:Open_and_Save_Dialogs */
        
        var nsIFilePicker = Components.interfaces.nsIFilePicker;
        var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
      
        fp.init(window, "Open File", nsIFilePicker.modeOpen);
        fp.appendFilters(nsIFilePicker.filterText | nsIFilePicker.filterAll);
        
        var res = fp.show();
        if (res == nsIFilePicker.returnOK) {
          var source = fileToString(fp.file);
          this._app.addEditor(fp.file.leafName, fp.file.path, source);
        }
        
        break;
      }
      case "cmd_saveAs":
      case "cmd_save":
      {
        var textEditor = this._app.getTextEditor();
        var fileName = null;
        if (textEditor.document.title.length == 0 || cmd == "cmd_saveAs") {
          /* See: http://developer.mozilla.org/en/docs/XUL_Tutorial:Open_and_Save_Dialogs */
          
          var nsIFilePicker = Components.interfaces.nsIFilePicker;
          var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
        
          fp.init(window, "Save File", nsIFilePicker.modeSave);
          fp.appendFilters(nsIFilePicker.filterText | nsIFilePicker.filterAll);
          
          var res = fp.show();
          if (res == nsIFilePicker.returnOK | res == nsIFilePicker.returnReplace) {
            fileName = fp.file.path;
          }
          else {
            // user wants to cancel
            return;
          }
        }
        else {
          fileName = textEditor.document.title;
        }
        
        if (fileName) {
          var file = Components.classes["@mozilla.org/file/local;1"]
                               .createInstance(Components.interfaces.nsILocalFile);
          file.initWithPath(fileName);
          
          var source = textEditor.outputToString("text/plain", 2);
          stringToFile(source, file);
          
          this._app.renameEditor(this._app.getCurrentEditor(), file.leafName, file.path, true);
        }
        break;
      }
      case "cmd_close":
      {
        var editor = this._app.getCurrentEditor();
        if (editor) {
          this._app.removeEditor(editor);
        }
        break;
      }
      case "cmd_pageSetup":
      {
        PrintUtils.showPageSetup();
        break;
      }
      case "cmd_print":
      {
        PrintUtils.print();
        break;
      }
      case "cmd_exit":
      {
        if (this._app.shutdownQuery() == false) {
          return;
        }
        
        var aForceQuit = false;
        var appStartup = Components.classes['@mozilla.org/toolkit/app-startup;1'].getService(Components.interfaces.nsIAppStartup);
      
        // eAttemptQuit will try to close each XUL window, but the XUL window can cancel the quit
        // process if there is unsaved data. eForceQuit will quit no matter what.
        var quitSeverity = aForceQuit ? Components.interfaces.nsIAppStartup.eForceQuit : Components.interfaces.nsIAppStartup.eAttemptQuit;
        appStartup.quit(quitSeverity);

        break;
      }
    }
  }
};


var editController = {
  _app : null,
  
  init : function(aApp) {
    this._app = aApp;
  },
  
  supportsCommand : function(cmd) {
    var isSupported = false;
    switch (cmd) {
      case "cmd_pasteNoFormatting": 
        isSupported = true;
        break;
      default:
        isSupported = false;
        break;
    }
    return isSupported;
  },
  
  isCommandEnabled : function(cmd) {
    var textEditor = this._app.getTextEditor();
    if (textEditor) {
      return true;
//      return textEditor.canPaste(textEditor.eNone);
    }
    return false;
  },
  
  doCommand : function(cmd) {
    var textEditor = this._app.getTextEditor();
    if (textEditor) {
      var htmlEditor = textEditor.QueryInterface(Components.interfaces.nsIHTMLEditor);
      htmlEditor.pasteNoFormatting(textEditor.eNone);
    }
  }
};


var viewController = {
  _app : null,
  
  init : function(aApp) {
    this._app = aApp;
  },
  
  supportsCommand : function(cmd) {
    var isSupported = false;
    switch (cmd) {
      case "cmd_sidebar":
      case "cmd_messages":
      case "cmd_refresh":
      case "cmd_preview":
      case "cmd_formatter":
        isSupported = true;
        break;
      default:
        isSupported = false;
        break;
    }
    return isSupported;
  },
  
  isCommandEnabled : function(cmd) {
    return true;
  },
  
  doCommand : function(cmd) {
    switch (cmd) {
      case "cmd_sidebar": 
      {
        this._app.toggleSidebar(null, null);
        break;
      }
      case "cmd_messages": 
      {
        this._app.toggleMessages(null, null);
        break;
      }
      case "cmd_refresh": 
      {
        this.refresh();
        break;
      }
      case "cmd_preview": 
      {
        this._app.openPreview();
        break;
      }
      case "cmd_formatter":
      {
        var formatter = new XMLFormatter();
        this._app.setSource(formatter.format(this._app.getSource()));
        break;
      }
    }
  },
  
  refresh : function() {
    this._app.refreshPreview();
  }
};


var toolsController = {
  _app : null,
  
  init : function(aApp) {
    this._app = aApp;
  },
  
  supportsCommand : function(cmd) {
    var isSupported = false;
    switch (cmd) {
      case "cmd_checker": 
      case "cmd_console":
      case "cmd_testExtension": 
      case "cmd_addons": 
      case "cmd_reloadChrome": 
      case "cmd_options": 
        isSupported = true;
        break;
      default:
        isSupported = false;
        break;
    }
    return isSupported;
  },
  
  isCommandEnabled : function(cmd) {
    return true;
  },
  
  doCommand : function(cmd) {
    switch (cmd) {
      case "cmd_checker": 
      {
        var source = this._app.getSource();
        XULChecker.checkString(source, true, true);
        this._app.showOutput(XULChecker.outputLog);
        break;
      }
      case "cmd_console": 
      {
        window.open("chrome://global/content/console.xul", "_blank", "chrome,extrachrome,dependent,menubar,resizable,scrollbars,status,toolbar");
        break;
      }
      case "cmd_testExtension":
      {
        window.openDialog("chrome://explorer/content/tools/extension-test.xul", "exttest", "centerscreen,modal");
        break;
      }
      case "cmd_addons": 
      {
				const EMTYPE = "Extension:Manager";

				var aOpenMode = "extensions"; 
				var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
				                   .getService(Components.interfaces.nsIWindowMediator);
				var needToOpen = true;
				var windowType = EMTYPE + "-" + aOpenMode;
				var windows = wm.getEnumerator(windowType);
				while (windows.hasMoreElements()) {
					var theEM = windows.getNext().QueryInterface(Components.interfaces.nsIDOMWindowInternal);
					if (theEM.document.documentElement.getAttribute("windowtype") == windowType) {
						theEM.focus();
						needToOpen = false;
						break;
  				}
    		}

				if (needToOpen) {
					const EMURL = "chrome://mozapps/content/extensions/extensions.xul?type=" + aOpenMode;
					const EMFEATURES = "chrome,dialog=no,resizable=yes";
					window.openDialog(EMURL, "", EMFEATURES);
				}
				break;
			}
      case "cmd_reloadChrome": 
      {
        try {
          Components.classes["@mozilla.org/chrome/chrome-registry;1"].getService(Components.interfaces.nsIXULChromeRegistry).reloadChrome();
        }
        catch (e) { }
        break;
      }
      case "cmd_options": 
      {
        window.openDialog("chrome://explorer/content/options.xul", "options", "chrome,titlebar,toolbar,centerscreen,modal");
        break;
      }
    }
  }
};


var helpController = {
  _app : null,
  
  init : function(aApp) {
    this._app = aApp;
  },
  
  supportsCommand : function(cmd) {
    var isSupported = false;
    switch (cmd) {
      case "cmd_help": 
      case "cmd_xulref": 
      case "cmd_xultut": 
      case "cmd_jsref": 
      case "cmd_keyword": 
      case "cmd_update": 
      case "cmd_about": 
        isSupported = true;
        break;
      default:
        isSupported = false;
        break;
    }
    return isSupported;
  },
  
  isCommandEnabled : function(cmd) {
    return true;
  },
  
  doCommand : function(cmd) {
    switch (cmd) {
      case "cmd_help": 
      case "cmd_xulref": 
      case "cmd_xultut": 
      case "cmd_keyword": 
      case "cmd_jsref": 
        var helpURI = this._app.getHelpURI(cmd);
        window.openDialog("chrome://explorer/content/help/helpbrowser.xul", "_blank", "chrome,dependent,resizable,scrollbars", helpURI);
        break;
      case "cmd_update": 
        this._app.openUpdates();
        break;
      case "cmd_about": 
        window.openDialog("chrome://explorer/content/about.xul", "about", "centerscreen,modal");
        break;
    }
  }
};


var messagesController = {
  _app : null,
  
  init : function(aApp) {
    this._app = aApp;
  },
  
  supportsCommand : function(cmd) {
    var isSupported = false;
    switch (cmd) {
      case "cmd_clearMessages": 
        isSupported = true;
        break;
      default:
        isSupported = false;
        break;
    }
    return isSupported;
  },
  
  isCommandEnabled : function(cmd) {
    return true;
  },
  
  doCommand : function(cmd) {
    switch (cmd) {
      case "cmd_clearMessages": 
      {
        this._app.clearMessages();
        break;
      }
    }
  }
};


