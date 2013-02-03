
var SnippetManager = {
  app : null,
  snippets : [],
  categories : [],

  init : function(aApp, aChromeFile, aUserFile) {
    this.app = aApp;

    var req = new XMLHttpRequest();
    req.open("GET", aChromeFile, false);
    req.send(null);

    this.snippets = eval("(" + req.responseText + ")");

    try {
      if (aUserFile && aUserFile.length > 0) {
        var userFile = "file:///" + aUserFile;
        var req = new XMLHttpRequest();
        req.open("GET", userFile, false);
        req.send(null);

        userSnippets = eval("(" + req.responseText + ")");
        for each(var snippet in userSnippets) {
          this.snippets.push(snippet);
        }
      }
    }
    catch(e) {
    }

    for each(var snippet in this.snippets) {
      if (this.categories.indexOf(snippet.category) == -1)
        this.categories.push(snippet.category);
    }

    this.categories.sort(function(a, b) {
        return (a < b) ? -1 : 1;
      }
    );
  },

  filterByCategory : function(categoryIndex) {
    var filtered = [];
    for (var i in this.snippets) {
      if (categoryIndex == -1 || this.snippets[i].category == this.categories[categoryIndex])
        filtered.push(i);
    }
    return filtered;
  }
};
