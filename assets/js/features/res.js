(function (app) {
  'use strict';

  var TAU = Math.PI * 2;
  var prefersReducedMotion = app.lib.dom.prefersReducedMotion;
  var createPhaseLoop = app.lib.phaseLoop.createPhaseLoop;
  var getLoopEndProgress = app.lib.phaseLoop.getLoopEndProgress;
  var getPhaseWindowStart = app.lib.phaseLoop.getPhaseWindowStart;
  var getWindowState = app.lib.phaseLoop.getWindowState;

  /* ── colour palette ── */
  var P = {
    electron: [125, 211, 252],
    proton: [248, 113, 113],
    neutron: [203, 213, 225],
    photon: [253, 230, 138],
    pion: [192, 132, 252],
    delta: [251, 191, 36],
    nucleus: [56, 189, 248],
    hole: [52, 211, 153],
    accent: [192, 132, 252],
    label: [203, 213, 225],
  };

  function col(name, a) {
    var c = P[name];
    return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')';
  }

  /* ── logical coordinate space ── */
  var LW = 920,
    LH = 380;
  var NUC = { x: 430, y: 190, r: 72 };

  /* ── phase target states ── */
  var TGT = {
    approach: {
      e: { x: 58, y: 200 },
      p: { x: 420, y: 195 },
      n: { x: 420, y: 195 },
      pi: { x: 420, y: 195 },
      eAlpha: 1,
      photon: 0,
      delta: 0,
      vertex: 0,
      tracks: 0,
      holes: 0,
      detector: 0,
      pAlpha: 1,
      nAlpha: 0,
      piAlpha: 0,
      labRes: 0,
      labDecay: 0,
    },
    resonance: {
      e: { x: 305, y: 195 },
      p: { x: 420, y: 195 },
      n: { x: 420, y: 195 },
      pi: { x: 420, y: 195 },
      eAlpha: 1,
      photon: 1,
      delta: 1,
      vertex: 1,
      tracks: 0.15,
      holes: 0,
      detector: 0,
      pAlpha: 0,
      nAlpha: 0,
      piAlpha: 0,
      labRes: 1,
      labDecay: 0,
    },
    decay: {
      e: { x: 830, y: 65 },
      p: { x: 420, y: 195 },
      n: { x: 830, y: 190 },
      pi: { x: 830, y: 305 },
      eAlpha: 1,
      photon: 0,
      delta: 0,
      vertex: 0,
      tracks: 0.7,
      holes: 1,
      detector: 1,
      pAlpha: 0,
      nAlpha: 1,
      piAlpha: 1,
      labRes: 0,
      labDecay: 1,
    },
  };

  /* ── math helpers ── */
  function ease(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
  function lerp(a, b, t) {
    return a + (b - a) * t;
  }
  function lerpXY(a, b, t) {
    return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) };
  }
  function lerpS(a, b, t) {
    return {
      e: lerpXY(a.e, b.e, t),
      p: lerpXY(a.p, b.p, t),
      n: lerpXY(a.n, b.n, t),
      pi: lerpXY(a.pi, b.pi, t),
      eAlpha: lerp(a.eAlpha, b.eAlpha, t),
      photon: lerp(a.photon, b.photon, t),
      delta: lerp(a.delta, b.delta, t),
      vertex: lerp(a.vertex, b.vertex, t),
      tracks: lerp(a.tracks, b.tracks, t),
      holes: lerp(a.holes, b.holes, t),
      detector: lerp(a.detector, b.detector, t),
      pAlpha: lerp(a.pAlpha, b.pAlpha, t),
      nAlpha: lerp(a.nAlpha, b.nAlpha, t),
      piAlpha: lerp(a.piAlpha, b.piAlpha, t),
      labRes: lerp(a.labRes, b.labRes, t),
      labDecay: lerp(a.labDecay, b.labDecay, t),
    };
  }

  /* ── decorative background nucleons ── */
  function scatterNucleons() {
    var out = [];
    var types = ['p', 'n', 'p', 'n', 'n', 'p', 'n', 'p'];
    for (var i = 0; i < types.length; i++) {
      var a = (i / types.length) * TAU + (Math.random() - 0.5) * 0.5;
      var d = NUC.r * (0.22 + Math.random() * 0.52);
      out.push({
        t: types[i],
        bx: NUC.x + Math.cos(a) * d,
        by: NUC.y + Math.sin(a) * d,
        ph: Math.random() * TAU,
        sp: 0.2 + Math.random() * 0.3,
        or: 2 + Math.random() * 3,
      });
    }
    return out;
  }

  /* ── rounded-rect helper ── */
  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  /* ══════════════════════════════════════════════
     Canvas renderer
     ══════════════════════════════════════════════ */
  function ResVis(cvs, reduced) {
    this.cvs = cvs;
    this.ctx = cvs.getContext('2d');
    this.reduced = reduced;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.t = 0;
    this.nucs = scatterNucleons();
    this._ts = 0;
    this.state = lerpS(TGT.approach, TGT.approach, 0);

    var self = this;
    this._onR = function () {
      self._size();
    };
    window.addEventListener('resize', this._onR);
    this._size();
  }

  ResVis.prototype._size = function () {
    var w = this.cvs.parentElement.clientWidth;
    var h = w * (LH / LW);
    this.cvs.width = w * this.dpr;
    this.cvs.height = h * this.dpr;
    this.cvs.style.width = w + 'px';
    this.cvs.style.height = h + 'px';
    this.sc = (w * this.dpr) / LW;
  };

  /* remap t from [a,b] → [0,1], clamped */
  function remap(t, a, b) {
    return t <= a ? 0 : t >= b ? 1 : (t - a) / (b - a);
  }

  function copyState(state) {
    return lerpS(state, state, 0);
  };

  ResVis.prototype._sampleInteraction = function (from, to, raw) {
    var s = lerpS(from, to, ease(raw));
    var dPhoton = to.photon - from.photon;

    if (Math.abs(dPhoton) < 0.01) {
      return s;
    }

    if (dPhoton > 0) {
      var tPos = ease(remap(raw, 0, 0.62));
      var tInt = ease(remap(raw, 0.42, 0.9));
      s.e = lerpXY(from.e, to.e, tPos);
      s.photon = lerp(from.photon, to.photon, tInt);
      s.vertex = lerp(from.vertex, to.vertex, tInt);
      s.delta = lerp(from.delta, to.delta, tInt);
      s.tracks = lerp(0.02, to.tracks, ease(remap(raw, 0.36, 0.92)));
      s.pAlpha = lerp(from.pAlpha, to.pAlpha, ease(remap(raw, 0.35, 0.88)));
      return s;
    }

    var tInt = ease(remap(raw, 0.08, 0.3));
    var tPos = ease(remap(raw, 0.08, 1.0));
    s.photon = lerp(from.photon, to.photon, tInt);
    s.vertex = lerp(from.vertex, to.vertex, tInt);
    s.delta = lerp(from.delta, to.delta, tInt);
    s.e = lerpXY(from.e, to.e, tPos);
    s.n = lerpXY(from.n, to.n, tPos);
    s.pi = lerpXY(from.pi, to.pi, tPos);
    s.tracks = lerp(from.tracks, to.tracks, ease(remap(raw, 0.08, 0.78)));
    s.holes = lerp(from.holes, to.holes, ease(remap(raw, 0.52, 0.86)));
    s.detector = lerp(from.detector, to.detector, ease(remap(raw, 0.64, 1.0)));
    s.nAlpha = lerp(from.nAlpha, to.nAlpha, tPos);
    s.piAlpha = lerp(from.piAlpha, to.piAlpha, tPos);
    s.labRes = lerp(from.labRes, 0, ease(remap(raw, 0.0, 0.35)));
    s.labDecay = lerp(0, to.labDecay, ease(remap(raw, 0.44, 0.9)));
    return s;
  };

  ResVis.prototype._sampleReset = function (raw) {
    var fadeOut = ease(remap(raw, 0, 0.42));
    var fadeIn = ease(remap(raw, 0.42, 1.0));
    var s;

    if (raw < 0.42) {
      s = copyState(TGT.decay);
      s.eAlpha = lerp(1, 0, fadeOut);
      s.nAlpha = lerp(1, 0, fadeOut);
      s.piAlpha = lerp(1, 0, fadeOut);
      s.tracks = lerp(TGT.decay.tracks, 0, fadeOut);
      s.holes = lerp(TGT.decay.holes, 0, fadeOut);
      s.detector = lerp(TGT.decay.detector, 0, fadeOut);
      s.labDecay = lerp(TGT.decay.labDecay, 0, fadeOut);
      return s;
    }

    s = copyState(TGT.approach);
    s.eAlpha = lerp(0.3, 1, fadeIn);
    s.pAlpha = lerp(0.6, 1, fadeIn);
    return s;
  };

  ResVis.prototype._sampleState = function (cycle) {
    if (cycle.isReset) {
      return this._sampleReset(cycle.windowProgress);
    }

    if (cycle.phase === 'approach') {
      return this._sampleInteraction(TGT.approach, TGT.resonance, cycle.windowProgress);
    }

    if (cycle.phase === 'resonance') {
      return copyState(TGT.resonance);
    }

    return this._sampleInteraction(TGT.resonance, TGT.decay, cycle.windowProgress);
  };

  ResVis.prototype.renderFrame = function (cycle) {
    var ts = cycle.ts;
    var dt = Math.min(0.05, (ts - (this._ts || ts)) / 1000);
    this._ts = ts;

    if (!this.reduced) {
      this.t += dt;
    }

    this.state = this._sampleState(cycle);
    this._render();
  };

  ResVis.prototype.resetTime = function () {
    this._ts = 0;
  };

  ResVis.prototype.destroy = function () {
    window.removeEventListener('resize', this._onR);
  };

  ResVis.prototype._render = function () {
    var c = this.ctx;
    var s = this.state;
    c.save();
    c.scale(this.sc, this.sc);
    c.clearRect(0, 0, LW, LH);
    this._grid(c);
    this._tracks(c, s);
    this._nucleus(c);
    this._virtualPhoton(c, s);
    this._deltaResonance(c, s);
    this._holes(c, s);
    this._vertexFlash(c, s);
    this._detector(c, s);
    this._electronGlow(c, s);
    this._particleAlpha(c, s.e, 8.5, 'electron', 'e\u207B', s.eAlpha);
    this._particleAlpha(c, s.p, 7.5, 'proton', 'p', s.pAlpha);
    this._particleAlpha(c, s.n, 7.5, 'neutron', 'n', s.nAlpha);
    this._particleAlpha(c, s.pi, 7.5, 'pion', '\u03C0\u207A', s.piAlpha);
    this._labels(c, s);
    c.restore();
  };

  /* ── grid ── */
  ResVis.prototype._grid = function (c) {
    c.strokeStyle = col('nucleus', 0.025);
    c.lineWidth = 0.5;
    var x, y;
    for (x = 0; x <= LW; x += 48) {
      c.beginPath();
      c.moveTo(x, 0);
      c.lineTo(x, LH);
      c.stroke();
    }
    for (y = 0; y <= LH; y += 48) {
      c.beginPath();
      c.moveTo(0, y);
      c.lineTo(LW, y);
      c.stroke();
    }
  };

  /* ── nucleus ── */
  ResVis.prototype._nucleus = function (c) {
    var x = NUC.x,
      y = NUC.y,
      r = NUC.r;
    var b = 1 + 0.018 * Math.sin(this.t * 0.7);

    var g = c.createRadialGradient(x, y, 0, x, y, r * 1.45 * b);
    g.addColorStop(0, col('nucleus', 0.1));
    g.addColorStop(0.55, col('nucleus', 0.04));
    g.addColorStop(1, col('nucleus', 0));
    c.fillStyle = g;
    c.beginPath();
    c.arc(x, y, r * 1.45 * b, 0, TAU);
    c.fill();

    c.strokeStyle = col('nucleus', 0.18 + 0.06 * Math.sin(this.t * 0.55));
    c.lineWidth = 1.6;
    c.beginPath();
    c.arc(x, y, r * b, 0, TAU);
    c.stroke();

    for (var i = 0; i < this.nucs.length; i++) {
      var n = this.nucs[i];
      var nx = n.bx + Math.cos(this.t * n.sp + n.ph) * n.or;
      var ny = n.by + Math.sin(this.t * n.sp * 0.7 + n.ph) * n.or;
      var dx = nx - x,
        dy = ny - y;
      if (dx * dx + dy * dy > (r - 6) * (r - 6)) continue;
      c.globalAlpha = 0.18;
      c.fillStyle = n.t === 'p' ? col('proton', 1) : col('neutron', 1);
      c.beginPath();
      c.arc(nx, ny, 3.8, 0, TAU);
      c.fill();
    }
    c.globalAlpha = 1;

    c.fillStyle = col('nucleus', 0.4);
    c.font = '10.5px "JetBrains Mono", monospace';
    c.textAlign = 'center';
    c.fillText('nuclear medium', x, y + r + 24);
  };

  /* ── particle tracks ── */
  ResVis.prototype._tracks = function (c, s) {
    c.save();
    c.lineWidth = 1.6;

    // electron in (solid)
    c.strokeStyle = col('electron', 0.3);
    c.setLineDash([]);
    c.beginPath();
    c.moveTo(58, 200);
    c.quadraticCurveTo(185, 198, 305, 195);
    c.stroke();

    if (s.tracks < 0.01) {
      c.restore();
      return;
    }

    c.globalAlpha = s.tracks;

    // electron out (dashed, animated)
    c.strokeStyle = col('electron', 0.35);
    c.setLineDash([7, 5]);
    c.lineDashOffset = -this.t * 18;
    c.beginPath();
    c.moveTo(305, 195);
    c.bezierCurveTo(460, 155, 650, 100, 830, 65);
    c.stroke();

    // neutron out
    c.strokeStyle = col('neutron', 0.35);
    c.lineDashOffset = -this.t * 14;
    c.beginPath();
    c.moveTo(420, 195);
    c.bezierCurveTo(560, 192, 700, 190, 830, 190);
    c.stroke();

    // pion out (curves downward for visual separation)
    c.strokeStyle = col('pion', 0.4);
    c.lineDashOffset = -this.t * 15;
    c.beginPath();
    c.moveTo(420, 195);
    c.bezierCurveTo(540, 235, 690, 280, 830, 305);
    c.stroke();

    c.restore();
  };

  /* ── virtual photon (wavy line: fixed vertex → nucleus) ── */
  ResVis.prototype._virtualPhoton = function (c, s) {
    if (s.photon < 0.01) return;
    c.save();
    c.globalAlpha = s.photon;

    var x0 = 305,
      y0 = 195;
    var x1 = NUC.x - 8,
      y1 = NUC.y;
    var dx = x1 - x0,
      dy = y1 - y0;
    var len = Math.sqrt(dx * dx + dy * dy);
    if (len < 1) {
      c.restore();
      return;
    }
    var nx = -dy / len,
      ny = dx / len;
    var amp = 11,
      freq = 0.055,
      spd = this.t * 4.5;

    c.strokeStyle = col('photon', 0.82);
    c.lineWidth = 2.4;
    c.shadowColor = col('photon', 0.4);
    c.shadowBlur = 14;
    c.beginPath();

    var steps = 64;
    for (var i = 0; i <= steps; i++) {
      var f = i / steps;
      var bx = x0 + dx * f;
      var by = y0 + dy * f;
      var w = Math.sin(f * len * freq + spd) * amp * Math.sin(f * Math.PI);
      var px = bx + nx * w,
        py = by + ny * w;
      if (i === 0) c.moveTo(px, py);
      else c.lineTo(px, py);
    }
    c.stroke();
    c.shadowBlur = 0;

    var mx = (x0 + x1) / 2,
      my = (y0 + y1) / 2;
    c.fillStyle = col('photon', 0.72);
    c.font = 'italic 13px "JetBrains Mono", monospace';
    c.textAlign = 'center';
    c.fillText('\u03B3*', mx + nx * 20, my + ny * 20 - 2);

    c.restore();
  };

  /* ── Delta(1232) resonance (signature element) ── */
  ResVis.prototype._deltaResonance = function (c, s) {
    if (s.delta < 0.01) return;
    c.save();
    c.globalAlpha = s.delta;

    var cx = 420,
      cy = 195;
    var wobX = Math.sin(this.t * 2.1) * 2.5;
    var wobY = Math.cos(this.t * 1.7) * 2;
    cx += wobX;
    cy += wobY;

    var pulse1 = 0.7 + 0.3 * Math.sin(this.t * 4.8);
    var pulse2 = 0.65 + 0.35 * Math.sin(this.t * 7.3);
    var pulse3 = 0.75 + 0.25 * Math.sin(this.t * 5.5);

    // outer diffuse halo
    var outerR = 36 * pulse1;
    var g1 = c.createRadialGradient(cx, cy, 0, cx, cy, outerR);
    g1.addColorStop(0, col('delta', 0.3 * s.delta));
    g1.addColorStop(0.4, col('proton', 0.12 * s.delta));
    g1.addColorStop(1, col('delta', 0));
    c.fillStyle = g1;
    c.beginPath();
    c.arc(cx, cy, outerR, 0, TAU);
    c.fill();

    // shimmering middle ring
    c.strokeStyle = col('delta', 0.45 * pulse2);
    c.lineWidth = 2.2;
    c.shadowColor = col('delta', 0.35);
    c.shadowBlur = 12;
    c.beginPath();
    c.arc(cx, cy, 22 * pulse3, 0, TAU);
    c.stroke();
    c.shadowBlur = 0;

    // dashed spinning inner ring
    c.strokeStyle = col('delta', 0.55 * pulse1);
    c.lineWidth = 1.6;
    c.setLineDash([4, 4]);
    c.lineDashOffset = -this.t * 22;
    c.beginPath();
    c.arc(cx, cy, 15 * pulse2, 0, TAU);
    c.stroke();
    c.setLineDash([]);

    // glowing gold core
    var coreR = 7.5 * pulse3;
    var g2 = c.createRadialGradient(cx - coreR * 0.3, cy - coreR * 0.3, 0, cx, cy, coreR * 1.2);
    g2.addColorStop(0, col('delta', 1));
    g2.addColorStop(0.5, col('delta', 0.85));
    g2.addColorStop(1, col('proton', 0.5));
    c.fillStyle = g2;
    c.beginPath();
    c.arc(cx, cy, coreR, 0, TAU);
    c.fill();

    // label
    c.fillStyle = col('delta', 0.85);
    c.font = '13px "JetBrains Mono", monospace';
    c.textAlign = 'center';
    c.fillText('\u0394\u207A(1232)', cx, cy - 28 * pulse1 - 8);

    c.restore();
  };

  /* ── hole (dashed circle at original proton position) ── */
  ResVis.prototype._holes = function (c, s) {
    if (s.holes < 0.01) return;
    c.save();
    c.globalAlpha = s.holes;
    c.strokeStyle = col('hole', 0.65);
    c.lineWidth = 1.8;
    c.setLineDash([4, 4]);
    c.lineDashOffset = -this.t * 12;
    c.beginPath();
    c.arc(420, 195, 13, 0, TAU);
    c.stroke();
    c.setLineDash([]);
    c.restore();
  };

  /* ── vertex flash ── */
  ResVis.prototype._vertexFlash = function (c, s) {
    if (s.vertex < 0.01) return;
    var pulse = 0.65 + 0.35 * Math.sin(this.t * 3.2);

    var vx = 305, vy = 195;
    var r1 = 18 * pulse;
    var g1 = c.createRadialGradient(vx, vy, 0, vx, vy, r1);
    g1.addColorStop(0, col('photon', 0.5 * s.vertex));
    g1.addColorStop(0.5, col('photon', 0.15 * s.vertex));
    g1.addColorStop(1, col('photon', 0));
    c.fillStyle = g1;
    c.beginPath();
    c.arc(vx, vy, r1, 0, TAU);
    c.fill();
  };

  /* ── detector ── */
  ResVis.prototype._detector = function (c, s) {
    var dx = 845,
      dy = 50,
      dw = 48,
      dh = 290,
      dr = 14;

    roundRect(c, dx, dy, dw, dh, dr);
    c.fillStyle = 'rgba(8,17,34,0.25)';
    c.fill();
    c.strokeStyle = col('accent', 0.12);
    c.lineWidth = 1.2;
    c.stroke();

    c.fillStyle = col('label', 0.35);
    c.font = '10px "JetBrains Mono", monospace';
    c.textAlign = 'center';
    c.fillText('detector', dx + dw / 2, dy - 8);

    if (s.detector < 0.01) return;
    c.save();
    c.globalAlpha = s.detector;

    var hits = [
      { y: 65, pal: 'electron' },
      { y: 190, pal: 'neutron' },
      { y: 305, pal: 'pion' },
    ];
    for (var i = 0; i < hits.length; i++) {
      var h = hits[i];
      var hr = 9 + 2 * Math.sin(this.t * 2.2 + i);
      var g = c.createRadialGradient(dx + dw / 2, h.y, 0, dx + dw / 2, h.y, hr * 2);
      g.addColorStop(0, col(h.pal, 0.7));
      g.addColorStop(0.4, col(h.pal, 0.25));
      g.addColorStop(1, col(h.pal, 0));
      c.fillStyle = g;
      c.beginPath();
      c.arc(dx + dw / 2, h.y, hr * 2, 0, TAU);
      c.fill();
      c.fillStyle = col(h.pal, 0.85);
      c.beginPath();
      c.arc(dx + dw / 2, h.y, 5.5, 0, TAU);
      c.fill();
    }
    c.restore();
  };

  /* ── electron interaction glow ── */
  ResVis.prototype._electronGlow = function (c, s) {
    if (s.vertex < 0.01) return;
    var pulse = 0.7 + 0.3 * Math.sin(this.t * 4.0);
    var r = 24 * pulse;
    var g = c.createRadialGradient(s.e.x, s.e.y, 0, s.e.x, s.e.y, r);
    g.addColorStop(0, col('electron', 0.55 * s.vertex));
    g.addColorStop(0.35, col('electron', 0.2 * s.vertex));
    g.addColorStop(1, col('electron', 0));
    c.fillStyle = g;
    c.beginPath();
    c.arc(s.e.x, s.e.y, r, 0, TAU);
    c.fill();
  };

  /* ── particle with glow (alpha-aware) ── */
  ResVis.prototype._particleAlpha = function (c, pos, r, palKey, label, alpha) {
    if (alpha < 0.01) return;
    c.save();
    c.globalAlpha = alpha;

    var g = c.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, r * 3.2);
    g.addColorStop(0, col(palKey, 0.35));
    g.addColorStop(0.45, col(palKey, 0.1));
    g.addColorStop(1, col(palKey, 0));
    c.fillStyle = g;
    c.beginPath();
    c.arc(pos.x, pos.y, r * 3.2, 0, TAU);
    c.fill();

    var cg = c.createRadialGradient(pos.x - r * 0.3, pos.y - r * 0.3, 0, pos.x, pos.y, r * 1.1);
    cg.addColorStop(0, col(palKey, 1));
    cg.addColorStop(0.6, col(palKey, 0.85));
    cg.addColorStop(1, col(palKey, 0.55));
    c.fillStyle = cg;
    c.beginPath();
    c.arc(pos.x, pos.y, r, 0, TAU);
    c.fill();

    c.fillStyle = col(palKey, 0.85);
    c.font = '12px "JetBrains Mono", monospace';
    c.textAlign = 'left';
    c.fillText(label, pos.x + r + 5, pos.y + 4);

    c.restore();
  };

  /* ── text labels ── */
  ResVis.prototype._labels = function (c, s) {
    c.textAlign = 'center';

    if (s.labRes > 0.01) {
      c.globalAlpha = s.labRes;
      c.fillStyle = col('photon', 0.7);
      c.font = '12px "JetBrains Mono", monospace';
      c.fillText('resonance excitation', NUC.x, NUC.y - NUC.r - 28);
      c.fillStyle = col('delta', 0.6);
      c.font = '11px "JetBrains Mono", monospace';
      c.fillText('p \u2192 \u0394\u207A(1232)', NUC.x + 60, NUC.y + 42);
    }

    if (s.labDecay > 0.01) {
      c.globalAlpha = s.labDecay;
      c.fillStyle = col('hole', 0.75);
      c.font = '12px "JetBrains Mono", monospace';
      c.fillText('1 hole left behind', NUC.x, NUC.y + NUC.r + 44);
      c.fillStyle = col('accent', 0.65);
      c.fillText('\u0394\u207A \u2192 n + \u03C0\u207A', 660, 48);
    }

    c.globalAlpha = 1;
  };

  /* ══════════════════════════════════════════════
     Bootstrap
     ══════════════════════════════════════════════ */
  function initResInteraction() {
    var blocks = document.querySelectorAll('[data-res-phase]');
    if (!blocks.length) return;
    var reduced = prefersReducedMotion();

    blocks.forEach(function (block) {
      var canvas = block.querySelector('.res-canvas');
      var btns = Array.from(block.querySelectorAll('[data-res-phase-button]'));
      var panel = block.closest('[data-about-tab-panel]');
      var activePhase = null;
      if (!canvas) return;

      var vis = new ResVis(canvas, reduced);
      var loop = createPhaseLoop({
        durationMs: app.config.INTERACTION_CYCLE_MS,
        endHoldMs: app.config.INTERACTION_END_PAUSE_MS.res,
        endHoldProgress: getLoopEndProgress(app.config.INTERACTION_PHASE_WINDOWS),
        phases: app.config.RES_PHASES,
        windows: app.config.INTERACTION_PHASE_WINDOWS,
        initialProgress: getPhaseWindowStart(app.config.RES_PHASES[0], app.config.RES_PHASES, app.config.INTERACTION_PHASE_WINDOWS),
        onUpdate: function (cycle) {
          var highlightPhase = getWindowState(
            cycle.progress,
            app.config.RES_PHASES,
            app.config.INTERACTION_HIGHLIGHT_WINDOWS
          ).phase;

          block.dataset.resPhase = cycle.phase;
          vis.renderFrame(cycle);

          if (highlightPhase === activePhase) {
            return;
          }

          activePhase = highlightPhase;
          btns.forEach(function (button) {
            var isActive = button.dataset.resPhaseButton === highlightPhase;
            button.classList.toggle('is-active', isActive);
            button.setAttribute('aria-pressed', String(isActive));
          });
        },
      });

      function isVisible() {
        return !panel || !panel.hidden;
      }

      function resetToStart() {
        vis.resetTime();
        loop.reset(getPhaseWindowStart(app.config.RES_PHASES[0], app.config.RES_PHASES, app.config.INTERACTION_PHASE_WINDOWS));
      }

      function resumeIfVisible() {
        if (reduced || !isVisible()) {
          return;
        }

        vis.resetTime();
        loop.resume();
      }

      btns.forEach(function (button) {
        button.addEventListener('click', function () {
          vis.resetTime();
          loop.seekPhase(button.dataset.resPhaseButton);
          resumeIfVisible();
        });
      });
      block.addEventListener('abouttabactivate', function () {
        resetToStart();
        resumeIfVisible();
      });
      block.addEventListener('abouttabdeactivate', function () {
        loop.pause();
        vis.resetTime();
      });

      resetToStart();
      if (!reduced && isVisible()) {
        loop.start();
      }
    });
  }

  app.features.res = { initResInteraction: initResInteraction };
})(window.e4nu);
