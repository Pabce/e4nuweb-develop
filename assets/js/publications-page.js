(function (app) {
  'use strict';

  app.lib.dom.onDocumentReady(function () {
    app.features.reveal.initRevealOnScroll();
    app.features.navigation.initNavigation();
    app.features.publications.initPublications();
  });
})(window.e4nu);
