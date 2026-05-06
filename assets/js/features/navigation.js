(function (app) {
  'use strict';

  function initNavigation() {
    initMobileMenu();
    initNavbarScrollEffect();
  }

  function initMobileMenu() {
    const menuButton = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    if (!menuButton || !mobileMenu) {
      return;
    }

    menuButton.addEventListener('click', () => {
      mobileMenu.classList.toggle('hidden');
    });

    document.querySelectorAll('.mobile-link').forEach((link) => {
      link.addEventListener('click', () => {
        mobileMenu.classList.add('hidden');
      });
    });
  }

  function initNavbarScrollEffect() {
    const navbar = document.getElementById('navbar');
    if (!navbar) {
      return;
    }

    const updateNavbarState = () => {
      const isScrolled = window.scrollY > app.config.NAVBAR_SCROLL_THRESHOLD;
      navbar.classList.toggle('bg-navy/95', isScrolled);
      navbar.classList.toggle('shadow-lg', isScrolled);
    };

    updateNavbarState();
    window.addEventListener('scroll', updateNavbarState, { passive: true });
  }

  app.features.navigation = {
    initNavigation,
  };
})(window.e4nu);
