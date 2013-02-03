
var XULChecker = {
  xulSchema : null,
  xmlScanner : null,
  outputLog : [],


  init : function(aSchemaFile) {
    var req = new XMLHttpRequest();
    req.open("GET", aSchemaFile + "?timestamp=" + new Date().getTime(), false);
    req.send(null);

    this.xulSchema = eval("(" + req.responseText + ")");
  },

  checkString : function(aText, runXul, runTests) {
    const ERROR_NS = "http://www.mozilla.org/newlayout/xml/parsererror.xml";

    this.outputLog = [];

    // remove anything that could cause XML parse errors (DTD entities)
    var re = /&([\w\.]*);/g;
    var sanitizedText = aText.replace(re, "$1");

    var parser = new DOMParser();
    this.xmlScanner = parser.parseFromString(sanitizedText, "text/xml");

    var rootNode = this.xmlScanner.documentElement;
    if ((rootNode.tagName == "parsererror") || (rootNode.namespaceURI == ERROR_NS)) {
      this.log("XUL", "unable to parse xml", rootNode.textContent);
      return;
    }

    if (runXul) {
      if (this.xulSchema.start.indexOf(rootNode.nodeName) == -1) {
        this.log("XUL", "unknown start element", rootNode);
      }

      this.checkElement(rootNode);
    }

    if (runTests) {
      this.runTests();
    }
  },

  checkElement : function(testElement) {
    var schemaElement = this.findElement(testElement.nodeName);
    if (schemaElement) {
      var attributes = testElement.attributes;
      for(var i=0; i<attributes.length; i++) {
        var testAttr = attributes[i];

        // skip any namespace attributes
        if (testAttr.name == "xmlns" || testAttr.name.indexOf("xmlns:") != -1)
          continue;

        // check for a valid attribute
        var foundAttr = true;
        var foundEvent = false;
        if (schemaElement.attributes.indexOf("*") == -1 && schemaElement.attributes.indexOf(testAttr.name) == -1)  {
          var schemaBase = this.findElement("xulelement");
          if (schemaBase && schemaBase.attributes.indexOf(testAttr.name) == -1)  {
            foundAttr = false;

            // check for a valid event
            foundEvent = true;
            if (schemaElement.events.indexOf(testAttr.name) == -1)  {
              var schemaBase = this.findElement("xulelement");
              if (schemaBase && schemaBase.events.indexOf(testAttr.name) == -1)  {
                this.log("XUL", "unknown attribute", testElement.nodeName + "[" + testAttr.name + "]");
                foundEvent = false;
              }
            }
          }
        }

        if (foundAttr && !foundEvent) {
          // validate the attribute value if we can
          var schemaAttr = this.findAttribute(testAttr.name);
          if (schemaAttr && schemaAttr.choices.indexOf(testAttr.value) == -1 && schemaAttr.choices.indexOf("[id]") == -1 && schemaAttr.choices.indexOf("[uri]") == -1)  {
            this.log("XUL", "unknown attribute choice", testElement.nodeName + "[" + testAttr.name + "=" + testAttr.value + "]");
          }
        }
      }
    }
    else {
      this.log("XUL", "unknown element", testElement.nodeName);
    }

    // check for valid parent/child relation
    var testParent = testElement.parentNode;
    if (testParent) {
      var schemaParent = this.findElement(testParent.nodeName);
      if (schemaParent && schemaParent.children.indexOf("*") == -1 && schemaParent.children.indexOf(testElement.nodeName) == -1)  {
        this.log("XUL", "suspicious child element", testParent.nodeName + " > " + testElement.nodeName);
      }
    }

    // recurse through children
    for (var i=0; i<testElement.childNodes.length; i++) {
      if (testElement.childNodes[i].nodeType == 1) {
        this.checkElement(testElement.childNodes[i]);
      }
    }
  },

  runTests : function() {
    for (var iTest in this.xulSchema.tests) {
      var test = this.xulSchema.tests[iTest];
      for (var iCheck in test.checks) {
        var check = test.checks[iCheck];
        var elements = this.evaluateXPath(this.xmlScanner, check);
        for (var iElement in elements) {
          this.log(test.name, test.description, elements[iElement].nodeName);
        }
      }
    }
  },

  log : function(type, msg, ctx) {
    this.outputLog.push( { "type" : type, "message" : msg, "context" : ctx } );
  },

  findElement : function(element) {
    for (var iElement in this.xulSchema.elements) {
      if (element == this.xulSchema.elements[iElement].name) {
        return this.xulSchema.elements[iElement];
      }
    }
    return null;
  },

  findAttribute : function(attr) {
    for (var iAttr in this.xulSchema.attributes) {
      if (attr == this.xulSchema.attributes[iAttr].name) {
        return this.xulSchema.attributes[iAttr];
      }
    }
    return null;
  },

  evaluateXPath : function(aNode, aExpr) {
    var xpe = new XPathEvaluator();
    var nsResolver = {
      lookupNamespaceURI: function lookup(aPrefix) {
        if (aPrefix == "xul") {
          return "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
        }
        return "";
      }
    };
    var result = xpe.evaluate(aExpr, aNode, nsResolver, 0, null);
    var found = [];
    var res = result.iterateNext();
    while (res) {
      found.push(res);
      res = result.iterateNext();
    }
    return found;
  }
};
