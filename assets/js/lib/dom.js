(function (app) {
  'use strict';

  function onDocumentReady(callback) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback, { once: true });
      return;
    }

    callback();
  }

  function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function normalizeLoopIndex(index, length) {
    return ((index % length) + length) % length;
  }

  function normalizeKey(key) {
    return key.length === 1 ? key.toLowerCase() : key;
  }

  app.lib.dom = {
    normalizeKey,
    normalizeLoopIndex,
    onDocumentReady,
    prefersReducedMotion,
  };
})(window.e4nu);
