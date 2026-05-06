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
    meson: [251, 191, 36],
    nucleus: [56, 189, 248],
    hole: [52, 211, 153],
    accent: [110, 231, 183],
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
    pair: {
      e: { x: 58, y: 200 },
      p: { x: 405, y: 170 },
      n: { x: 452, y: 215 },
      eAlpha: 1,
      pAlpha: 1,
      nAlpha: 1,
      photon: 0,
      meson: 0.3,
      vertex: 0,
      tracks: 0,
      holes: 0,
      detector: 0,
      labEx: 0,
      labKO: 0,
    },
    exchange: {
      e: { x: 310, y: 195 },
      p: { x: 405, y: 170 },
      n: { x: 452, y: 215 },
      eAlpha: 1,
      pAlpha: 1,
      nAlpha: 1,
      photon: 1,
      meson: 0.9,
      vertex: 1,
      tracks: 0.15,
      holes: 0,
      detector: 0,
      labEx: 1,
      labKO: 0,
    },
    knockout: {
      e: { x: 830, y: 65 },
      p: { x: 830, y: 125 },
      n: { x: 830, y: 305 },
      eAlpha: 1,
      pAlpha: 1,
      nAlpha: 1,
      photon: 0,
      meson: 0,
      vertex: 0,
      tracks: 0.7,
      holes: 1,
      detector: 1,
      labEx: 0,
      labKO: 1,
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
      eAlpha: lerp(a.eAlpha, b.eAlpha, t),
      pAlpha: lerp(a.pAlpha, b.pAlpha, t),
      nAlpha: lerp(a.nAlpha, b.nAlpha, t),
      photon: lerp(a.photon, b.photon, t),
      meson: lerp(a.meson, b.meson, t),
      vertex: lerp(a.vertex, b.vertex, t),
      tracks: lerp(a.tracks, b.tracks, t),
      holes: lerp(a.holes, b.holes, t),
      detector: lerp(a.detector, b.detector, t),
      labEx: lerp(a.labEx, b.labEx, t),
      labKO: lerp(a.labKO, b.labKO, t),
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

  /* ── rounded-rect helper (fallback for older browsers) ── */
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
  function MecVis(cvs, reduced) {
    this.cvs = cvs;
    this.ctx = cvs.getContext('2d');
    this.reduced = reduced;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.t = 0;
    this.nucs = scatterNucleons();
    this._ts = 0;
    this.state = lerpS(TGT.pair, TGT.pair, 0);

    var self = this;
    this._onR = function () {
      self._size();
    };
    window.addEventListener('resize', this._onR);
    this._size();
  }

  MecVis.prototype._size = function () {
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

  MecVis.prototype._sampleInteraction = function (from, to, raw) {
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
      s.meson = lerp(from.meson, to.meson, tInt);
      s.tracks = lerp(0.02, to.tracks, ease(remap(raw, 0.36, 0.92)));
      return s;
    }

    var tInt = ease(remap(raw, 0.08, 0.3));
    var tPos = ease(remap(raw, 0.08, 1.0));
    s.photon = lerp(from.photon, to.photon, tInt);
    s.vertex = lerp(from.vertex, to.vertex, tInt);
    s.meson = lerp(from.meson, to.meson, ease(remap(raw, 0.04, 0.24)));
    s.e = lerpXY(from.e, to.e, tPos);
    s.p = lerpXY(from.p, to.p, tPos);
    s.n = lerpXY(from.n, to.n, tPos);
    s.tracks = lerp(from.tracks, to.tracks, ease(remap(raw, 0.08, 0.78)));
    s.holes = lerp(from.holes, to.holes, ease(remap(raw, 0.52, 0.86)));
    s.detector = lerp(from.detector, to.detector, ease(remap(raw, 0.64, 1.0)));
    s.labEx = lerp(from.labEx, 0, ease(remap(raw, 0.0, 0.35)));
    s.labKO = lerp(0, to.labKO, ease(remap(raw, 0.44, 0.9)));
    return s;
  };

  MecVis.prototype._sampleReset = function (raw) {
    var fadeOut = ease(remap(raw, 0, 0.42));
    var fadeIn = ease(remap(raw, 0.42, 1.0));
    var s;

    if (raw < 0.42) {
      s = copyState(TGT.knockout);
      s.eAlpha = lerp(1, 0, fadeOut);
      s.pAlpha = lerp(1, 0, fadeOut);
      s.nAlpha = lerp(1, 0, fadeOut);
      s.tracks = lerp(TGT.knockout.tracks, 0, fadeOut);
      s.holes = lerp(TGT.knockout.holes, 0, fadeOut);
      s.detector = lerp(TGT.knockout.detector, 0, fadeOut);
      s.labKO = lerp(TGT.knockout.labKO, 0, fadeOut);
      return s;
    }

    s = copyState(TGT.pair);
    s.eAlpha = lerp(0.3, 1, fadeIn);
    s.pAlpha = lerp(0.6, 1, fadeIn);
    s.nAlpha = lerp(0.6, 1, fadeIn);
    s.meson = lerp(0.12, TGT.pair.meson, fadeIn);
    return s;
  };

  MecVis.prototype._sampleState = function (cycle) {
    if (cycle.isReset) {
      return this._sampleReset(cycle.windowProgress);
    }

    if (cycle.phase === 'pair') {
      return this._sampleInteraction(TGT.pair, TGT.exchange, cycle.windowProgress);
    }

    if (cycle.phase === 'exchange') {
      return copyState(TGT.exchange);
    }

    return this._sampleInteraction(TGT.exchange, TGT.knockout, cycle.windowProgress);
  };

  MecVis.prototype.renderFrame = function (cycle) {
    var ts = cycle.ts;
    var dt = Math.min(0.05, (ts - (this._ts || ts)) / 1000);
    this._ts = ts;

    if (!this.reduced) {
      this.t += dt;
    }

    this.state = this._sampleState(cycle);
    this._render();
  };

  MecVis.prototype.resetTime = function () {
    this._ts = 0;
  };

  MecVis.prototype.destroy = function () {
    window.removeEventListener('resize', this._onR);
  };

  MecVis.prototype._render = function () {
    var c = this.ctx;
    var s = this.state;
    c.save();
    c.scale(this.sc, this.sc);
    c.clearRect(0, 0, LW, LH);
    this._grid(c);
    this._tracks(c, s);
    this._nucleus(c);
    this._virtualPhoton(c, s);
    this._meson(c, s);
    this._holes(c, s);
    this._vertexFlash(c, s);
    this._detector(c, s);
    this._electronGlow(c, s);
    this._particle(c, s.e, 8.5, 'electron', 'e\u207B', s.eAlpha);
    this._particle(c, s.p, 7.5, 'proton', 'p', s.pAlpha);
    this._particle(c, s.n, 7.5, 'neutron', 'n', s.nAlpha);
    this._labels(c, s);
    c.restore();
  };

  /* ── grid ── */
  MecVis.prototype._grid = function (c) {
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
  MecVis.prototype._nucleus = function (c) {
    var x = NUC.x,
      y = NUC.y,
      r = NUC.r;
    var b = 1 + 0.018 * Math.sin(this.t * 0.7);

    // halo
    var g = c.createRadialGradient(x, y, 0, x, y, r * 1.45 * b);
    g.addColorStop(0, col('nucleus', 0.1));
    g.addColorStop(0.55, col('nucleus', 0.04));
    g.addColorStop(1, col('nucleus', 0));
    c.fillStyle = g;
    c.beginPath();
    c.arc(x, y, r * 1.45 * b, 0, TAU);
    c.fill();

    // shell
    c.strokeStyle = col('nucleus', 0.18 + 0.06 * Math.sin(this.t * 0.55));
    c.lineWidth = 1.6;
    c.beginPath();
    c.arc(x, y, r * b, 0, TAU);
    c.stroke();

    // inner decorative nucleons
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

    // label
    c.fillStyle = col('nucleus', 0.4);
    c.font = '10.5px "JetBrains Mono", monospace';
    c.textAlign = 'center';
    c.fillText('nuclear medium', x, y + r + 24);
  };

  /* ── particle tracks ── */
  MecVis.prototype._tracks = function (c, s) {
    c.save();
    c.lineWidth = 1.6;

    // electron in (solid)
    c.strokeStyle = col('electron', 0.3);
    c.setLineDash([]);
    c.beginPath();
    c.moveTo(58, 200);
    c.quadraticCurveTo(185, 198, 310, 195);
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
    c.moveTo(310, 195);
    c.bezierCurveTo(460, 155, 650, 100, 830, 65);
    c.stroke();

    // proton out
    c.strokeStyle = col('proton', 0.4);
    c.lineDashOffset = -this.t * 14;
    c.beginPath();
    c.moveTo(405, 170);
    c.bezierCurveTo(540, 150, 680, 135, 830, 125);
    c.stroke();

    // neutron out
    c.strokeStyle = col('neutron', 0.35);
    c.lineDashOffset = -this.t * 14;
    c.beginPath();
    c.moveTo(452, 215);
    c.bezierCurveTo(570, 255, 700, 285, 830, 305);
    c.stroke();

    c.restore();
  };

  /* ── virtual photon (wavy line: fixed vertex → nucleus) ── */
  MecVis.prototype._virtualPhoton = function (c, s) {
    if (s.photon < 0.01) return;
    c.save();
    c.globalAlpha = s.photon;

    var x0 = 310,
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

    // label
    var mx = (x0 + x1) / 2,
      my = (y0 + y1) / 2;
    c.fillStyle = col('photon', 0.72);
    c.font = 'italic 13px "JetBrains Mono", monospace';
    c.textAlign = 'center';
    c.fillText('\u03B3*', mx + nx * 20, my + ny * 20 - 2);

    c.restore();
  };

  /* ── meson exchange (dashed line between p and n) ── */
  MecVis.prototype._meson = function (c, s) {
    if (s.meson < 0.01) return;
    c.save();
    c.globalAlpha = s.meson;

    c.strokeStyle = col('meson', 0.6);
    c.lineWidth = 1.8;
    c.shadowColor = col('meson', 0.22);
    c.shadowBlur = 8;
    c.setLineDash([5, 4]);
    c.lineDashOffset = -this.t * 18;

    var mx = (s.p.x + s.n.x) / 2 + 12,
      my = (s.p.y + s.n.y) / 2;
    c.beginPath();
    c.moveTo(s.p.x, s.p.y);
    c.quadraticCurveTo(mx, my, s.n.x, s.n.y);
    c.stroke();
    c.shadowBlur = 0;
    c.setLineDash([]);

    if (s.meson > 0.5) {
      c.fillStyle = col('meson', 0.55 * s.meson);
      c.font = 'italic 11px "JetBrains Mono", monospace';
      c.textAlign = 'left';
      c.fillText('\u03C0', mx + 6, my - 2);
    }

    c.restore();
  };

  /* ── holes (dashed circles at original pair positions) ── */
  MecVis.prototype._holes = function (c, s) {
    if (s.holes < 0.01) return;
    c.save();
    c.globalAlpha = s.holes;
    c.strokeStyle = col('hole', 0.65);
    c.lineWidth = 1.8;
    c.setLineDash([4, 4]);
    c.lineDashOffset = -this.t * 12;
    c.beginPath();
    c.arc(405, 170, 13, 0, TAU);
    c.stroke();
    c.beginPath();
    c.arc(452, 215, 13, 0, TAU);
    c.stroke();
    c.setLineDash([]);
    c.restore();
  };

  /* ── vertex flash ── */
  MecVis.prototype._vertexFlash = function (c, s) {
    if (s.vertex < 0.01) return;
    var pulse = 0.65 + 0.35 * Math.sin(this.t * 3.2);

    // flash at interaction vertex (fixed position)
    var vx = 310, vy = 195;
    var r1 = 18 * pulse;
    var g1 = c.createRadialGradient(vx, vy, 0, vx, vy, r1);
    g1.addColorStop(0, col('photon', 0.5 * s.vertex));
    g1.addColorStop(0.5, col('photon', 0.15 * s.vertex));
    g1.addColorStop(1, col('photon', 0));
    c.fillStyle = g1;
    c.beginPath();
    c.arc(vx, vy, r1, 0, TAU);
    c.fill();

    // burst at the coupling point (between the pair)
    var cx = (405 + 452) / 2,
      cy = (170 + 215) / 2;
    var r2 = 14 * pulse;
    var g2 = c.createRadialGradient(cx, cy, 0, cx, cy, r2);
    g2.addColorStop(0, col('accent', 0.3 * s.vertex));
    g2.addColorStop(0.5, col('accent', 0.08 * s.vertex));
    g2.addColorStop(1, col('accent', 0));
    c.fillStyle = g2;
    c.beginPath();
    c.arc(cx, cy, r2, 0, TAU);
    c.fill();
  };

  /* ── detector ── */
  MecVis.prototype._detector = function (c, s) {
    var dx = 845,
      dy = 50,
      dw = 48,
      dh = 290,
      dr = 14;

    // outline (always visible)
    roundRect(c, dx, dy, dw, dh, dr);
    c.fillStyle = 'rgba(8,17,34,0.25)';
    c.fill();
    c.strokeStyle = col('accent', 0.12);
    c.lineWidth = 1.2;
    c.stroke();

    // label
    c.fillStyle = col('label', 0.35);
    c.font = '10px "JetBrains Mono", monospace';
    c.textAlign = 'center';
    c.fillText('detector', dx + dw / 2, dy - 8);

    if (s.detector < 0.01) return;
    c.save();
    c.globalAlpha = s.detector;

    var hits = [
      { y: 65, pal: 'electron' },
      { y: 125, pal: 'proton' },
      { y: 305, pal: 'neutron' },
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
  MecVis.prototype._electronGlow = function (c, s) {
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

  /* ── particle with glow ── */
  MecVis.prototype._particle = function (c, pos, r, palKey, label, alpha) {
    if (alpha < 0.01) return;
    c.save();
    c.globalAlpha = alpha;

    // glow halo
    var g = c.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, r * 3.2);
    g.addColorStop(0, col(palKey, 0.35));
    g.addColorStop(0.45, col(palKey, 0.1));
    g.addColorStop(1, col(palKey, 0));
    c.fillStyle = g;
    c.beginPath();
    c.arc(pos.x, pos.y, r * 3.2, 0, TAU);
    c.fill();

    // solid core with highlight
    var cg = c.createRadialGradient(pos.x - r * 0.3, pos.y - r * 0.3, 0, pos.x, pos.y, r * 1.1);
    cg.addColorStop(0, col(palKey, 1));
    cg.addColorStop(0.6, col(palKey, 0.85));
    cg.addColorStop(1, col(palKey, 0.55));
    c.fillStyle = cg;
    c.beginPath();
    c.arc(pos.x, pos.y, r, 0, TAU);
    c.fill();

    // label
    c.fillStyle = col(palKey, 0.85);
    c.font = '12px "JetBrains Mono", monospace';
    c.textAlign = 'left';
    c.fillText(label, pos.x + r + 5, pos.y + 4);
    c.restore();
  };

  /* ── text labels ── */
  MecVis.prototype._labels = function (c, s) {
    c.textAlign = 'center';

    if (s.labEx > 0.01) {
      c.globalAlpha = s.labEx;
      c.fillStyle = col('photon', 0.7);
      c.font = '12px "JetBrains Mono", monospace';
      c.fillText('shared two-body current', NUC.x, NUC.y - NUC.r - 28);
      c.fillStyle = col('meson', 0.6);
      c.font = '11px "JetBrains Mono", monospace';
      c.fillText('meson exchange', (405 + 452) / 2 + 30, (170 + 215) / 2 + 2);
    }

    if (s.labKO > 0.01) {
      c.globalAlpha = s.labKO;
      c.fillStyle = col('hole', 0.75);
      c.font = '12px "JetBrains Mono", monospace';
      c.fillText('2 holes left behind', NUC.x, NUC.y + NUC.r + 44);
      c.fillStyle = col('accent', 0.65);
      c.fillText('two-nucleon knockout', 660, 48);
    }

    c.globalAlpha = 1;
  };

  /* ══════════════════════════════════════════════
     Bootstrap
     ══════════════════════════════════════════════ */
  function initMecInteraction() {
    var blocks = document.querySelectorAll('[data-mec-phase]');
    if (!blocks.length) return;
    var reduced = prefersReducedMotion();

    blocks.forEach(function (block) {
      var canvas = block.querySelector('.mec-canvas');
      var btns = Array.from(block.querySelectorAll('[data-mec-phase-button]'));
      var panel = block.closest('[data-about-tab-panel]');
      var activePhase = null;
      if (!canvas) return;

      var vis = new MecVis(canvas, reduced);
      var loop = createPhaseLoop({
        durationMs: app.config.INTERACTION_CYCLE_MS,
        endHoldMs: app.config.INTERACTION_END_PAUSE_MS.mec,
        endHoldProgress: getLoopEndProgress(app.config.INTERACTION_PHASE_WINDOWS),
        phases: app.config.MEC_PHASES,
        windows: app.config.INTERACTION_PHASE_WINDOWS,
        initialProgress: getPhaseWindowStart(app.config.MEC_PHASES[0], app.config.MEC_PHASES, app.config.INTERACTION_PHASE_WINDOWS),
        onUpdate: function (cycle) {
          var highlightPhase = getWindowState(
            cycle.progress,
            app.config.MEC_PHASES,
            app.config.INTERACTION_HIGHLIGHT_WINDOWS
          ).phase;

          block.dataset.mecPhase = cycle.phase;
          vis.renderFrame(cycle);

          if (highlightPhase === activePhase) {
            return;
          }

          activePhase = highlightPhase;
          btns.forEach(function (button) {
            var isActive = button.dataset.mecPhaseButton === highlightPhase;
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
        loop.reset(getPhaseWindowStart(app.config.MEC_PHASES[0], app.config.MEC_PHASES, app.config.INTERACTION_PHASE_WINDOWS));
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
          loop.seekPhase(button.dataset.mecPhaseButton);
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

  app.features.mec = { initMecInteraction: initMecInteraction };
})(window.e4nu);
