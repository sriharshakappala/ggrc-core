!function($) {

  "use strict"; // jshint ;_;
  
  // Insert http:// before links
  var createLink = wysihtml5.commands.createLink
    , old_exec = createLink.exec;
  createLink.exec = function(composer, command, value) {
    if (typeof(value) === "object")
      value.href = value.href.indexOf('//') > -1 ? value.href : 'http://' + value.href;
    else
      value = value.indexOf('//') > -1 ? value : 'http://' + value;
    return old_exec.call(this, composer, command, value);
  }

  // Patch iframe issues
  // Sometimes the plugin will throw a "cannot read property document of null" error
  if (window.rangy) {
    rangy.init();
    // rangy.requireModules(["DomUtil"]);
    rangy.dom.getIframeDocument = function(iframeEl, no_recurse) {
      if (typeof iframeEl.contentDocument) {
        return iframeEl.contentDocument;
      } else if (typeof iframeEl.contentWindow) {
        return iframeEl.contentWindow.document;
      } else if (!no_recurse) {
        // Add the iframe to the DOM
        rangy.dom.getBody(document).appendChild(iframeEl);
        return rangy.dom.getIframeDocument(iframeEl, true);
      } else {
        throw new Error("getIframeWindow: No Document object found for iframe element");
      }
    };

    rangy.dom.getIframeWindow = function(iframeEl, no_recurse) {
      if (typeof iframeEl.contentWindow) {
        return iframeEl.contentWindow;
      } else if (typeof iframeEl.contentDocument) {
        return iframeEl.contentDocument.defaultView;
      } else if (!no_recurse) {
        // Add the iframe to the DOM
        rangy.dom.getBody(document).appendChild(iframeEl);
        return rangy.dom.getIframeWindow(iframeEl, true);
      } else {
        throw new Error("getIframeWindow: No Window object found for iframe element");
      }
    };
  }


}(window.jQuery);
