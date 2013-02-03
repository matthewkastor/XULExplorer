//-------------------------------------------------------------------
// Formats XML. Assumes XML is well formed. Preserves whitespace
// within tags and after the first text character greater than a
// space, but discards otherwise.
// This routine is not rigorous, but it should be adequate for any
// XUL. (for example, it lumps DOCTYPE in with comments.)
//
function XMLFormatter() {
  this.indent = "  "; // default to 2 spaces
}

XMLFormatter.prototype = {
  format : function(src) {
    var betweenTags = 0;
    var inTag = 1;
    var inBeginTag = 2;
    var inBeginTag2 = 3;
    var inEndTag = 4;
    var inProcInst = 5;
    var inComment = 6;
    var inComment2 = 7;
    var inText = 8;
    var inCDATA = 9;
    var inCDATA2 = 10;
    var inCDATA3 = 11;
    
    var state = betweenTags;
    var out = "";
    var indent = "";
    var deltaIndent = "  ";
    var len = src.length;
    var i = 0;
  
    while (i < len) {
      var ch = src[i];
  
      if (state == betweenTags) {
        if (ch == '<') {
          if (src[i+1] == '/') {
            indent = indent.substr(0, indent.length - this.indent.length);
            out += indent + ch;
            state = inEndTag;
          }
          else {
            out += indent + ch;
            state = inTag;
          }
        }
        else if (ch > ' ') {
          out += ch;
          state = inText;
        }
      }
      else if (state == inText) {
        out += ch;
        if (ch == '<') {
          if (src[i+1] == '/')
            indent = indent.substr(0, indent.length - this.indent.length);
            state = inTag;
        }
      }
  
      else {
        out += ch;
        if (state == inTag) {
          if (ch == '?')
            state = inProcInst;
          else if (ch == '!')
            state = inComment;
          else if (ch == '/')
            state = inEndTag;
          else
            state = inBeginTag;
        }
        else if (state == inBeginTag) {
          if (ch == '/') {
            state = inBeginTag2;
          }
          else if (ch == '>') {
            var ch2 = src[i+1];
            if (ch2 > ' ' && ch2 != '<') {
              state = inText;
            }
            else {
              out += '\n';
              state = betweenTags;
            }
            indent += this.indent;
          }
        }
        else if (state == inBeginTag2) {
          if (ch == '>') {
            out += '\n';
            state = betweenTags;
          }
          else {
            state = inBeginTag;
          }
        }
        else if (state == inEndTag) {
          if (ch == '>') {
            out += '\n';
            state = betweenTags;
          }
        }
        else if (state == inProcInst) {
          if (ch == '>') {
            out += '\n';
            state = betweenTags;
          }
        }
        else if (state == inComment) {
          if (ch == '[')
            state = inCDATA;
          else
            state = inComment2;
        }
        else if (state == inComment2) {
          if (ch == '>') {
            out += '\n';
            state = betweenTags;
          }
        }
        else if (state == inCDATA) {
          if (ch == ']')
            state = inCDATA2;
        }
        else if (state == inCDATA2) {
          if (ch == ']')
            state = inCDATA3;
          else
            state = inCDATA;
        }
        else if (state == inCDATA3) {
          if (ch == '>') {
            out += '\n';
            state = betweenTags;
          }
          else {
            state = inCDATA;
          }
        }
      }
      i++;
    }
    return out;
  }
};
