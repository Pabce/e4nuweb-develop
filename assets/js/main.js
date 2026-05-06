(function (app) {
  'use strict';

  app.lib.dom.onDocumentReady(() => {
    app.features.reveal.initSiteIntroReveal();
    app.features.particles.initFloatingParticles();
    app.features.reveal.initRevealOnScroll();
    app.features.navigation.initNavigation();
    app.features.publications.initPublications();
    app.features.carousel.initPhotoCarousel();
    app.features.aboutTabs.initAboutTabs();
    app.features.mec.initMecInteraction();
    app.features.res.initResInteraction();
    app.features.dis.initDisInteraction();
    app.features.chipmunk.initChipmunkEasterEgg();
  });
})(window.e4nu);
