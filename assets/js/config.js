(function (app) {
  'use strict';

  app.config = {
    PARTICLE_COUNT: 40,
    NAVBAR_SCROLL_THRESHOLD: 50,
    SITE_INTRO_ENABLED: false,
    SITE_INTRO_REVEAL_MS: 2600,
    SITE_INTRO_EXIT_MS: 260,
    CAROUSEL_AUTOPLAY_MS: 5500,
    CAROUSEL_DATA_URL: 'assets/data/carousel.json',
    PUBLICATIONS_DATA_URL: 'assets/data/publications.json',
    PUBLICATIONS_PREVIEW_LIMIT: 3,
    INTERACTION_CYCLE_MS: 9500,
    INTERACTION_PHASE_WINDOWS: [
      { start: 0.0, end: 0.30, phaseIndex: 0, kind: 'phase' },
      { start: 0.30, end: 0.46, phaseIndex: 1, kind: 'phase' },
      { start: 0.46, end: 0.90, phaseIndex: 2, kind: 'phase' },
      { start: 0.90, end: 1.00, phaseIndex: 0, kind: 'reset' },
    ],
    INTERACTION_HIGHLIGHT_WINDOWS: [
      { start: 0.0, end: 0.13, phaseIndex: 0, kind: 'phase' },
      { start: 0.13, end: 0.52, phaseIndex: 1, kind: 'phase' },
      { start: 0.52, end: 0.90, phaseIndex: 2, kind: 'phase' },
      { start: 0.90, end: 1.00, phaseIndex: 0, kind: 'reset' },
    ],
    INTERACTION_END_PAUSE_MS: {
      mec: 600,
      res: 600,
      dis: 1600,
    },
    MEC_PHASES: ['pair', 'exchange', 'knockout'],
    RES_PHASES: ['approach', 'resonance', 'decay'],
    DIS_PHASES: ['approach', 'scatter', 'hadronize'],
    KONAMI_SEQUENCE: [
      'ArrowUp',
      'ArrowUp',
      'ArrowDown',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
      'ArrowLeft',
      'ArrowRight',
      'b',
      'a',
    ],
  };
})(window.e4nu);
