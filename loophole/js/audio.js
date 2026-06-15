/* LOOPHOLE — generative soundtrack. Browser-only, no assets.
   Ethereal techno × jungle mist: a deep drone floor, washing pads, broken
   dub-kick, filtered-noise mist, a pentatonic pluck on a dubby delay. A
   lookahead scheduler drives it; layer gains crossfade with the game's state,
   so the music grows with the garden. (Architecture adapted from DJ OOR.) */
(function () {
  'use strict';
  const LP = globalThis.LP || (globalThis.LP = {});

  const mtf = m => 440 * Math.pow(2, (m - 69) / 12);
  /* modes as semitone sets over the root */
  const MODES = {
    dorian: [0, 2, 3, 5, 7, 9, 10],
    aeolian: [0, 2, 3, 5, 7, 8, 10],
  };
  const PENTA = [0, 3, 5, 7, 10]; /* minor pentatonic, for the pluck */

  /* hand-authored 16-step patterns (1 = hit). broken, dubby — not four-on-floor */
  const KICKS = [
    [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0],
    [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1],
    [1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0],
  ];
  const SHAKERS = [
    [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 1, 0],
    [0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 1],
  ];
  const RIMS = [
    [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    [0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0],
  ];
  /* pluck motifs as pentatonic degrees; -1 = rest */
  const MOTIFS = [
    [0, -1, 2, -1, -1, 1, -1, 0, -1, -1, 3, -1, 2, -1, -1, -1],
    [4, -1, -1, 3, -1, 2, -1, -1, 0, -1, -1, 2, -1, -1, 1, -1],
    [2, -1, -1, -1, 0, -1, 1, -1, -1, 3, -1, -1, 4, -1, 2, -1],
    [0, -1, 1, -1, 2, -1, -1, -1, 3, -1, 2, -1, 1, -1, 0, -1],
  ];

  class Music {
    constructor() {
      this.ctx = null; this.running = false; this.timer = null;
      this.muted = false; this.vol = 0.42;
      this.zoneL = 0.2; this.targetL = 0.2; this.coh = 0.4;
      this.beatDur = 60 / 102; this.nextBeat = 0; this.beat = 0;
      this.seed = 1;
    }

    _rng() { /* tiny deterministic stream for musical choices */
      this.seed = (this.seed * 1664525 + 1013904223) >>> 0;
      return this.seed / 4294967296;
    }

    start(seedStr) {
      if (this.running) return;
      try {
        this.ctx = LP._audioCtx || (LP._audioCtx = new (window.AudioContext || window.webkitAudioContext)());
      } catch (e) { this.ctx = null; return; }
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      this.seed = (LP.U ? LP.U.hash32(seedStr || 'loophole') : 12345) >>> 0;

      const ctx = this.ctx;
      this.master = ctx.createGain();
      this.master.gain.value = this.muted ? 0 : this.vol;
      this.master.connect(ctx.destination);

      /* a gentle bus compressor keeps the wash glued */
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -22; comp.ratio.value = 3; comp.attack.value = 0.02; comp.release.value = 0.3;
      comp.connect(this.master);
      this.bus = comp;

      /* reverb: a long, soft tail for the mist */
      const ir = ctx.createBuffer(2, ctx.sampleRate * 3.2, ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const d = ir.getChannelData(ch);
        for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2.8);
      }
      this.reverb = ctx.createConvolver(); this.reverb.buffer = ir;
      const rvGain = ctx.createGain(); rvGain.gain.value = 0.5;
      this.reverb.connect(rvGain); rvGain.connect(this.bus);
      this.rvSend = ctx.createGain(); this.rvSend.gain.value = 1; this.rvSend.connect(this.reverb);

      /* dub delay for the pluck (dotted eighth) */
      const dl = ctx.createDelay(1.0); dl.delayTime.value = this.beatDur * 0.75;
      const fb = ctx.createGain(); fb.gain.value = 0.36;
      const dlf = ctx.createBiquadFilter(); dlf.type = 'lowpass'; dlf.frequency.value = 1600;
      dl.connect(dlf); dlf.connect(fb); fb.connect(dl);
      const dlWet = ctx.createGain(); dlWet.gain.value = 0.35; dlf.connect(dlWet); dlWet.connect(this.bus);
      this.delay = dl;

      /* per-layer gains */
      this.g = {};
      for (const name of ['sub', 'pad', 'kick', 'shaker', 'rim', 'bass', 'pluck']) {
        const gn = ctx.createGain(); gn.gain.value = 0; gn.connect(this.bus);
        this.g[name] = gn;
      }
      /* pads & plucks also feed reverb; pluck feeds the delay */
      this.g.pad.connect(this.rvSend);
      this.g.pluck.connect(this.rvSend);
      this.g.pluck.connect(this.delay);
      this.g.rim.connect(this.rvSend);

      /* noise buffer for percussion */
      const nb = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
      const nd = nb.getChannelData(0);
      for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
      this.noise = nb;

      /* choose key & progression from the run seed */
      this.root = 45 + (this.seed % 5);           /* A1..C#2-ish, low */
      this.mode = (this.seed >> 3) % 2 ? MODES.dorian : MODES.aeolian;
      this.prog = [0, 5, 3, 4].map(d => d);        /* i - vi - iv - v feel (scale degrees) */

      /* the eternal drone floor */
      this._startSub();

      this.running = true;
      this.nextBeat = ctx.currentTime + 0.1;
      this.beat = 0;
      this.timer = setInterval(() => this._advance(), 25);
    }

    stop() {
      this.running = false;
      if (this.timer) clearInterval(this.timer);
      this.timer = null;
      if (this.sub) { try { this.sub.forEach(o => o.stop()); } catch (e) {} this.sub = null; }
      if (this.master && this.ctx) {
        try {
          this.master.gain.cancelScheduledValues(this.ctx.currentTime);
          this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.4);
        } catch (e) {}
      }
    }

    setMuted(m) {
      this.muted = m;
      if (this.master && this.ctx) this.master.gain.setTargetAtTime(m ? 0 : this.vol, this.ctx.currentTime, 0.15);
    }

    /* the garden tells the music how alive it is */
    setState(stage, coherence) {
      this.coh = coherence;
      this.targetL = Math.max(0, Math.min(1, 0.14 + (stage - 1) * 0.16 + coherence * 0.24));
    }

    cue(name) {
      if (!this.running || !this.ctx) return;
      const t = this.ctx.currentTime + 0.02;
      if (name === 'storm') this._noiseHit(t, 0.16, 220, 1.4, 'lowpass');
      else if (name === 'cascade') this._arp(t);
      else if (name === 'stage' || name === 'coalesce') this._swell(t, name === 'coalesce' ? 4 : 1.6);
      else if (name === 'dissolve') this._swell(t, 3, true);
    }

    /* ── scheduler ── */
    _advance() {
      if (!this.running || !this.ctx) return;
      /* glide the mood */
      this.zoneL += (this.targetL - this.zoneL) * 0.04;
      while (this.nextBeat < this.ctx.currentTime + 0.12) {
        this._onBeat(this.nextBeat, this.beat);
        this.nextBeat += this.beatDur; this.beat++;
      }
      this._mix();
    }

    _mix() {
      const L = this.zoneL, t = this.ctx.currentTime, set = (n, v) => this.g[n].gain.setTargetAtTime(Math.max(0, v), t, 0.5);
      set('sub', 0.16 + 0.05 * L);
      set('pad', 0.05 + 0.07 * L);
      set('shaker', 0.015 + 0.05 * L);
      set('rim', L > 0.28 ? 0.03 + 0.04 * L : 0);
      set('kick', L > 0.36 ? 0.09 + 0.11 * L : 0);
      set('bass', L > 0.36 ? 0.08 + 0.12 * L : 0);
      set('pluck', L > 0.55 ? 0.04 + 0.07 * L : 0);
    }

    _onBeat(time, beat) {
      const step16 = this.beatDur / 4;
      const bar = Math.floor(beat / 4);
      const barBeat = beat % 4;
      const ci = bar % this.prog.length;
      const chordRoot = this.root + this.prog[ci];

      /* pads bloom every two bars */
      if (barBeat === 0 && bar % 2 === 0) this._pad(time, chordRoot);
      /* bass on the downbeat and a syncopated push */
      if (this.zoneL > 0.36) {
        if (barBeat === 0) this._bass(time, chordRoot);
        if (barBeat === 2) this._bass(time + step16 * 2, chordRoot, true);
      }
      /* per-16th percussion + pluck across this beat */
      const kp = KICKS[bar % KICKS.length];
      const sp = SHAKERS[(bar >> 1) % SHAKERS.length];
      const rp = RIMS[bar % RIMS.length];
      const motif = MOTIFS[(bar >> 1) % MOTIFS.length];
      for (let s = 0; s < 4; s++) {
        const i = barBeat * 4 + s;
        const swing = (i % 2 === 1) ? step16 * 0.16 : 0; /* jungle shuffle */
        const tt = time + s * step16 + swing;
        if (this.zoneL > 0.36 && kp[i]) this._kick(tt);
        if (sp[i]) this._shaker(tt, i % 4 === 2 ? 1 : 0.6);
        if (this.zoneL > 0.28 && rp[i]) this._rim(tt);
        if (this.zoneL > 0.55 && motif[i] >= 0 && this._rng() < 0.9) {
          const deg = motif[i];
          const midi = chordRoot + 24 + PENTA[deg % PENTA.length] + 12 * Math.floor(deg / PENTA.length);
          this._pluck(tt, midi);
        }
      }
    }

    /* ── voices ── */
    _startSub() {
      const ctx = this.ctx, f = mtf(this.root - 12);
      const o1 = ctx.createOscillator(); o1.type = 'sine'; o1.frequency.value = f;
      const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = f * 1.005;
      const o3 = ctx.createOscillator(); o3.type = 'triangle'; o3.frequency.value = f * 2; o3.detune.value = 4;
      const h = ctx.createGain(); h.gain.value = 0.12;
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07;
      const lg = ctx.createGain(); lg.gain.value = 0.25;
      o1.connect(this.g.sub); o2.connect(this.g.sub); o3.connect(h); h.connect(this.g.sub);
      lfo.connect(lg); lg.connect(this.g.sub.gain);
      o1.start(); o2.start(); o3.start(); lfo.start();
      this.sub = [o1, o2, o3, lfo];
    }

    _chordVoices(rootMidi) {
      const sc = this.mode, deg = ((rootMidi - this.root) % 12 + 12) % 12;
      const third = sc.indexOf(3) >= 0 && [0, 5].includes(this.prog[0]) ? 3 : 3;
      return [rootMidi, rootMidi + third, rootMidi + 7]; /* simple minor-ish triad */
    }
    _pad(time, rootMidi) {
      const ctx = this.ctx, dur = this.beatDur * 8;
      for (const m of this._chordVoices(rootMidi + 12)) {
        for (const det of [-6, 6]) {
          const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = mtf(m); o.detune.value = det;
          const f = ctx.createBiquadFilter(); f.type = 'lowpass';
          f.frequency.value = 500 + this.coh * 1800; f.Q.value = 0.6;
          const g = ctx.createGain(); g.gain.value = 0;
          g.gain.setValueAtTime(0, time);
          g.gain.linearRampToValueAtTime(0.05, time + 1.2);
          g.gain.setValueAtTime(0.05, time + dur - 1.4);
          g.gain.linearRampToValueAtTime(0, time + dur);
          o.connect(f); f.connect(g); g.connect(this.g.pad);
          o.start(time); o.stop(time + dur + 0.1);
        }
      }
    }
    _bass(time, rootMidi, ghost) {
      const ctx = this.ctx, o = ctx.createOscillator(); o.type = 'sine';
      o.frequency.value = mtf(rootMidi);
      const sq = ctx.createOscillator(); sq.type = 'triangle'; sq.frequency.value = mtf(rootMidi); sq.detune.value = 3;
      const sg = ctx.createGain(); sg.gain.value = 0.18;
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 420; f.Q.value = 3;
      const g = ctx.createGain();
      const peak = ghost ? 0.18 : 0.34;
      g.gain.setValueAtTime(0.0001, time);
      g.gain.exponentialRampToValueAtTime(peak, time + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, time + this.beatDur * (ghost ? 0.6 : 1.1));
      o.connect(f); sq.connect(sg); sg.connect(f); f.connect(g); g.connect(this.g.bass);
      o.start(time); sq.start(time); o.stop(time + this.beatDur * 1.3); sq.stop(time + this.beatDur * 1.3);
    }
    _kick(time) {
      const ctx = this.ctx, o = ctx.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(135, time);
      o.frequency.exponentialRampToValueAtTime(44, time + 0.09);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.9, time);
      g.gain.exponentialRampToValueAtTime(0.001, time + 0.32);
      o.connect(g); g.connect(this.g.kick); o.start(time); o.stop(time + 0.35);
    }
    _shaker(time, vol) {
      const ctx = this.ctx, src = ctx.createBufferSource(); src.buffer = this.noise;
      const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000;
      const g = ctx.createGain();
      g.gain.setValueAtTime(vol * 0.5, time);
      g.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
      src.connect(f); f.connect(g); g.connect(this.g.shaker); src.start(time); src.stop(time + 0.06);
    }
    _rim(time) {
      const ctx = this.ctx, src = ctx.createBufferSource(); src.buffer = this.noise;
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1900; f.Q.value = 3;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.4, time);
      g.gain.exponentialRampToValueAtTime(0.001, time + 0.04);
      const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = 320;
      const og = ctx.createGain(); og.gain.setValueAtTime(0.18, time); og.gain.exponentialRampToValueAtTime(0.001, time + 0.03);
      src.connect(f); f.connect(g); g.connect(this.g.rim);
      o.connect(og); og.connect(this.g.rim);
      src.start(time); src.stop(time + 0.05); o.start(time); o.stop(time + 0.04);
    }
    _pluck(time, midi) {
      const ctx = this.ctx, o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = mtf(midi);
      const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = mtf(midi) * 2; o2.detune.value = 5;
      const o2g = ctx.createGain(); o2g.gain.value = 0.3;
      const f = ctx.createBiquadFilter(); f.type = 'lowpass';
      f.frequency.setValueAtTime(2600, time); f.frequency.exponentialRampToValueAtTime(700, time + 0.25);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, time);
      g.gain.exponentialRampToValueAtTime(0.16, time + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, time + 0.4);
      o.connect(f); o2.connect(o2g); o2g.connect(f); f.connect(g); g.connect(this.g.pluck);
      o.start(time); o2.start(time); o.stop(time + 0.45); o2.stop(time + 0.45);
    }

    /* ── cues ── */
    _noiseHit(time, vol, cutoff, dur, type) {
      const ctx = this.ctx, src = ctx.createBufferSource(); src.buffer = this.noise; src.loop = true;
      const f = ctx.createBiquadFilter(); f.type = type || 'lowpass';
      f.frequency.setValueAtTime(cutoff, time); f.frequency.exponentialRampToValueAtTime(cutoff * 0.3, time + dur);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, time);
      g.gain.linearRampToValueAtTime(vol, time + dur * 0.3);
      g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
      src.connect(f); f.connect(g); g.connect(this.bus); g.connect(this.rvSend);
      src.start(time); src.stop(time + dur + 0.1);
    }
    _arp(time) {
      const base = this.root + 24;
      for (let i = 0; i < 5; i++) this._pluck(time + i * this.beatDur * 0.25, base + PENTA[i]);
    }
    _swell(time, dur, dark) {
      const ctx = this.ctx;
      for (const m of this._chordVoices(this.root + 12 + (dark ? -2 : 0))) {
        const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = mtf(m); o.detune.value = -4;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, time);
        g.gain.linearRampToValueAtTime(0.08, time + dur * 0.5);
        g.gain.linearRampToValueAtTime(0.0001, time + dur);
        o.connect(g); g.connect(this.g.pad); g.connect(this.rvSend);
        o.start(time); o.stop(time + dur + 0.2);
      }
    }
  }

  LP.Music = new Music();
})();
