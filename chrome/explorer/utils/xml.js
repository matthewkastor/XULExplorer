// Evaluate an XPath expression aExpression against a given DOM node
// or Document object (aNode), returning the results as an array
function evaluateXPath(aNode, aExpr) {
  var xpe = new XPathEvaluator();
  var nsResolver = xpe.createNSResolver(aNode.ownerDocument == null ? aNode.documentElement : aNode.ownerDocument.documentElement);
  var result = xpe.evaluate(aExpr, aNode, nsResolver, 0, null);
  var found = [];
  var res = result.iterateNext();
  while (res) {
    found.push(res);
    res = result.iterateNext();
  }
  return found;
}