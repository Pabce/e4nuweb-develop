(function (app) {
  'use strict';

  function focusElement(element) {
    if (!element) {
      return;
    }

    try {
      element.focus({ preventScroll: true });
    } catch (error) {
      element.focus();
    }
  }

  function initSiteIntroReveal() {
    const intro = document.getElementById('site-intro');
    const trigger = document.getElementById('site-intro-trigger');
    const status = document.getElementById('site-intro-status');
    const body = document.body;
    const root = document.documentElement;

    if (!intro || !trigger || !body) {
      return;
    }

    if (!app.config.SITE_INTRO_ENABLED) {
      intro.setAttribute('aria-hidden', 'true');
      intro.setAttribute('hidden', '');

      if ('inert' in intro) {
        intro.inert = true;
      }

      root.classList.remove('has-intro-js');
      body.classList.remove('site-pre-reveal', 'site-revealing', 'site-revealed');
      return;
    }

    const configuredRevealDuration = app.config.SITE_INTRO_REVEAL_MS || 2600;
    const prefersReducedMotion = app.lib.dom.prefersReducedMotion();
    const revealDuration = prefersReducedMotion ? 0 : configuredRevealDuration;
    const exitDuration = app.config.SITE_INTRO_EXIT_MS || 260;
    const postRevealFocusTarget = document.querySelector('#hero a, #hero button')
      || document.querySelector('#navbar a, #navbar button');
    const sequenceCopy = {
      idle: 'Align the beams, trigger the shared vertex, and open the collaboration site.',
      beam: 'Driving the electron and nu_mu analogue beams toward the shared interaction line.',
      collision: 'Vertex flash locked. Matching the channels at the center.',
      reveal: 'Curtains opening. Bringing the collaboration site into focus.',
      complete: 'Collaboration site revealed.',
    };
    let revealTimerId = null;
    let hideTimerId = null;
    let stepTimerIds = [];
    let introCompleted = false;
    let introRevealing = false;

    root.classList.add('has-intro-js');
    body.classList.remove('site-revealed');
    body.classList.add('site-pre-reveal');
    document.documentElement.style.setProperty('--site-intro-duration', `${configuredRevealDuration}ms`);
    document.documentElement.style.setProperty('--site-intro-exit-duration', `${exitDuration}ms`);
    intro.removeAttribute('hidden');
    intro.setAttribute('aria-hidden', 'false');
    intro.dataset.sequenceStep = 'idle';
    trigger.disabled = false;
    trigger.removeAttribute('aria-disabled');

    if ('inert' in intro) {
      intro.inert = false;
    }

    if (status) {
      status.textContent = sequenceCopy.idle;
    }

    window.requestAnimationFrame(() => {
      focusElement(trigger);
    });

    function clearStepTimers() {
      stepTimerIds.forEach((timerId) => window.clearTimeout(timerId));
      stepTimerIds = [];
    }

    function setIntroStep(step) {
      intro.dataset.sequenceStep = step;

      if (status && sequenceCopy[step]) {
        status.textContent = sequenceCopy[step];
      }
    }

    function queueStep(step, delayMs) {
      const timerId = window.setTimeout(() => {
        setIntroStep(step);
      }, delayMs);

      stepTimerIds.push(timerId);
    }

    function finalizeReveal() {
      if (introCompleted) {
        return;
      }

      introCompleted = true;
      introRevealing = false;
      window.clearTimeout(revealTimerId);
      clearStepTimers();
      setIntroStep('complete');

      body.classList.remove('site-pre-reveal', 'site-revealing');
      body.classList.add('site-revealed');
      intro.setAttribute('aria-hidden', 'true');

      if ('inert' in intro) {
        intro.inert = true;
      }

      hideTimerId = window.setTimeout(() => {
        intro.setAttribute('hidden', '');
      }, exitDuration);

      window.requestAnimationFrame(() => {
        focusElement(postRevealFocusTarget);
      });
    }

    function startReveal() {
      if (introCompleted || introRevealing) {
        return;
      }

      introRevealing = true;
      body.classList.add('site-revealing');
      body.classList.remove('site-pre-reveal');
      trigger.disabled = true;
      trigger.setAttribute('aria-disabled', 'true');
      setIntroStep('beam');

      if (prefersReducedMotion) {
        setIntroStep('reveal');
        finalizeReveal();
        return;
      }

      queueStep('collision', Math.round(revealDuration * 0.34));
      queueStep('reveal', Math.round(revealDuration * 0.64));
      revealTimerId = window.setTimeout(finalizeReveal, revealDuration);
    }

    trigger.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      startReveal();
    });

    intro.addEventListener('click', (event) => {
      if (event.target.closest('#site-intro-trigger')) {
        return;
      }

      startReveal();
    });

    window.addEventListener(
      'pagehide',
      () => {
        window.clearTimeout(revealTimerId);
        window.clearTimeout(hideTimerId);
        clearStepTimers();
      },
      { once: true },
    );
  }

  function initRevealOnScroll() {
    const revealElements = document.querySelectorAll('.reveal');
    if (!revealElements.length) {
      return;
    }

    if (!('IntersectionObserver' in window)) {
      revealElements.forEach((element) => element.classList.add('visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      { threshold: 0.1 },
    );

    revealElements.forEach((element) => observer.observe(element));
  }

  app.features.reveal = {
    initSiteIntroReveal,
    initRevealOnScroll,
  };
})(window.e4nu);
