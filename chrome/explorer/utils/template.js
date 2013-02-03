/**
 * Parse a template (supplied as a string), substituting
 * the supplied object ($_) 
 * The $_ variable refers to the object which was passed into the parse function
 * Of course, all other global variables/functions are accessible too.
 */
var Template = {
  parse : function(str, $_) {
    var singleLine = str.replace(/[\r]/g, "");
    singleLine = singleLine.replace(/[\n]/g, "/*br*/");
  
    /**
     * Split the template into parts
     */
    var parts = singleLine.split(/(\[:.*?):\]/);

    /**
     * Process each part
     */

    var result = parts.map(function(part) {
        var result = "";
        if (part.match(/\[:=/)) {
            var inner = part.replace(/^\[:=\s*/, "");
            return ["theArray.push(" + inner + ");"];
        }
        if (part.match(/^\[:/)) {
            var inner = part.replace(/^\[:/, "");
            return [inner];
        }
        else {
            part = part.replace(/\"/g, "\\\"");
            return ["theArray.push(\"" + part + "\");"];
        }
    });
    
    var theArray = [];
    result.push("theArray.join('');");
    var javascript = result.join("\n");
    return eval(javascript).replace("/*br*/", "\n", "g");
  }
};

