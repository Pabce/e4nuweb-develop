;(function (app) {
  'use strict';

  const { normalizeKey } = app.lib.dom;
  const CHIPMUNK_NOTES = [523, 659, 784, 1047, 784, 659, 523, 659, 784, 1047, 1319, 1047, 784, 1047, 1319, 1568];
  const RUNNING_CHIPMUNK_ART = ['🐿️', '🐾', '🌰', '🐿️', '🌰', '🐾', '🐿️'];
  const FALLING_CHIPMUNK_ART = ['🌰', '🐿️', '🌰', '🐾', '🌰', '🐿️', '🌰', '🌰'];
  const CHIPMUNK_STYLE_TEXT = `
  @keyframes chipRun {
    0%   { transform: translateX(-120px) scaleX(1) rotate(-5deg); opacity:1; }
    49%  { transform: translateX(calc(100vw + 120px)) scaleX(1) rotate(5deg); opacity:1; }
    50%  { transform: translateX(calc(100vw + 120px)) scaleX(-1) rotate(-5deg); opacity:1; }
    99%  { transform: translateX(-120px) scaleX(-1) rotate(5deg); opacity:1; }
    100% { transform: translateX(-120px) scaleX(1) rotate(-5deg); opacity:1; }
  }
  @keyframes chipBounce {
    0%,100% { top: 10%; }
    25%     { top: 80%; }
    50%     { top: 30%; }
    75%     { top: 60%; }
  }
  @keyframes chipSpin {
    from { transform: rotate(0deg) scale(1); }
    50%  { transform: rotate(180deg) scale(1.6); }
    to   { transform: rotate(360deg) scale(1); }
  }
  @keyframes chipFall {
    0%   { top:-80px; opacity:1; }
    90%  { opacity:1; }
    100% { top:110vh; opacity:0; }
  }
  @keyframes chipPulse {
    0%,100% { transform:scale(1) rotate(0deg); }
    25%     { transform:scale(1.4) rotate(-10deg); }
    75%     { transform:scale(0.8) rotate(10deg); }
  }
  @keyframes bannerDrop {
    0%   { top:-120px; opacity:0; }
    20%  { top:20px; opacity:1; }
    70%  { top:20px; opacity:1; }
    90%  { top:-120px; opacity:0; }
    100% { top:-120px; opacity:0; }
  }
  @keyframes shake {
    0%,100%{ transform:translate(0,0) rotate(0deg); }
    10%    { transform:translate(-4px,2px) rotate(-1deg); }
    20%    { transform:translate(4px,-2px) rotate(1deg); }
    30%    { transform:translate(-3px,4px) rotate(-0.5deg); }
    40%    { transform:translate(3px,-3px) rotate(0.5deg); }
    50%    { transform:translate(-2px,3px) rotate(-1deg); }
    60%    { transform:translate(2px,-1px) rotate(1deg); }
    70%    { transform:translate(-3px,2px) rotate(-0.5deg); }
    80%    { transform:translate(3px,1px) rotate(0.5deg); }
    90%    { transform:translate(-1px,-2px) rotate(-1deg); }
  }
  #chip-banner {
    position:fixed;left:50%;transform:translateX(-50%);
    background:linear-gradient(135deg,#ff6b00,#ffcc00,#ff6b00);
    border:4px solid #fff;border-radius:16px;padding:18px 40px;
    font-family:monospace;font-size:28px;font-weight:900;
    color:#1a0000;text-align:center;
    box-shadow:0 0 60px #ff6b00,0 0 120px #ffcc00;
    animation: bannerDrop 5s ease forwards;
    z-index:100001;white-space:nowrap;
  }
  .chip-cursor-trail {
    position:fixed;pointer-events:none;z-index:100000;
    font-size:22px;animation:chipPulse 0.4s ease forwards;
    transition:none;
  }
  `;

  function initChipmunkEasterEgg() {
    let sequenceIndex = 0;
    let easterEggActive = false;

    document.addEventListener('keydown', (event) => {
      const pressedKey = normalizeKey(event.key);
      const expectedKey = app.config.KONAMI_SEQUENCE[sequenceIndex];

      if (pressedKey === expectedKey) {
        sequenceIndex += 1;

        if (sequenceIndex === app.config.KONAMI_SEQUENCE.length) {
          sequenceIndex = 0;

          if (!easterEggActive) {
            triggerChipmunkMayhem(() => {
              easterEggActive = false;
            });
            easterEggActive = true;
          }
        }

        return;
      }

      sequenceIndex = pressedKey === app.config.KONAMI_SEQUENCE[0] ? 1 : 0;
    });
  }

  function triggerChipmunkMayhem(onDone) {
    playChipmunkMelody();

    const overlay = createChipmunkOverlay();
    const styleElement = injectChipmunkStyles();
    const banner = createChipmunkBanner();
    const bigChipmunk = createBigChipmunk();

    document.body.style.animation = 'shake 0.15s linear 0s 20';

    spawnRunningChipmunks(overlay);
    spawnFallingElements(overlay);

    const cursorTrailHandler = (event) => {
      const trailNode = document.createElement('div');
      trailNode.className = 'chip-cursor-trail';
      trailNode.style.left = `${event.clientX - 12}px`;
      trailNode.style.top = `${event.clientY - 12}px`;
      trailNode.textContent = Math.random() < 0.5 ? '🐿️' : '🌰';

      document.body.appendChild(trailNode);
      setTimeout(() => {
        trailNode.remove();
      }, 400);
    };

    document.addEventListener('mousemove', cursorTrailHandler);

    // eslint-disable-next-line no-console
    console.log('%c🐿️🐿️🐿️  🐿️🐿️🐿️', 'font-size:24px;color:#ff6b00;font-weight:bold;background:#000;padding:8px;');
    // eslint-disable-next-line no-console
    console.log(
      '%c  You found the secret Chipmunk Lab deep inside e4nu.\n  The neutrinos were acorns all along. 🌰🌰🌰',
      'font-size:14px;color:#ffcc00;background:#1a0000;padding:4px;',
    );

    setTimeout(() => {
      overlay.remove();
      banner.remove();
      bigChipmunk.remove();
      styleElement.remove();
      document.body.style.animation = '';
      document.removeEventListener('mousemove', cursorTrailHandler);
      onDone();
    }, 6000);
  }

  function playChipmunkMelody() {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const startTime = audioContext.currentTime;

      CHIPMUNK_NOTES.forEach((frequency, index) => {
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();

        oscillator.connect(gain);
        gain.connect(audioContext.destination);

        oscillator.type = 'square';
        oscillator.frequency.value = frequency * 2.2;

        const noteStart = startTime + index * 0.13;
        gain.gain.setValueAtTime(0, noteStart);
        gain.gain.linearRampToValueAtTime(0.18, noteStart + 0.03);
        gain.gain.linearRampToValueAtTime(0, noteStart + 0.12);

        oscillator.start(noteStart);
        oscillator.stop(noteStart + 0.13);
      });
    } catch (error) {
      // Audio may be blocked by browser policy; this easter egg still works visually.
    }
  }

  function createChipmunkOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'chipmunk-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;pointer-events:none;overflow:hidden;';
    document.body.appendChild(overlay);
    return overlay;
  }

  function injectChipmunkStyles() {
    const styleElement = document.createElement('style');
    styleElement.textContent = CHIPMUNK_STYLE_TEXT;
    document.head.appendChild(styleElement);
    return styleElement;
  }

  function createChipmunkBanner() {
    const banner = document.createElement('div');
    banner.id = 'chip-banner';
    banner.innerHTML = '🐿️ 🐿️ 🐿️<br><span style="font-size:14px;letter-spacing:3px;">THE CHIPMUNKS HAVE INFILTRATED e4nu</span>';
    document.body.appendChild(banner);
    return banner;
  }

  function spawnRunningChipmunks(overlay) {
    for (let index = 0; index < 12; index += 1) {
      const chip = document.createElement('div');
      const topPercent = 5 + Math.random() * 85;
      const duration = 1.2 + Math.random() * 2;
      const delay = Math.random() * 3;
      const size = 24 + Math.floor(Math.random() * 48);

      chip.style.cssText = `
      position:absolute;font-size:${size}px;top:${topPercent}%;left:0;
      animation: chipRun ${duration}s linear ${delay}s infinite,
                 chipBounce ${duration * 3}s ease-in-out ${delay}s infinite;
      z-index:100000;pointer-events:none;filter:drop-shadow(0 0 8px #ffcc00);
    `;
      chip.textContent = RUNNING_CHIPMUNK_ART[index % RUNNING_CHIPMUNK_ART.length];
      overlay.appendChild(chip);
    }
  }

  function spawnFallingElements(overlay) {
    for (let index = 0; index < 30; index += 1) {
      const faller = document.createElement('div');
      const leftPercent = Math.random() * 100;
      const duration = 1.5 + Math.random() * 3;
      const delay = Math.random() * 5;
      const size = 16 + Math.floor(Math.random() * 30);

      faller.style.cssText = `
      position:absolute;font-size:${size}px;left:${leftPercent}%;top:-80px;
      animation: chipFall ${duration}s ease-in ${delay}s infinite;
      z-index:99998;pointer-events:none;
    `;
      faller.textContent = FALLING_CHIPMUNK_ART[index % FALLING_CHIPMUNK_ART.length];
      overlay.appendChild(faller);
    }
  }

  function createBigChipmunk() {
    const bigChipmunk = document.createElement('div');
    bigChipmunk.style.cssText = `
    position:fixed;top:50%;left:50%;font-size:160px;
    transform:translate(-50%,-50%);
    animation:chipSpin 1.2s linear 0s 4;
    z-index:100002;pointer-events:none;
    filter:drop-shadow(0 0 40px #ff6b00) drop-shadow(0 0 80px #ffcc00);
  `;
    bigChipmunk.textContent = '🐿️';
    document.body.appendChild(bigChipmunk);
    return bigChipmunk;
  }

  app.features.chipmunk = {
    initChipmunkEasterEgg,
  };
})(window.e4nu);
