(function (app) {
  'use strict';

  function wrapProgress(progress) {
    var wrapped = progress % 1;

    if (wrapped < 0) {
      wrapped += 1;
    }

    return wrapped;
  }

  function clampProgress(progress) {
    return Math.min(Math.max(progress, 0), 0.999999);
  }

  function normalizeProgress(progress) {
    return clampProgress(wrapProgress(progress));
  }

  function getWindowState(progress, phases, windows) {
    var normalized = normalizeProgress(progress);
    var fallback = windows[windows.length - 1];
    var windowConfig = fallback;
    var i;

    for (i = 0; i < windows.length; i += 1) {
      var candidate = windows[i];
      var isLast = i === windows.length - 1;

      if (normalized >= candidate.start && (normalized < candidate.end || (isLast && normalized <= candidate.end))) {
        windowConfig = candidate;
        break;
      }
    }

    var span = Math.max(windowConfig.end - windowConfig.start, 0.000001);
    var windowProgress = Math.min(Math.max((normalized - windowConfig.start) / span, 0), 1);
    var phaseIndex = windowConfig.phaseIndex;

    if (typeof phaseIndex !== 'number' || phaseIndex < 0 || phaseIndex >= phases.length) {
      phaseIndex = 0;
    }

    return {
      progress: normalized,
      phase: phases[phaseIndex],
      phaseIndex: phaseIndex,
      kind: windowConfig.kind || 'phase',
      isReset: windowConfig.kind === 'reset',
      windowStart: windowConfig.start,
      windowEnd: windowConfig.end,
      windowProgress: windowProgress,
    };
  }

  function getPhaseWindowStart(phase, phases, windows) {
    var i;

    for (i = 0; i < windows.length; i += 1) {
      if (phases[windows[i].phaseIndex] === phase) {
        return windows[i].start;
      }
    }

    return windows[0] ? windows[0].start : 0;
  }

  function getResetWindowStart(windows) {
    var i;

    for (i = 0; i < windows.length; i += 1) {
      if (windows[i].kind === 'reset') {
        return windows[i].start;
      }
    }

    return 1;
  }

  function getLoopEndProgress(windows) {
    return clampProgress(getResetWindowStart(windows) - 0.000001);
  }

  function createPhaseLoop(options) {
    var durationMs = options.durationMs;
    var phases = options.phases;
    var windows = options.windows;
    var onUpdate = options.onUpdate || function () {};
    var progress = typeof options.initialProgress === 'number'
      ? normalizeProgress(options.initialProgress)
      : getPhaseWindowStart(phases[0], phases, windows);
    var endHoldMs = Math.max(0, options.endHoldMs || 0);
    var endHoldProgress = typeof options.endHoldProgress === 'number'
      ? clampProgress(options.endHoldProgress)
      : null;
    var running = false;
    var rafId = null;
    var lastTs = 0;
    var delayMsRemaining = 0;
    var holdMsRemaining = 0;

    function buildState(ts, deltaMs) {
      var state = getWindowState(progress, phases, windows);

      state.ts = typeof ts === 'number' ? ts : window.performance.now();
      state.deltaMs = typeof deltaMs === 'number' ? deltaMs : 0;

      return state;
    }

    function emit(ts, deltaMs) {
      var state = buildState(ts, deltaMs);
      onUpdate(state);
      return state;
    }

    function tick(ts) {
      if (!running) {
        rafId = null;
        return;
      }

      if (!lastTs) {
        lastTs = ts;
        emit(ts, 0);
        rafId = window.requestAnimationFrame(tick);
        return;
      }

      var deltaMs = ts - lastTs;
      lastTs = ts;

      if (delayMsRemaining > 0) {
        delayMsRemaining = Math.max(0, delayMsRemaining - deltaMs);
        emit(ts, 0);
        rafId = window.requestAnimationFrame(tick);
        return;
      }

      if (holdMsRemaining > 0) {
        holdMsRemaining = Math.max(0, holdMsRemaining - deltaMs);
        emit(ts, 0);
        rafId = window.requestAnimationFrame(tick);
        return;
      }

      var nextProgress = progress + deltaMs / durationMs;

      if (endHoldProgress !== null && endHoldMs > 0 && progress < endHoldProgress && nextProgress >= endHoldProgress) {
        progress = endHoldProgress;
        holdMsRemaining = endHoldMs;
        emit(ts, deltaMs);
        rafId = window.requestAnimationFrame(tick);
        return;
      }

      progress = wrapProgress(nextProgress);
      emit(ts, deltaMs);
      rafId = window.requestAnimationFrame(tick);
    }

    return {
      start: function (delayMs) {
        delayMsRemaining = Math.max(0, delayMs || 0);

        if (running) {
          lastTs = 0;
          return;
        }

        running = true;
        lastTs = 0;
        rafId = window.requestAnimationFrame(tick);
      },
      delayedStart: function (delayMs) {
        this.start(delayMs);
      },
      stop: function () {
        running = false;
        delayMsRemaining = 0;
        holdMsRemaining = 0;
        lastTs = 0;

        if (rafId !== null) {
          window.cancelAnimationFrame(rafId);
          rafId = null;
        }
      },
      pause: function () {
        this.stop();
      },
      resume: function (delayMs) {
        this.start(delayMs);
      },
      reset: function (nextProgress) {
        progress = typeof nextProgress === 'number' ? normalizeProgress(nextProgress) : getPhaseWindowStart(phases[0], phases, windows);
        delayMsRemaining = 0;
        holdMsRemaining = 0;
        lastTs = 0;
        emit();
      },
      seek: function (nextProgress) {
        this.reset(nextProgress);
      },
      seekPhase: function (phase) {
        progress = getPhaseWindowStart(phase, phases, windows);
        delayMsRemaining = 0;
        holdMsRemaining = 0;
        lastTs = 0;
        emit();
      },
      getState: function () {
        return buildState();
      },
      getActiveWindow: function (nextProgress) {
        if (typeof nextProgress === 'number') {
          return getWindowState(nextProgress, phases, windows);
        }

        return buildState();
      },
    };
  }

  app.lib.phaseLoop = {
    createPhaseLoop: createPhaseLoop,
    getLoopEndProgress: getLoopEndProgress,
    getPhaseWindowStart: getPhaseWindowStart,
    getWindowState: getWindowState,
  };
})(window.e4nu);
