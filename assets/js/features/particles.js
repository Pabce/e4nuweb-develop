(function (app) {
  'use strict';

  function initFloatingParticles() {
    const particleContainer = document.getElementById('particles');
    if (!particleContainer) {
      return;
    }

    for (let index = 0; index < app.config.PARTICLE_COUNT; index += 1) {
      particleContainer.appendChild(createParticle());
    }
  }

  function createParticle() {
    const particle = document.createElement('div');
    const particleSize = `${Math.random() * 3 + 1}px`;

    particle.className = 'particle';
    particle.style.left = `${Math.random() * 100}%`;
    particle.style.animationDuration = `${Math.random() * 8 + 6}s`;
    particle.style.animationDelay = `${Math.random() * 10}s`;
    particle.style.width = particleSize;
    particle.style.height = particleSize;

    return particle;
  }

  app.features.particles = {
    initFloatingParticles,
  };
})(window.e4nu);
