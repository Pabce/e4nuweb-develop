(function (app) {
  'use strict';

  function createIntervalController(callback, delay) {
    let timerId = null;

    function stop() {
      if (timerId) {
        clearInterval(timerId);
        timerId = null;
      }
    }

    function start() {
      stop();
      timerId = setInterval(callback, delay);
    }

    return {
      start,
      stop,
      restart() {
        start();
      },
    };
  }

  app.lib.timers = {
    createIntervalController,
  };
})(window.e4nu);
