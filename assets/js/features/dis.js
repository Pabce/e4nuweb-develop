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
    photon: [253, 230, 138],
    nucleus: [56, 189, 248],
    hole: [52, 211, 153],
    label: [203, 213, 225],
    quarkR: [248, 113, 113],
    quarkG: [74, 222, 128],
    quarkB: [96, 165, 250],
    gluon: [251, 191, 36],
    string: [45, 212, 191],
    accent: [34, 211, 238],
    proton: [248, 113, 113],
    neutron: [203, 213, 225],
    remnant: [147, 197, 253],
    hPionP: [34, 211, 238],
    hPionM: [167, 139, 250],
    hPionZ: [147, 197, 253],
    hKaon: [45, 212, 191],
    hBaryon: [251, 191, 36],
  };

  function col(name, a) {
    var c = P[name];
    return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')';
  }

  /* ── logical coordinate space ── */
  var LW = 920;
  var LH = 400;
  var NUC = { x: 430, y: 200, r: 72 };
  var STRUCK_BASE = { x: 432, y: 182 };

  /* ── hadron packets derive from the string axis rather than fixed points ── */
  var PACKETS = [
    {
      kind: 'baryon',
      label: '\u039B\u2070',
      pal: 'hBaryon',
      r: 6.6,
      a0: 0.02,
      a1: 0.23,
      end: { x: 830, y: 310 },
      breakIndex: 0,
      kick: 18,
      longitudinal: -8,
      releaseGain: 0.88,
      wobble: 1.6,
      trackBend: 18,
      labelDx: -14,
      labelDy: 2,
    },
    {
      kind: 'meson',
      label: '\u03C0\u207A',
      pal: 'hPionP',
      r: 5.7,
      a0: 0.23,
      a1: 0.41,
      end: { x: 830, y: 256 },
      breakIndex: 0,
      kick: -9,
      longitudinal: -4,
      releaseGain: 0.98,
      wobble: 1.2,
      trackBend: 8,
      labelDx: -14,
      labelDy: 2,
    },
    {
      kind: 'meson',
      label: 'K\u207A',
      pal: 'hKaon',
      r: 5.5,
      a0: 0.41,
      a1: 0.60,
      end: { x: 830, y: 220 },
      breakIndex: 1,
      kick: 7,
      longitudinal: 0,
      releaseGain: 1.0,
      wobble: 1.0,
      trackBend: 4,
      labelDx: -14,
      labelDy: 2,
    },
    {
      kind: 'meson',
      label: '\u03C0\u207B',
      pal: 'hPionM',
      r: 5.2,
      a0: 0.60,
      a1: 0.79,
      end: { x: 830, y: 184 },
      breakIndex: 2,
      kick: -7,
      longitudinal: 4,
      releaseGain: 1.04,
      wobble: 1.0,
      trackBend: -4,
      labelDx: -14,
      labelDy: 2,
    },
    {
      kind: 'meson',
      label: '\u03C0\u2070',
      pal: 'hPionZ',
      r: 4.8,
      a0: 0.79,
      a1: 0.98,
      end: { x: 830, y: 146 },
      breakIndex: 3,
      kick: 11,
      longitudinal: 8,
      releaseGain: 1.08,
      wobble: 0.8,
      trackBend: -12,
      labelDx: -14,
      labelDy: 2,
    },
  ];

  /* ── phase target states ── */
  var TGT = {
    approach: {
      e: { x: 58, y: 208 },
      qStruck: { x: STRUCK_BASE.x, y: STRUCK_BASE.y },
      remnantPos: { x: 452, y: 214 },
      eAlpha: 1,
      photon: 0,
      vertex: 0,
      quarks: 1,
      remnant: 0,
      shower: 0,
      string: 0,
      hadrons: 0,
      breaks: 0,
      jetEnvelope: 0,
      tracks: 0,
      holes: 0,
      detector: 0,
      struckAlpha: 1,
      labScatter: 0,
      labHadronize: 0,
    },
    scatter: {
      e: { x: 305, y: 200 },
      qStruck: { x: 522, y: 160 },
      remnantPos: { x: 460, y: 220 },
      eAlpha: 1,
      photon: 1,
      vertex: 1,
      quarks: 1,
      remnant: 0.82,
      shower: 0.72,
      string: 0.7,
      hadrons: 0,
      breaks: 0,
      jetEnvelope: 0,
      tracks: 0.18,
      holes: 0,
      detector: 0,
      struckAlpha: 1,
      labScatter: 1,
      labHadronize: 0,
    },
    hadronize: {
      e: { x: 830, y: 72 },
      qStruck: { x: 812, y: 150 },
      remnantPos: { x: 468, y: 222 },
      eAlpha: 1,
      photon: 0,
      vertex: 0,
      quarks: 0.14,
      remnant: 1,
      shower: 0,
      string: 0.42,
      hadrons: 1,
      breaks: 1,
      jetEnvelope: 1,
      tracks: 0.72,
      holes: 1,
      detector: 1,
      struckAlpha: 0.26,
      labScatter: 0,
      labHadronize: 1,
    },
  };

  /* ── math helpers ── */
  function ease(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function lerpXY(a, b, t) {
    return {
      x: lerp(a.x, b.x, t),
      y: lerp(a.y, b.y, t),
    };
  }

  function lerpS(a, b, t) {
    return {
      e: lerpXY(a.e, b.e, t),
      qStruck: lerpXY(a.qStruck, b.qStruck, t),
      remnantPos: lerpXY(a.remnantPos, b.remnantPos, t),
      eAlpha: lerp(a.eAlpha, b.eAlpha, t),
      photon: lerp(a.photon, b.photon, t),
      vertex: lerp(a.vertex, b.vertex, t),
      quarks: lerp(a.quarks, b.quarks, t),
      remnant: lerp(a.remnant, b.remnant, t),
      shower: lerp(a.shower, b.shower, t),
      string: lerp(a.string, b.string, t),
      hadrons: lerp(a.hadrons, b.hadrons, t),
      breaks: lerp(a.breaks, b.breaks, t),
      jetEnvelope: lerp(a.jetEnvelope, b.jetEnvelope, t),
      tracks: lerp(a.tracks, b.tracks, t),
      holes: lerp(a.holes, b.holes, t),
      detector: lerp(a.detector, b.detector, t),
      struckAlpha: lerp(a.struckAlpha, b.struckAlpha, t),
      labScatter: lerp(a.labScatter, b.labScatter, t),
      labHadronize: lerp(a.labHadronize, b.labHadronize, t),
      _stretch: 0,
      _endForm: 0,
      _midForm: 0,
      _release: 0,
    };
  }

  function remap(t, a, b) {
    return t <= a ? 0 : t >= b ? 1 : (t - a) / (b - a);
  }

  function pointOnAxis(a, b, f) {
    return {
      x: lerp(a.x, b.x, f),
      y: lerp(a.y, b.y, f),
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

  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  function drawGlowDot(c, pos, r, palKey, alpha) {
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
    c.restore();
  }

  /* ══════════════════════════════════════════════
     Canvas renderer
     ══════════════════════════════════════════════ */
  function DisVis(cvs, reduced) {
    this.cvs = cvs;
    this.ctx = cvs.getContext('2d');
    this.reduced = reduced;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.t = 0;
    this.nucs = scatterNucleons();
    this._ts = 0;
    this.state = lerpS(TGT.approach, TGT.approach, 0);
    this._sqPos = { x: STRUCK_BASE.x, y: STRUCK_BASE.y };

    var self = this;
    this._onR = function () {
      self._size();
    };
    window.addEventListener('resize', this._onR);
    this._size();
  }

  DisVis.prototype._size = function () {
    var w = this.cvs.parentElement.clientWidth;
    var h = w * (LH / LW);
    this.cvs.width = w * this.dpr;
    this.cvs.height = h * this.dpr;
    this.cvs.style.width = w + 'px';
    this.cvs.style.height = h + 'px';
    this.sc = (w * this.dpr) / LW;
  };

  /* ── compute struck-quark visual position (orbit fades as it separates) ── */
  DisVis.prototype._calcSQ = function (s) {
    var dx = s.qStruck.x - STRUCK_BASE.x;
    var dy = s.qStruck.y - STRUCK_BASE.y;
    var dist = Math.sqrt(dx * dx + dy * dy);
    var orbitFade = clamp(1 - dist / 34, 0, 1);
    var qa = -Math.PI / 2 + this.t * 0.42;
    var or = 16 * orbitFade;
    this._sqPos = {
      x: s.qStruck.x + Math.cos(qa) * or,
      y: s.qStruck.y + Math.sin(qa) * or,
    };
  };

  function copyState(state) {
    return lerpS(state, state, 0);
  };

  DisVis.prototype._sampleScatter = function (raw) {
    var from = TGT.approach;
    var to = TGT.scatter;
    var s = lerpS(from, to, ease(raw));
    var tPos = ease(remap(raw, 0, 0.62));
    var tInt = ease(remap(raw, 0.42, 0.9));
    var tStr = ease(remap(raw, 0.5, 0.95));

    s.e = lerpXY(from.e, to.e, tPos);
    s.photon = lerp(from.photon, to.photon, tInt);
    s.vertex = lerp(from.vertex, to.vertex, tInt);
    s.qStruck = lerpXY(from.qStruck, to.qStruck, tStr);
    s.remnantPos = lerpXY(from.remnantPos, to.remnantPos, tStr);
    s.remnant = lerp(from.remnant, to.remnant, tStr);
    s.string = lerp(from.string, to.string, tStr);
    s.shower = lerp(from.shower, to.shower, tStr);
    s.tracks = lerp(0.02, to.tracks, ease(remap(raw, 0.36, 0.92)));
    s.labScatter = lerp(from.labScatter, to.labScatter, tInt);
    return s;
  };

  DisVis.prototype._sampleHadronize = function (raw) {
    var from = TGT.scatter;
    var to = TGT.hadronize;
    var s = lerpS(from, to, ease(raw));
    var tFade = ease(remap(raw, 0.08, 0.34));
    var tStretch = ease(remap(raw, 0.12, 0.44));
    var tEnds = ease(remap(raw, 0.34, 0.6));
    var tMid = ease(remap(raw, 0.54, 0.8));
    var tRelease = ease(remap(raw, 0.72, 1.0));
    var tQ = ease(remap(raw, 0.18, 0.68));
    var tE = ease(remap(raw, 0.5, 1.0));

    s.photon = lerp(from.photon, 0, tFade);
    s.vertex = lerp(from.vertex, 0, tFade);
    s.shower = lerp(from.shower, 0, tFade);
    s.e = lerpXY(from.e, to.e, tE);
    s.qStruck = lerpXY(from.qStruck, to.qStruck, tQ);
    s.remnantPos = lerpXY(from.remnantPos, to.remnantPos, tStretch);
    s.remnant = lerp(from.remnant, 1, tStretch);
    s.quarks = lerp(from.quarks, to.quarks, ease(remap(raw, 0.12, 0.48)));
    s.string = lerp(from.string, 1, tStretch) * (1 - 0.58 * tRelease);
    s.hadrons = lerp(from.hadrons, 1, Math.max(tEnds, tMid));
    s.breaks = lerp(from.breaks, 1, Math.max(tEnds, tMid));
    s.jetEnvelope = lerp(from.jetEnvelope, 1, ease(remap(raw, 0.62, 0.94)));
    s.tracks = lerp(from.tracks, to.tracks, ease(remap(raw, 0.62, 1.0)));
    s.detector = lerp(from.detector, to.detector, ease(remap(raw, 0.78, 1.0)));
    s.holes = lerp(from.holes, to.holes, ease(remap(raw, 0.76, 0.98)));
    s.struckAlpha = lerp(from.struckAlpha, to.struckAlpha, tRelease);
    s.labScatter = lerp(from.labScatter, 0, ease(remap(raw, 0.24, 0.6)));
    s.labHadronize = lerp(0, to.labHadronize, ease(remap(raw, 0.54, 0.92)));
    s._stretch = tStretch;
    s._endForm = tEnds;
    s._midForm = tMid;
    s._release = tRelease;
    return s;
  };

  DisVis.prototype._sampleReset = function (raw) {
    var fadeOut = ease(remap(raw, 0, 0.42));
    var fadeIn = ease(remap(raw, 0.42, 1.0));
    var s;

    if (raw < 0.42) {
      s = copyState(TGT.hadronize);
      s.eAlpha = lerp(1, 0, fadeOut);
      s.tracks = lerp(TGT.hadronize.tracks, 0, fadeOut);
      s.detector = lerp(TGT.hadronize.detector, 0, fadeOut);
      s.holes = lerp(TGT.hadronize.holes, 0, fadeOut);
      s.jetEnvelope = lerp(TGT.hadronize.jetEnvelope, 0, fadeOut);
      s.hadrons = lerp(TGT.hadronize.hadrons, 0, fadeOut);
      s.breaks = lerp(TGT.hadronize.breaks, 0, fadeOut);
      s.string = lerp(TGT.hadronize.string, 0, fadeOut);
      s.struckAlpha = lerp(TGT.hadronize.struckAlpha, 0, fadeOut);
      s.labHadronize = lerp(TGT.hadronize.labHadronize, 0, fadeOut);
      s._stretch = s.string;
      s._endForm = s.breaks;
      s._midForm = s.breaks;
      s._release = 1;
      return s;
    }

    s = copyState(TGT.approach);
    s.eAlpha = lerp(0.3, 1, fadeIn);
    return s;
  };

  DisVis.prototype._sampleState = function (cycle) {
    if (cycle.isReset) {
      return this._sampleReset(cycle.windowProgress);
    }

    if (cycle.phase === 'approach') {
      return this._sampleScatter(cycle.windowProgress);
    }

    if (cycle.phase === 'scatter') {
      return copyState(TGT.scatter);
    }

    return this._sampleHadronize(cycle.windowProgress);
  };

  DisVis.prototype.renderFrame = function (cycle) {
    var ts = cycle.ts;
    var dt = Math.min(0.05, (ts - (this._ts || ts)) / 1000);
    this._ts = ts;

    if (!this.reduced) {
      this.t += dt;
    }

    this.state = this._sampleState(cycle);
    this._render();
  };

  DisVis.prototype.resetTime = function () {
    this._ts = 0;
  };

  DisVis.prototype.destroy = function () {
    window.removeEventListener('resize', this._onR);
  };

  DisVis.prototype._axisState = function (s) {
    var a = { x: s.remnantPos.x, y: s.remnantPos.y };
    var b = { x: this._sqPos.x, y: this._sqPos.y };
    var dx = b.x - a.x;
    var dy = b.y - a.y;
    var len = Math.sqrt(dx * dx + dy * dy);

    if (len < 1) {
      len = 1;
      dx = 1;
      dy = 0;
    }

    return {
      a: a,
      b: b,
      dx: dx,
      dy: dy,
      len: len,
      ux: dx / len,
      uy: dy / len,
      nx: -dy / len,
      ny: dx / len,
    };
  };

  DisVis.prototype._breakState = function (s, axis) {
    var fracs = [PACKETS[0].a1, PACKETS[1].a1, PACKETS[2].a1, PACKETS[3].a1];
    var activations = [s._endForm, s._midForm, s._midForm, s._endForm];
    var offsets = [-5, 4, -3, 5];
    var out = [];

    for (var i = 0; i < fracs.length; i++) {
      var p = pointOnAxis(axis.a, axis.b, fracs[i]);
      var a = clamp(activations[i], 0, 1);
      out.push({
        x: p.x + axis.nx * offsets[i] * a,
        y: p.y + axis.ny * offsets[i] * a,
        alpha: a,
      });
    }

    return out;
  };

  DisVis.prototype._packetState = function (s, axis, breaks) {
    var out = [];

    for (var i = 0; i < PACKETS.length; i++) {
      var pDef = PACKETS[i];
      var trackStart = breaks[pDef.breakIndex];
      var baseAlpha = i === 0 || i === PACKETS.length - 1 ? s._endForm : s._midForm;
      var alpha = baseAlpha;
      if (i === 0 || i === PACKETS.length - 1) {
        alpha = Math.max(alpha, s.hadrons * 0.18);
      }
      var kick = pDef.kick * (0.2 + 0.8 * alpha);
      var longShift = pDef.longitudinal * alpha;
      var birth = {
        x: trackStart.x + axis.nx * kick + axis.ux * longShift,
        y: trackStart.y + axis.ny * kick + axis.uy * longShift,
      };
      var release = clamp(s._release * pDef.releaseGain, 0, 1);
      var pos = lerpXY(birth, pDef.end, release);

      pos.x += Math.cos(this.t * (1.5 + i * 0.25) + i) * pDef.wobble * release * 0.5;
      pos.y += Math.sin(this.t * (1.2 + i * 0.30) + i * 0.6) * pDef.wobble * release * 0.5;

      out.push({
        kind: pDef.kind,
        label: pDef.label,
        pal: pDef.pal,
        r: pDef.r,
        trackStart: trackStart,
        birth: birth,
        end: pDef.end,
        pos: pos,
        alpha: alpha,
        release: release,
        trackBend: pDef.trackBend,
        labelDx: pDef.labelDx,
        labelDy: pDef.labelDy,
      });
    }

    return out;
  };

  DisVis.prototype._render = function () {
    var c = this.ctx;
    var s = this.state;
    this._calcSQ(s);
    var axis = this._axisState(s);
    var breaks = this._breakState(s, axis);
    var packets = this._packetState(s, axis, breaks);

    c.save();
    c.scale(this.sc, this.sc);
    c.clearRect(0, 0, LW, LH);
    this._grid(c);
    this._jetEnvelope(c, s, axis);
    this._tracks(c, s, axis, packets);
    this._nucleus(c, s, axis);
    this._virtualPhoton(c, s);
    this._partonShower(c, s);
    this._colorString(c, s, axis);
    this._stringBreaks(c, s, axis, breaks);
    this._hadronPackets(c, s, packets);
    this._holes(c, s);
    this._vertexFlash(c, s);
    this._detector(c, s, packets);
    this._electronGlow(c, s);
    this._particleAlpha(c, s.e, 8.5, 'electron', 'e\u207B', s.eAlpha);
    this._labels(c, s, axis, breaks);
    c.restore();
  };

  /* ── grid ── */
  DisVis.prototype._grid = function (c) {
    c.strokeStyle = col('nucleus', 0.025);
    c.lineWidth = 0.5;

    for (var x = 0; x <= LW; x += 48) {
      c.beginPath();
      c.moveTo(x, 0);
      c.lineTo(x, LH);
      c.stroke();
    }

    for (var y = 0; y <= LH; y += 48) {
      c.beginPath();
      c.moveTo(0, y);
      c.lineTo(LW, y);
      c.stroke();
    }
  };

  /* ── nucleus with quark substructure ── */
  DisVis.prototype._nucleus = function (c, s, axis) {
    var x = NUC.x;
    var y = NUC.y;
    var r = NUC.r;
    var breath = 1 + 0.018 * Math.sin(this.t * 0.7);

    var halo = c.createRadialGradient(x, y, 0, x, y, r * 1.45 * breath);
    halo.addColorStop(0, col('nucleus', 0.1));
    halo.addColorStop(0.55, col('nucleus', 0.04));
    halo.addColorStop(1, col('nucleus', 0));
    c.fillStyle = halo;
    c.beginPath();
    c.arc(x, y, r * 1.45 * breath, 0, TAU);
    c.fill();

    c.strokeStyle = col('nucleus', 0.18 + 0.06 * Math.sin(this.t * 0.55));
    c.lineWidth = 1.6;
    c.beginPath();
    c.arc(x, y, r * breath, 0, TAU);
    c.stroke();

    for (var i = 0; i < this.nucs.length; i++) {
      var n = this.nucs[i];
      var nx = n.bx + Math.cos(this.t * n.sp + n.ph) * n.or;
      var ny = n.by + Math.sin(this.t * n.sp * 0.7 + n.ph) * n.or;
      var dx = nx - x;
      var dy = ny - y;

      if (dx * dx + dy * dy > (r - 6) * (r - 6)) continue;

      c.globalAlpha = 0.18;
      c.fillStyle = n.t === 'p' ? col('proton', 1) : col('neutron', 1);
      c.beginPath();
      c.arc(nx, ny, 3.8, 0, TAU);
      c.fill();
    }

    c.globalAlpha = 1;

    if (s.quarks > 0.01 || s.remnant > 0.01) {
      var qx = STRUCK_BASE.x;
      var qy = STRUCK_BASE.y;
      var qR = 18;
      var specAOrbit = {
        x: qx + Math.cos(TAU / 3 - Math.PI / 2 + this.t * 0.4) * qR,
        y: qy + Math.sin(TAU / 3 - Math.PI / 2 + this.t * 0.4) * qR,
      };
      var specBOrbit = {
        x: qx + Math.cos((2 * TAU) / 3 - Math.PI / 2 + this.t * 0.4) * qR,
        y: qy + Math.sin((2 * TAU) / 3 - Math.PI / 2 + this.t * 0.4) * qR,
      };
      var split = 4.5;
      var specATarget = {
        x: s.remnantPos.x + axis.nx * split,
        y: s.remnantPos.y + axis.ny * split,
      };
      var specBTarget = {
        x: s.remnantPos.x - axis.nx * split,
        y: s.remnantPos.y - axis.ny * split,
      };
      var qPos = [
        { x: this._sqPos.x, y: this._sqPos.y },
        lerpXY(specAOrbit, specATarget, s.remnant),
        lerpXY(specBOrbit, specBTarget, s.remnant),
      ];
      var specAlpha = s.quarks * (1 - 0.8 * s.remnant);

      c.save();
      c.strokeStyle = col('gluon', 0.33 * s.quarks * (1 - 0.25 * s.remnant));
      c.lineWidth = 1.2;

      for (var gi = 0; gi < 3; gi++) {
        var gn = (gi + 1) % 3;
        var cpx = qx + Math.cos(this.t * 0.9 + gi * 2.1) * 4;
        var cpy = qy + Math.sin(this.t * 0.7 + gi * 1.7) * 4;
        c.beginPath();
        c.moveTo(qPos[gi].x, qPos[gi].y);
        c.quadraticCurveTo(cpx, cpy, qPos[gn].x, qPos[gn].y);
        c.stroke();
      }

      drawGlowDot(c, qPos[0], 4.7, 'quarkR', s.struckAlpha);
      drawGlowDot(c, qPos[1], 4.3, 'quarkG', Math.max(0, specAlpha));
      drawGlowDot(c, qPos[2], 4.3, 'quarkB', Math.max(0, specAlpha));

      if (s.quarks > 0.2) {
        c.save();
        c.globalAlpha = s.quarks;
        c.strokeStyle = col('quarkR', 0.5);
        c.lineWidth = 1.1;
        c.beginPath();
        c.arc(qPos[0].x, qPos[0].y, 7.8 + 0.8 * Math.sin(this.t * 2.3), 0, TAU);
        c.stroke();
        c.restore();
      }

      if (s.remnant > 0.01) {
        c.save();
        c.globalAlpha = s.remnant;

        var rg = c.createRadialGradient(s.remnantPos.x, s.remnantPos.y, 0, s.remnantPos.x, s.remnantPos.y, 18);
        rg.addColorStop(0, col('remnant', 0.35));
        rg.addColorStop(1, col('remnant', 0));
        c.fillStyle = rg;
        c.beginPath();
        c.arc(s.remnantPos.x, s.remnantPos.y, 18, 0, TAU);
        c.fill();

        c.strokeStyle = col('string', 0.42);
        c.lineWidth = 1.1;
        c.beginPath();
        c.arc(s.remnantPos.x, s.remnantPos.y, 9.5 + 0.6 * Math.sin(this.t * 1.8), 0, TAU);
        c.stroke();
        c.restore();
      }

      c.restore();
    }

    c.fillStyle = col('nucleus', 0.4);
    c.font = '10.5px "JetBrains Mono", monospace';
    c.textAlign = 'center';
    c.fillText('nuclear medium', x, y + r + 24);
  };

  /* ── jet envelope aligned with the current region ── */
  DisVis.prototype._jetEnvelope = function (c, s, axis) {
    if (s.jetEnvelope < 0.01) return;

    var origin = pointOnAxis(axis.a, axis.b, 0.64);
    var lower = PACKETS[1].end;
    var upper = PACKETS[4].end;
    var mid = PACKETS[2].end;

    c.save();
    c.globalAlpha = s.jetEnvelope;

    c.strokeStyle = col('accent', 0.12);
    c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(origin.x, origin.y);
    c.bezierCurveTo(
      lerp(origin.x, upper.x, 0.32) + axis.nx * 14,
      lerp(origin.y, upper.y, 0.32) + axis.ny * 14,
      lerp(origin.x, upper.x, 0.72) + axis.nx * 8,
      lerp(origin.y, upper.y, 0.72) + axis.ny * 8,
      upper.x,
      upper.y
    );
    c.stroke();

    c.beginPath();
    c.moveTo(origin.x, origin.y);
    c.bezierCurveTo(
      lerp(origin.x, lower.x, 0.32) - axis.nx * 18,
      lerp(origin.y, lower.y, 0.32) - axis.ny * 18,
      lerp(origin.x, lower.x, 0.72) - axis.nx * 10,
      lerp(origin.y, lower.y, 0.72) - axis.ny * 10,
      lower.x,
      lower.y
    );
    c.stroke();

    c.strokeStyle = col('accent', 0.08);
    c.lineWidth = 1.1;
    c.beginPath();
    c.moveTo(origin.x, origin.y);
    c.quadraticCurveTo(
      lerp(origin.x, mid.x, 0.48) + axis.nx * 4,
      lerp(origin.y, mid.y, 0.48) + axis.ny * 4,
      mid.x,
      mid.y
    );
    c.stroke();

    for (var i = 0; i < 7; i++) {
      var f = 0.12 + i * 0.12;
      var px = lerp(origin.x, mid.x, f) + axis.nx * (6 + Math.sin(this.t * 2 + i) * 5);
      var py = lerp(origin.y, mid.y, f) + axis.ny * (6 + Math.sin(this.t * 1.6 + i * 0.7) * 5);
      c.fillStyle = col('accent', 0.12 + 0.04 * Math.sin(this.t * 3.4 + i));
      c.beginPath();
      c.arc(px, py, 1.4, 0, TAU);
      c.fill();
    }

    c.restore();
  };

  /* ── particle tracks ── */
  DisVis.prototype._tracks = function (c, s, axis, packets) {
    c.save();
    c.lineWidth = 1.6;

    c.strokeStyle = col('electron', 0.3);
    c.setLineDash([]);
    c.beginPath();
    c.moveTo(58, 208);
    c.quadraticCurveTo(185, 205, 305, 200);
    c.stroke();

    if (s.tracks < 0.01) {
      c.restore();
      return;
    }

    c.globalAlpha = s.tracks;

    c.strokeStyle = col('electron', 0.35);
    c.setLineDash([7, 5]);
    c.lineDashOffset = -this.t * 18;
    c.beginPath();
    c.moveTo(305, 200);
    c.bezierCurveTo(460, 160, 650, 104, 830, 72);
    c.stroke();

    for (var i = 0; i < packets.length; i++) {
      var packet = packets[i];
      if (packet.alpha < 0.05) continue;

      var bend = packet.trackBend;
      var ctrl = {
        x: lerp(packet.trackStart.x, packet.end.x, 0.58) + axis.nx * bend,
        y: lerp(packet.trackStart.y, packet.end.y, 0.58) + axis.ny * bend,
      };

      c.strokeStyle = col(packet.pal, 0.18 + 0.22 * packet.alpha);
      c.lineDashOffset = -this.t * (10 + i * 2);
      c.beginPath();
      c.moveTo(packet.trackStart.x, packet.trackStart.y);
      c.quadraticCurveTo(ctrl.x, ctrl.y, packet.pos.x, packet.pos.y);
      c.stroke();
    }

    c.setLineDash([]);
    c.restore();
  };

  /* ── virtual photon (wavy line: electron vertex → struck quark) ── */
  DisVis.prototype._virtualPhoton = function (c, s) {
    if (s.photon < 0.01) return;
    c.save();
    c.globalAlpha = s.photon;

    var x0 = 305;
    var y0 = 200;
    var x1 = this._sqPos.x;
    var y1 = this._sqPos.y;
    var dx = x1 - x0;
    var dy = y1 - y0;
    var len = Math.sqrt(dx * dx + dy * dy);

    if (len < 1) {
      c.restore();
      return;
    }

    var nx = -dy / len;
    var ny = dx / len;
    var amp = 11;
    var freq = 0.055;
    var spd = this.t * 4.5;

    c.strokeStyle = col('photon', 0.82);
    c.lineWidth = 2.4;
    c.shadowColor = col('photon', 0.4);
    c.shadowBlur = 14;
    c.beginPath();

    for (var i = 0; i <= 64; i++) {
      var f = i / 64;
      var bx = x0 + dx * f;
      var by = y0 + dy * f;
      var w = Math.sin(f * len * freq + spd) * amp * Math.sin(f * Math.PI);
      var px = bx + nx * w;
      var py = by + ny * w;

      if (i === 0) c.moveTo(px, py);
      else c.lineTo(px, py);
    }

    c.stroke();
    c.shadowBlur = 0;

    var mx = (x0 + x1) / 2;
    var my = (y0 + y1) / 2;
    c.fillStyle = col('photon', 0.72);
    c.font = 'italic 13px "JetBrains Mono", monospace';
    c.textAlign = 'center';
    c.fillText('\u03B3*', mx + nx * 20, my + ny * 20 - 2);
    c.restore();
  };

  /* ── parton shower (short and local, not dominant) ── */
  DisVis.prototype._partonShower = function (c, s) {
    if (s.shower < 0.01) return;
    c.save();
    c.globalAlpha = s.shower * 0.55;

    var ox = this._sqPos.x + 6;
    var oy = this._sqPos.y - 1;
    var branches = [
      { a: -0.30, l: 34, fk: 0.60, fa: 0.28 },
      { a: 0.05, l: 40, fk: 0.65, fa: -0.22 },
      { a: 0.38, l: 32, fk: 0.64, fa: 0.30 },
    ];

    c.strokeStyle = col('gluon', 0.48);
    c.lineWidth = 1.2;
    c.setLineDash([3, 3]);
    c.lineDashOffset = -this.t * 12;

    for (var i = 0; i < branches.length; i++) {
      var br = branches[i];
      var a = br.a + Math.sin(this.t * 2 + i * 1.5) * 0.07;
      var ex = ox + Math.cos(a) * br.l;
      var ey = oy + Math.sin(a) * br.l;
      var fx = ox + Math.cos(a) * br.l * br.fk;
      var fy = oy + Math.sin(a) * br.l * br.fk;
      var fa = a + br.fa;

      c.beginPath();
      c.moveTo(ox, oy);
      c.lineTo(ex, ey);
      c.stroke();

      c.beginPath();
      c.moveTo(fx, fy);
      c.lineTo(fx + Math.cos(fa) * br.l * 0.40, fy + Math.sin(fa) * br.l * 0.40);
      c.stroke();
    }

    c.setLineDash([]);
    c.restore();
  };

  /* ── color string / flux tube ── */
  DisVis.prototype._colorString = function (c, s, axis) {
    if (s.string < 0.01) return;
    c.save();
    c.globalAlpha = s.string;

    var amp = (4.5 + 1.5 * s._stretch) * (1 - 0.35 * s._release);
    c.strokeStyle = col('string', 0.78);
    c.lineWidth = 3.1;
    c.shadowColor = col('string', 0.45);
    c.shadowBlur = 16;
    c.beginPath();

    for (var i = 0; i <= 60; i++) {
      var f = i / 60;
      var base = pointOnAxis(axis.a, axis.b, f);
      var env = Math.sin(f * Math.PI);
      var wobble = Math.sin(f * 13 + this.t * 3.3) * amp * env;
      var px = base.x + axis.nx * wobble;
      var py = base.y + axis.ny * wobble;

      if (i === 0) c.moveTo(px, py);
      else c.lineTo(px, py);
    }

    c.stroke();
    c.shadowBlur = 0;

    c.strokeStyle = col('string', 0.22);
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(axis.a.x, axis.a.y);
    c.lineTo(axis.b.x, axis.b.y);
    c.stroke();
    c.restore();
  };

  /* ── string-break flashes along the actual string axis ── */
  DisVis.prototype._stringBreaks = function (c, s, axis, breaks) {
    if (s.breaks < 0.01) return;
    c.save();

    for (var i = 0; i < breaks.length; i++) {
      var br = breaks[i];
      if (br.alpha < 0.01) continue;

      var pulse = 0.55 + 0.45 * Math.sin(this.t * 4 + i * 1.7);
      var r = 4.8 + br.alpha * 2.2 + pulse * 1.2;
      var g = c.createRadialGradient(br.x, br.y, 0, br.x, br.y, r * 2.3);
      g.addColorStop(0, col('string', 0.55 * br.alpha));
      g.addColorStop(0.45, col('string', 0.16 * br.alpha));
      g.addColorStop(1, col('string', 0));
      c.fillStyle = g;
      c.beginPath();
      c.arc(br.x, br.y, r * 2.3, 0, TAU);
      c.fill();

      c.fillStyle = col('string', 0.78 * br.alpha);
      c.beginPath();
      c.arc(br.x + axis.nx * 3.5, br.y + axis.ny * 3.5, 1.4 + br.alpha, 0, TAU);
      c.fill();
      c.beginPath();
      c.arc(br.x - axis.nx * 3.5, br.y - axis.ny * 3.5, 1.4 + br.alpha, 0, TAU);
      c.fill();
    }

    c.restore();
  };

  /* ── hadronic packets emerging from the string ── */
  DisVis.prototype._hadronPackets = function (c, s, packets) {
    if (s.hadrons < 0.01) return;
    c.save();

    for (var i = 0; i < packets.length; i++) {
      var packet = packets[i];
      if (packet.alpha < 0.01) continue;

      drawGlowDot(c, packet.pos, packet.r, packet.pal, packet.alpha);

      if (packet.kind === 'baryon') {
        c.save();
        c.globalAlpha = packet.alpha;
        c.strokeStyle = col('hBaryon', 0.72);
        c.lineWidth = 1.2;
        c.beginPath();
        c.arc(packet.pos.x, packet.pos.y, packet.r + 2.6, 0, TAU);
        c.stroke();
        c.restore();
      }

      if (packet.release > 0.45) {
        c.save();
        c.globalAlpha = packet.alpha * clamp((packet.release - 0.45) / 0.35, 0, 1);
        c.fillStyle = col(packet.pal, 0.92);
        c.font = '12px "JetBrains Mono", monospace';
        c.textAlign = 'right';
        c.fillText(packet.label, packet.pos.x + packet.labelDx, packet.pos.y + packet.labelDy);
        c.restore();
      }
    }

    c.restore();
  };

  /* ── hole left in the residual nucleus ── */
  DisVis.prototype._holes = function (c, s) {
    if (s.holes < 0.01) return;
    c.save();
    c.globalAlpha = s.holes;
    c.strokeStyle = col('hole', 0.65);
    c.lineWidth = 1.8;
    c.setLineDash([4, 4]);
    c.lineDashOffset = -this.t * 12;
    c.beginPath();
    c.arc(STRUCK_BASE.x, 190, 13, 0, TAU);
    c.stroke();
    c.setLineDash([]);
    c.restore();
  };

  /* ── vertex flash (at struck-quark position) ── */
  DisVis.prototype._vertexFlash = function (c, s) {
    if (s.vertex < 0.01) return;
    var pulse = 0.65 + 0.35 * Math.sin(this.t * 3.2);
    var vx = this._sqPos.x;
    var vy = this._sqPos.y;
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
  DisVis.prototype._detector = function (c, s, packets) {
    var dx = 845;
    var dy = 56;
    var dw = 48;
    var dh = 290;
    var dr = 14;

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

    var hits = [{ y: 72, pal: 'electron', alpha: 1 }];
    for (var i = 0; i < packets.length; i++) {
      hits.push({ y: packets[i].end.y, pal: packets[i].pal, alpha: packets[i].alpha });
    }

    for (var j = 0; j < hits.length; j++) {
      var hit = hits[j];
      var hr = 9 + 2 * Math.sin(this.t * 2.2 + j);
      var g = c.createRadialGradient(dx + dw / 2, hit.y, 0, dx + dw / 2, hit.y, hr * 2);
      g.addColorStop(0, col(hit.pal, 0.7 * hit.alpha));
      g.addColorStop(0.4, col(hit.pal, 0.25 * hit.alpha));
      g.addColorStop(1, col(hit.pal, 0));
      c.fillStyle = g;
      c.beginPath();
      c.arc(dx + dw / 2, hit.y, hr * 2, 0, TAU);
      c.fill();
      c.fillStyle = col(hit.pal, 0.85 * hit.alpha);
      c.beginPath();
      c.arc(dx + dw / 2, hit.y, 5.5, 0, TAU);
      c.fill();
    }

    c.restore();
  };

  /* ── electron glow ── */
  DisVis.prototype._electronGlow = function (c, s) {
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
  DisVis.prototype._particleAlpha = function (c, pos, r, palKey, label, alpha) {
    if (alpha < 0.01) return;
    drawGlowDot(c, pos, r, palKey, alpha);

    if (!label) return;

    c.save();
    c.globalAlpha = alpha;
    c.fillStyle = col(palKey, 0.85);
    c.font = '12px "JetBrains Mono", monospace';
    c.textAlign = 'left';
    c.fillText(label, pos.x + r + 5, pos.y + 4);
    c.restore();
  };

  /* ── text labels ── */
  DisVis.prototype._labels = function (c, s, axis, breaks) {
    c.save();
    c.textAlign = 'center';

    if (s.labScatter > 0.01) {
      c.globalAlpha = s.labScatter;
      c.fillStyle = col('photon', 0.72);
      c.font = '12px "JetBrains Mono", monospace';
      c.fillText('hard scatter', NUC.x, NUC.y - NUC.r - 30);
    }

    var remLabelAlpha = Math.max(s.labScatter, s.labHadronize) * s.remnant;
    if (remLabelAlpha > 0.01) {
      c.globalAlpha = remLabelAlpha;
      c.fillStyle = col('label', 0.72);
      c.font = '11px "JetBrains Mono", monospace';
      c.textAlign = 'left';
      c.fillText('remnant diquark', s.remnantPos.x + 16, s.remnantPos.y + 28);
    }

    if (s.labHadronize > 0.01) {
      var midBreak = {
        x: (breaks[1].x + breaks[2].x) / 2,
        y: (breaks[1].y + breaks[2].y) / 2,
      };
      c.globalAlpha = s.labHadronize;
      c.fillStyle = col('string', 0.76);
      c.textAlign = 'center';
      c.fillText('string breaks', midBreak.x + axis.nx * 34, midBreak.y + axis.ny * 34);
      c.fillStyle = col('accent', 0.72);
      c.fillText('jet hadrons', 696, 56);
    }

    c.restore();
  };

  /* ══════════════════════════════════════════════
     Bootstrap
     ══════════════════════════════════════════════ */
  function initDisInteraction() {
    var blocks = document.querySelectorAll('[data-dis-phase]');
    if (!blocks.length) return;
    var reduced = prefersReducedMotion();

    blocks.forEach(function (block) {
      var canvas = block.querySelector('.dis-canvas');
      var btns = Array.from(block.querySelectorAll('[data-dis-phase-button]'));
      var panel = block.closest('[data-about-tab-panel]');
      var activePhase = null;
      if (!canvas) return;

      var vis = new DisVis(canvas, reduced);
      var loop = createPhaseLoop({
        durationMs: app.config.INTERACTION_CYCLE_MS,
        endHoldMs: app.config.INTERACTION_END_PAUSE_MS.dis,
        endHoldProgress: getLoopEndProgress(app.config.INTERACTION_PHASE_WINDOWS),
        phases: app.config.DIS_PHASES,
        windows: app.config.INTERACTION_PHASE_WINDOWS,
        initialProgress: getPhaseWindowStart(app.config.DIS_PHASES[0], app.config.DIS_PHASES, app.config.INTERACTION_PHASE_WINDOWS),
        onUpdate: function (cycle) {
          var highlightPhase = getWindowState(
            cycle.progress,
            app.config.DIS_PHASES,
            app.config.INTERACTION_HIGHLIGHT_WINDOWS
          ).phase;

          block.dataset.disPhase = cycle.phase;
          vis.renderFrame(cycle);

          if (highlightPhase === activePhase) {
            return;
          }

          activePhase = highlightPhase;
          btns.forEach(function (button) {
            var isActive = button.dataset.disPhaseButton === highlightPhase;
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
        loop.reset(getPhaseWindowStart(app.config.DIS_PHASES[0], app.config.DIS_PHASES, app.config.INTERACTION_PHASE_WINDOWS));
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
          loop.seekPhase(button.dataset.disPhaseButton);
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

  app.features.dis = { initDisInteraction: initDisInteraction };
})(window.e4nu);
