(function (app) {
  'use strict';

  var normalizeKey = app.lib.dom.normalizeKey;
  var normalizeLoopIndex = app.lib.dom.normalizeLoopIndex;

  function requestLayoutRefresh() {
    window.requestAnimationFrame(function () {
      window.dispatchEvent(new Event('resize'));
    });
  }

  function createAboutTabLifecycleEvent(type, tabId) {
    return new CustomEvent(type, {
      bubbles: true,
      detail: { tabId: tabId },
    });
  }

  function resetCssAnimations(root) {
    var nodes = [];

    Array.prototype.forEach.call(root.querySelectorAll('*'), function (node) {
      if (window.getComputedStyle(node).animationName === 'none') {
        return;
      }

      nodes.push(node);
    });

    if (!nodes.length) {
      return;
    }

    Array.prototype.forEach.call(nodes, function (node) {
      node.style.animation = 'none';
    });

    root.getBoundingClientRect();

    Array.prototype.forEach.call(nodes, function (node) {
      node.style.animation = '';
    });
  }

  function setAboutTab(root, tabId, focusButton) {
    var buttons = root.querySelectorAll('[data-about-tab-button]');
    var panels = root.querySelectorAll('[data-about-tab-panel]');
    var previousTabId = root.getAttribute('data-about-active-tab');
    var previousPanel = null;
    var activePanel = null;

    if (previousTabId && previousTabId !== tabId) {
      previousPanel = root.querySelector('[data-about-tab-panel="' + previousTabId + '"]');
    }

    if (previousPanel) {
      previousPanel.dispatchEvent(createAboutTabLifecycleEvent('abouttabdeactivate', previousTabId));
      Array.prototype.forEach.call(
        previousPanel.querySelectorAll('[data-fsi-card], [data-mec-phase], [data-res-phase], [data-dis-phase]'),
        function (node) {
          node.dispatchEvent(createAboutTabLifecycleEvent('abouttabdeactivate', previousTabId));
        },
      );
    }

    Array.prototype.forEach.call(buttons, function (button) {
      var isActive = button.getAttribute('data-about-tab-button') === tabId;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-selected', isActive ? 'true' : 'false');
      button.tabIndex = isActive ? 0 : -1;
      if (isActive && focusButton) {
        button.focus();
      }
    });

    Array.prototype.forEach.call(panels, function (panel) {
      var isActive = panel.getAttribute('data-about-tab-panel') === tabId;
      panel.hidden = !isActive;
      if (isActive) {
        activePanel = panel;
      }
    });

    root.setAttribute('data-about-active-tab', tabId);
    if (activePanel) {
      activePanel.dispatchEvent(createAboutTabLifecycleEvent('abouttabactivate', tabId));
      Array.prototype.forEach.call(
        activePanel.querySelectorAll('[data-fsi-card], [data-mec-phase], [data-res-phase], [data-dis-phase]'),
        function (node) {
          node.dispatchEvent(createAboutTabLifecycleEvent('abouttabactivate', tabId));
        },
      );
      resetCssAnimations(activePanel);
    }
    requestLayoutRefresh();
  }

  function initAboutTabSet(root) {
    var buttons = Array.prototype.slice.call(root.querySelectorAll('[data-about-tab-button]'));
    var initial = null;
    var i;

    if (!buttons.length) {
      return;
    }

    for (i = 0; i < buttons.length; i += 1) {
      if (buttons[i].classList.contains('is-active')) {
        initial = buttons[i];
        break;
      }
    }

    initial = initial || buttons[0];

    setAboutTab(root, initial.getAttribute('data-about-tab-button'), false);

    buttons.forEach(function (button, index) {
      button.addEventListener('click', function () {
        setAboutTab(root, button.getAttribute('data-about-tab-button'), false);
      });

      button.addEventListener('keydown', function (event) {
        var key = normalizeKey(event.key);
        var nextIndex = index;

        if (key === 'ArrowRight') {
          nextIndex = normalizeLoopIndex(index + 1, buttons.length);
        } else if (key === 'ArrowLeft') {
          nextIndex = normalizeLoopIndex(index - 1, buttons.length);
        } else if (key === 'Home') {
          nextIndex = 0;
        } else if (key === 'End') {
          nextIndex = buttons.length - 1;
        } else {
          return;
        }

        event.preventDefault();
        setAboutTab(root, buttons[nextIndex].getAttribute('data-about-tab-button'), true);
      });
    });
  }

  function setFsiPhase(card, phase) {
    var buttons = card.querySelectorAll('[data-fsi-phase-button]');
    var stagePanels = card.querySelectorAll('[data-fsi-stage-panel]');
    var copyPanels = card.querySelectorAll('[data-fsi-panel]');

    Array.prototype.forEach.call(buttons, function (button) {
      var isActive = button.getAttribute('data-fsi-phase-button') === phase;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });

    Array.prototype.forEach.call(stagePanels, function (panel) {
      panel.hidden = panel.getAttribute('data-fsi-stage-panel') !== phase;
    });

    Array.prototype.forEach.call(copyPanels, function (panel) {
      panel.hidden = panel.getAttribute('data-fsi-panel') !== phase;
    });

    card.setAttribute('data-fsi-phase', phase);
  }

  function initFsiCard(card) {
    var buttons = Array.prototype.slice.call(card.querySelectorAll('[data-fsi-phase-button]'));
    var initial = null;
    if (!buttons.length) {
      return;
    }

    initial = card.getAttribute('data-fsi-phase') || buttons[0].getAttribute('data-fsi-phase-button');
    setFsiPhase(card, initial);

    buttons.forEach(function (button) {
      button.addEventListener('click', function () {
        setFsiPhase(card, button.getAttribute('data-fsi-phase-button'));
      });
    });

    card.addEventListener('abouttabactivate', function () {
      setFsiPhase(card, initial);
    });
  }

  function initAboutTabs() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-about-tabs]'), initAboutTabSet);
    Array.prototype.forEach.call(document.querySelectorAll('[data-fsi-card]'), initFsiCard);
  }

  app.features.aboutTabs = {
    initAboutTabs: initAboutTabs,
  };
})(window.e4nu);
