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
 *   Matt Crocker, <matt@songbirdnest.com>
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

const IO_MODE_RDONLY   = 0x01;
const IO_MODE_WRONLY   = 0x02;
const IO_MODE_CREATE   = 0x08;
const IO_MODE_APPEND   = 0x10;
const IO_MODE_TRUNCATE = 0x20;

const IO_PERMS_FILE      = 0644;
const IO_PERMS_DIRECTORY = 0755;

// Prompts the user for a file. returns the path or null
function promptFile(title) {
  var ref = Components.classes["@mozilla.org/filepicker;1"];
  var filepicker = ref.createInstance(Components.interfaces.nsIFilePicker);
  var choice;
  var path = null;

  filepicker.init(window, title, filepicker.modeOpen);
  filepicker.appendFilters(filepicker.filterApps);

  choice = filepicker.show();
  if (choice == filepicker.returnOK) {
    var nsIfile = filepicker.file.QueryInterface(Components.interfaces.nsIFile);
    path = nsIfile.path;
  }

  return path;
}

function fileFromPath(path) {
  var file = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
  file.initWithPath(path);
  return file;
}

// prompts the user for a directory. returns path or null
function promptDirectory(title) {
  var ref = Components.classes["@mozilla.org/filepicker;1"];
  var dirpicker = ref.createInstance(Components.interfaces.nsIFilePicker);
  var choice;
  var path = null;

  dirpicker.init(window, title, dirpicker.modeGetFolder);

  choice = dirpicker.show();
  if (choice == dirpicker.returnOK) {
    var nsIfile = dirpicker.file.QueryInterface(Components.interfaces.nsIFile);
    path = nsIfile.path;
  }

  return path;
}

// Make sure that the given nsIFile directory
// exists.  If it doesn't, create it.
function ensureDirectory(directory) {
  if (!directory.exists()) {
    directory.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, IO_PERMS_DIRECTORY);
  }
}

// Attempt to open the given nsIFile directory
// with Finder/Explorer/Whatever
function revealDirectory(directory) {
  var osString = Components.classes["@mozilla.org/xre/app-info;1"]
                           .getService(Components.interfaces.nsIXULRuntime)
                           .OS;

  // OS X Finder shows the folder containing the reveal
  // target.  What we really want is to show the
  // contents of the target folder.
  if (osString == "Darwin"  && directory.isDirectory()) {
    var files = directory.directoryEntries;
    if (files.hasMoreElements()) {
      directory = files.getNext().QueryInterface(Components.interfaces.nsIFile);
    }
  }

  // Reveal is not implemented on all platforms.
  try {
    directory.reveal();
  } catch (e) {
    dump("ERROR: revealDirectory() " + e.toString());
  }
}

// returns the text content of a given nsIFile
function fileToString(file) {
  // Get a nsIFileInputStream for the file
  var fis = Components.classes["@mozilla.org/network/file-input-stream;1"]
                      .createInstance(Components.interfaces.nsIFileInputStream);
  fis.init(file, -1, 0, 0);

  // Get an intl-aware nsIConverterInputStream for the file
  const replacementChar = Components.interfaces.nsIConverterInputStream.DEFAULT_REPLACEMENT_CHARACTER;
  var is = Components.classes["@mozilla.org/intl/converter-input-stream;1"]
                     .createInstance(Components.interfaces.nsIConverterInputStream);
  is.init(fis, "UTF-8", 1024, replacementChar);

  // Read the file into str
  var str = "";
  var tempStr = {};
  while (is.readString(4096, tempStr) != 0) {
    str += tempStr.value;
  }

  // Clean up
  is.close();
  fis.close();

  return str;
}

// saves the given text string to the given nsIFile
function stringToFile(str, file) {
  // Get a nsIFileOutputStream for the file
  var fos = Components.classes["@mozilla.org/network/file-output-stream;1"]
                      .createInstance(Components.interfaces.nsIFileOutputStream);
  fos.init(file, IO_MODE_WRONLY | IO_MODE_CREATE | IO_MODE_TRUNCATE, IO_PERMS_FILE, 0);

  // Get an intl-aware nsIConverterOutputStream for the file
  var os = Components.classes["@mozilla.org/intl/converter-output-stream;1"]
                     .createInstance(Components.interfaces.nsIConverterOutputStream);
  os.init(fos, "UTF-8", 0, 0x0000);

  // Write str to the file
  os.writeString(str);

  // Clean up
  os.close();
  fos.close();
}

// Append a string path to a given nsIFile directory
function appendPathToDirectory(directory, path) {
  directory = directory.clone();
  var parts = path.split("/");
  for (var i = 0; i < parts.length; ++i)
    directory.append(parts[i]);
  return directory;
}

// Extract files below the given root path within
// zipFile into the destination nsILocalFile directory
function extractZip(zipFile, root, destination) {
  root = root || "";

  try {
    var zipReader = Components.classes["@mozilla.org/libjar/zip-reader;1"]
                              .createInstance(Components.interfaces.nsIZipReader);
    zipReader.open(zipFile);

    // create directories first
    var entries = zipReader.findEntries(root + "*/");
    while (entries.hasMore()) {
      var entryName = entries.getNext();
      var target = appendPathToDirectory(destination, entryName.substr(root.length));
      if (!target.exists()) {
        target.create(Components.interfaces.nsILocalFile.DIRECTORY_TYPE, IO_PERMS_DIRECTORY);
      }
    }

    entries = zipReader.findEntries(root + "*");
    while (entries.hasMore()) {
      var entryName = entries.getNext();
      target = appendPathToDirectory(destination, entryName.substr(root.length));
      if (target.exists())
        continue;

      target.create(Components.interfaces.nsILocalFile.NORMAL_FILE_TYPE, IO_PERMS_FILE);
      zipReader.extract(entryName, target);
    }
  }
  finally {
    zipReader.close();
  }
}

// Copy the contents of chrome:// URI to an nsILocalFile directory
function copyChromeFolder(chromeURI, destination) {
  // Convert the URI into a file:// url
  var reg = Components.classes["@mozilla.org/chrome/chrome-registry;1"]
                      .getService(Components.interfaces.nsIChromeRegistry);
  var url = reg.convertChromeURL(chromeURI);

  // Chrome files may be on disk or may be inside a jar file.
  if (url instanceof Components.interfaces.nsIJARURI) {
    copyJarFolder(url, destination);
  }
  else {
    var source = url.QueryInterface(Components.interfaces.nsIFileURL).file;
    // If for some reason the source is not a folder, copy the parent.
    if (!source.exists() || !source.isDirectory()) {
      source = source.parent;
    }
    source = source.QueryInterface(Components.interfaces.nsILocalFile);
    source.copyTo(destination.parent, destination.leafName);
  }
}

// Copy the contents of a jar URI directory (jar:file://.../jar!/something/)
// to an nsILocalFile directory
function copyJarFolder(jarURI, destination) {
  jarURI = jarURI.QueryInterface(Components.interfaces.nsIJARURI);

  // Get an nsILocalFile for the containing jar
  var jarFile = jarURI.JARFile
                      .QueryInterface(Components.interfaces.nsIFileURL)
                      .file
                      .QueryInterface(Components.interfaces.nsILocalFile);

  // Get the subfolder within the jar
  var jarEntry = jarURI.JAREntry;

  // Remove the extra filename that may have been added by the chrome registry.
  // For example:
  //    chrome://global/content/   ->   content/global/global.xul
  //    chrome://global/skin/   ->   skin/global/global.css

  var lastSlash = jarEntry.lastIndexOf("/");
  if (lastSlash > 0 && jarEntry.length > lastSlash) {
    jarEntry = jarEntry.substring(0, lastSlash + 1);
  }

  extractZip(jarFile, jarEntry, destination);
}
