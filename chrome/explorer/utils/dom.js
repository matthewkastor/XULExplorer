
function $(element) {
if (typeof element == 'string')
    element = document.getElementById(element);
  return element;
};
