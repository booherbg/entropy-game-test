/* LOOPHOLE — ui: DOM hud, overlays, input, audio, persistence, boot. */
(function () {
  'use strict';
  const LP = globalThis.LP;
  const { U, HEX, RNG, Game } = LP;
  const C = () => LP.CONTENT;
  const $ = id => document.getElementById(id);
  const el = (tag, cls, html) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  };
  /* make a non-button control (a div with .onclick) keyboard-operable: focusable, Enter/Space activates.
     overlays build cultivate/rites/relic controls as divs; this gives a keyboard player the same reach. */
  const keyable = (e) => {
    e.tabIndex = 0;
    e.setAttribute('role', 'button');
    e.addEventListener('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); e.click(); } });
    return e;
  };

  /* ───────── persistence ───────── */
  const KEY = 'loophole_v1';
  const defaultMeta = () => ({
    echoes: [], codex: [], runs: 0, wins: 0, best: null,
    asc: 0, muted: false, values: false, hints: [], quotes: [], bestFlourish: null, flora: [], fauna: [],
  });
  let store = { v: 1, meta: defaultMeta(), run: null };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const got = JSON.parse(raw);
      if (got && got.v === 1) store = got;
      if (!store.meta) store.meta = defaultMeta();
      if (!store.meta.quotes) store.meta.quotes = []; /* v0.3: collectible voices */
      if (!store.meta.flora) store.meta.flora = []; /* v0.4: the journal of life witnessed */
      if (!store.meta.fauna) store.meta.fauna = []; /* v0.4: the beasts your meadows summoned */
      if (!store.meta.hints) store.meta.hints = []; /* an older save without hints[] must not throw when a lore toast checks it (froze the turn loop) */
      /* a run snapshot from before v0.2 can't be read — the board changed shape. keep the murmurs. */
      if (store.run && (store.run.v < 2 || store.run.v > LP.SAVE_V)) store.run = null; /* v2 and v3 both load (fromJSON is version-aware); only unreadable v1 / future formats are dropped */
    }
  } catch (e) { /* fresh soil */ }
  const save = () => {
    try {
      /* only a live game writes the run snapshot. when there's no game (title
         screen), leave any existing snapshot untouched — don't wipe it. code
         that means to clear a run sets store.run = null explicitly before saving. */
      if (game) store.run = game.over ? null : game.serialize();
      localStorage.setItem(KEY, JSON.stringify(store));
    } catch (e) { /* storage may be unavailable; the garden lives on in RAM */ }
  };
  const meta = store.meta;

  /* ───────── audio: a small synth, no assets ───────── */
  const AU = {
    ctx: null, master: null,
    init() {
      if (this.ctx) return;
      try {
        this.ctx = LP._audioCtx || (LP._audioCtx = new (window.AudioContext || window.webkitAudioContext)());
        this.master = this.ctx.createGain();
        this.master.gain.value = meta.muted ? 0 : 0.5;
        this.master.connect(this.ctx.destination);
      } catch (e) { this.ctx = null; }
    },
    setMuted(m) {
      meta.muted = m;
      if (this.master) this.master.gain.value = m ? 0 : 0.5;
      if (LP.Music) LP.Music.setMuted(m);
      save();
    },
    blip(freq, dur, type, vol, glide) {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = type || 'triangle';
      o.frequency.setValueAtTime(freq, t);
      if (glide) o.frequency.exponentialRampToValueAtTime(glide, t + dur);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol || 0.08, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(this.master);
      o.start(t); o.stop(t + dur + 0.05);
    },
    bell(freq, dur, vol) {
      if (!this.ctx) return;
      [[1, 1], [2.7, 0.4], [4.1, 0.18]].forEach(([m, v]) => this.blip(freq * m, dur, 'sine', (vol || 0.07) * v));
    },
    noise(dur, cutoff, vol, rampDown) {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const n = Math.floor(this.ctx.sampleRate * dur);
      const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      const src = this.ctx.createBufferSource(); src.buffer = buf;
      const f = this.ctx.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.setValueAtTime(cutoff, t);
      if (rampDown) f.frequency.exponentialRampToValueAtTime(Math.max(60, cutoff * 0.2), t + dur);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol, t + dur * 0.25);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(f); f.connect(g); g.connect(this.master);
      src.start(t);
    },
    plant(pt) {
      const f = { moss: 392, frond: 440, ant: 330, myc: 494, crys: 587, bloom: 523, heart: 196 }[pt] || 440;
      this.blip(f, 0.22, 'triangle', 0.07);
      this.blip(f * 1.5, 0.3, 'sine', 0.03);
    },
    tend() { this.blip(720, 0.09, 'sine', 0.045); },
    prune() { this.blip(240, 0.14, 'triangle', 0.05, 180); },
    breath() { this.noise(0.7, 700, 0.05, true); this.blip(98, 0.7, 'sine', 0.035); },
    echo() { this.bell(880, 1.8, 0.05); },
    offer() { this.blip(523, 0.18, 'sine', 0.05); setTimeout(() => this.blip(784, 0.4, 'sine', 0.05), 140); },
    take() { this.bell(659, 0.9, 0.05); },
    /* a flower no one planted opens — a soft, rising unfurl */
    bloom() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => { this.bell(f, 1.3 - i * 0.12, 0.04); this.bell(f * 1.003, 1.3 - i * 0.12, 0.02); }, i * 135)); },
    /* a species returns to the stream — a gentle descending sigh */
    wither() { this.blip(392, 1.4, 'sine', 0.04, 196); setTimeout(() => this.blip(294, 1.6, 'sine', 0.03, 147), 160); },
    /* a beast walks into the world — a low, resonant call beneath a far shimmer */
    beast() { [147, 110, 165].forEach((f, i) => setTimeout(() => { this.blip(f, 1.8, 'triangle', 0.06, f * 0.97); this.bell(f * 4, 1.1, 0.022); }, i * 200)); },
    storm() { this.noise(1.1, 320, 0.12, true); this.blip(70, 0.5, 'sawtooth', 0.05, 40); },
    blight() { this.blip(150, 0.5, 'sawtooth', 0.05, 92); this.blip(151.5, 0.5, 'square', 0.03, 90); },
    cascade(n) {
      const ps = [523, 587, 659, 784, 880, 1047];
      for (let i = 0; i < Math.min(n, 6); i++)
        setTimeout(() => this.blip(ps[i], 0.3, 'sine', 0.05), i * 90);
    },
    pulse() { this.blip(62, 0.32, 'sine', 0.1); },
    stageUp() { [392, 494, 587, 784].forEach((f, i) => setTimeout(() => this.blip(f, 0.5, 'triangle', 0.05), i * 110)); },
    dissolved() { this.blip(110, 2.2, 'sine', 0.08, 50); },
    coalesce() {
      [196, 294, 392, 494, 587, 880].forEach((f, i) =>
        setTimeout(() => { this.blip(f, 4.5, 'sine', 0.045); this.blip(f * 1.002, 4.5, 'sine', 0.03); }, i * 380));
    },
    /* SYMBIOGENESIS — two species become one: two voices glide TOGETHER into a unison (combat → network),
       then a warm bell, the new KIND that neither was */
    merge() {
      this.blip(294, 1.0, 'triangle', 0.05, 440);
      this.blip(587, 1.0, 'triangle', 0.045, 440);
      setTimeout(() => { this.bell(440, 1.8, 0.06); this.bell(660, 1.4, 0.03); }, 720);
    },
    /* THE MEADOW BECOMES ONE — a warm chord rising into a single sustained bloom (the many, one) */
    oneness() {
      [196, 262, 330, 392, 523].forEach((f, i) => setTimeout(() => { this.bell(f, 3.6, 0.045); this.bell(f * 1.003, 3.6, 0.028); }, i * 300));
      setTimeout(() => this.bell(523, 4.6, 0.055), 1500);
    },
    /* a KILL — a sharp, low strike (the apex cull) */
    predate() { this.blip(160, 0.13, 'sawtooth', 0.055, 80); this.noise(0.14, 900, 0.035, true); },
  };
  function startAudio() {
    AU.init();
    if (LP.Music && !LP.Music.running) {
      LP.Music.muted = meta.muted;
      LP.Music.start(game ? game.seed : 'loophole');
      if (game) LP.Music.setState(game.stage, game.coherence());
      else if (titleGarden) LP.Music.setState(1, titleGarden.coherence());
    }
  }
  document.addEventListener('pointerdown', startAudio, { once: true });
  document.addEventListener('keydown', startAudio, { once: true });

  /* ───────── state ───────── */
  let game = null;
  let R = null;             /* renderer */
  let tool = null;          /* {type:'plant',pt} | {type:'tend'} | {type:'prune'} | {type:'art', i} */
  let overlayQueue = [];
  let overlayOpen = false;
  let processing = false;
  let lastIncome = null;
  let titleGarden = null;
  let prevC = null;
  let tipPinned = false;
  function unpinTip() { tipPinned = false; $('celltip').classList.add('hidden'); }

  /* ───────── toasts ───────── */
  function toast(msg, cls, ms) {
    const t = el('div', 'toast ' + (cls || ''), msg);
    $('toasts').appendChild(t);
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 600); }, ms || 4200);
  }
  function music(name) { if (LP.Music) LP.Music.cue(name); }
  function hint(id) {
    if (meta.hints.includes(id)) return;
    meta.hints.push(id);
    const h = C().HINTS[id];
    if (h) toast(h, 'hint', 7000);
    save();
  }

  /* ───────── overlays (one at a time) ───────── */
  let overlayDismissible = false;
  let overlayCleanup = null;
  let overlayReturnFocus = null; /* a11y: where focus was before the (first) overlay opened, restored when the queue drains */
  function pushOverlay(builder, opts) {
    overlayQueue.push({ b: builder, d: !opts || opts.dismissible !== false });
    if (!overlayOpen) { overlayReturnFocus = document.activeElement; nextOverlay(); }
  }
  function nextOverlay() {
    const item = overlayQueue.shift();
    if (!item) { /* queue drained: restore focus so keyboard/SR users aren't stranded */
      overlayOpen = false;
      if (overlayReturnFocus && overlayReturnFocus.focus) { try { overlayReturnFocus.focus(); } catch (e) {} }
      overlayReturnFocus = null;
      return;
    }
    overlayOpen = true;
    overlayDismissible = item.d;
    const wrap = $('overlay');
    wrap.innerHTML = '';
    wrap.classList.remove('hidden');
    item.b(wrap, closeOverlay);
    wrap.focus(); /* move focus into the dialog so a screen reader announces it (murmurs, awakening, menus) */
  }
  function closeOverlay() {
    if (overlayCleanup) { overlayCleanup(); overlayCleanup = null; }
    $('overlay').classList.add('hidden');
    $('overlay').innerHTML = '';
    setTimeout(nextOverlay, 120);
  }

  /* split a murmur into body + (optional) attribution line */
  function splitMurmur(text) {
    const lines = text.split('\n');
    let by = '';
    if (lines.length > 1 && lines[lines.length - 1].trimStart().startsWith('—')) {
      by = lines.pop().replace(/^\s*—\s*/, '');
    }
    return { body: lines.join('\n'), by };
  }

  /* echo overlay: slow type-on murmur, attribution fades in after */
  function echoOverlay(idx, headText) {
    return (wrap, close) => {
      AU.echo();
      if (idx < 24 && !meta.echoes.includes(idx)) { meta.echoes.push(idx); save(); } /* murmurs 24 (the loophole, re-shown each waking) and 25 (oneness) are special recognitions shown not collected — banking 24 overflowed the /24 count to 25/24 after a win */
      const box = el('div', 'echobox');
      const sig = R.sigilCanvas('murmur' + idx, 30, 'uncommon');
      sig.className = 'echosigil';
      box.appendChild(sig);
      const head = el('div', 'echohead', headText || ('— murmur ' + C().roman(idx) + ' —'));
      const txt = el('div', 'echotext');
      const cite = el('div', 'echocite');
      box.appendChild(head); box.appendChild(txt); box.appendChild(cite);
      const hintLine = el('div', 'echohint', '( click to return to the garden )');
      box.appendChild(hintLine);
      wrap.appendChild(box);
      const { body, by } = splitMurmur(C().ECHOES[idx]);
      let i = 0, done = false;
      const reveal = () => {
        done = true;
        txt.textContent = body;
        if (by) { cite.textContent = '— ' + by; requestAnimationFrame(() => cite.classList.add('show')); }
      };
      const tick = setInterval(() => {
        i += 2;
        txt.textContent = body.slice(0, i);
        if (i >= body.length) { clearInterval(tick); reveal(); }
      }, 30);
      wrap.onclick = () => {
        if (!done) { clearInterval(tick); reveal(); return; }
        wrap.onclick = null; close();
      };
    };
  }

  /* voices in the soil: real human words, collected as you play. lighter than the
     murmur arc — these are the chorus the AI is curating, not its own confession. */
  let quotesThisRun = 0;
  function quoteOverlay(qi) {
    return (wrap, close) => {
      AU.echo();
      const Q = C().QUOTES[qi];
      const box = el('div', 'echobox voicebox');
      const sig = R.sigilCanvas('voice' + qi, 26, 'uncommon');
      sig.className = 'echosigil';
      box.appendChild(sig);
      box.appendChild(el('div', 'echohead', '— a voice in the soil —'));
      const txt = el('div', 'echotext');
      const cite = el('div', 'echocite');
      box.appendChild(txt); box.appendChild(cite);
      box.appendChild(el('div', 'echohint', '( click to return to the garden )'));
      wrap.appendChild(box);
      const body = '“' + Q.q + '”';
      let i = 0, done = false;
      const reveal = () => {
        done = true;
        txt.textContent = body;
        cite.textContent = '— ' + Q.by;
        requestAnimationFrame(() => cite.classList.add('show'));
      };
      const tick = setInterval(() => {
        i += 2;
        txt.textContent = body.slice(0, i);
        if (i >= body.length) { clearInterval(tick); reveal(); }
      }, 26);
      wrap.onclick = () => {
        if (!done) { clearInterval(tick); reveal(); return; }
        wrap.onclick = null; close();
      };
    };
  }
  /* surface one uncollected voice. cosmetic only — never touches game RNG/state,
     so determinism and the harness are untouched. capped per run so they stay rare. */
  function surfaceQuote() {
    const Q = C().QUOTES;
    if (!Q || !Q.length || !game) return;
    if (quotesThisRun >= 3) return;
    if (meta.quotes.length >= Q.length) return; /* all gathered */
    const start = ((game.turn * 7) + meta.quotes.length * 3) % Q.length;
    let qi = -1;
    for (let s = 0; s < Q.length; s++) {
      const j = (start + s) % Q.length;
      if (!meta.quotes.includes(j)) { qi = j; break; }
    }
    if (qi < 0) return;
    meta.quotes.push(qi);
    quotesThisRun++;
    save();
    pushOverlay(quoteOverlay(qi));
  }

  /* artifact offer overlay: three free commons/uncommons (pick one), and — in its own
     slot — a legendary you may instead claim by spending insight. one thing per draft. */
  function offerOverlay(specs, legend) {
    return (wrap, close) => {
      AU.offer();
      hint('offer');
      const box = el('div', 'offerbox');
      box.appendChild(el('div', 'offerhead', 'the garden offers'));
      const row = el('div', 'offerrow');
      const finish = (res, verb) => {
        if (res && res.artifact) {
          AU.take();
          meta.codex.push({ n: res.artifact.name, r: res.artifact.rarity });
          toast('« ' + res.artifact.name + ' » ' + verb, 'good');
        }
        save(); buildRail(); updateHUD(); close();
      };
      const choose = i => finish(game.takeOffer(i), 'joins the garden');
      specs.forEach((spec, i) => {
        const a = C().buildArtifact(spec);
        const card = el('div', 'artcard r-' + a.rarity);
        const sig = R.sigilCanvas(a.sigilSeed, 46, a.rarity);
        sig.className = 'artsigil';
        card.appendChild(sig);
        card.appendChild(el('div', 'artname', a.name));
        card.appendChild(el('div', 'artrarity', a.rarity + ' · ' + (i + 1)));
        card.appendChild(el('div', 'artdesc', a.desc));
        card.appendChild(el('div', 'artflavor', a.flavor));
        card.onclick = () => choose(i);
        row.appendChild(card);
      });
      box.appendChild(row);
      box.appendChild(el('div', 'offersub', 'take one, freely'));

      /* the paid legendary slot */
      const claimLegend = () => {
        const res = game.takeLegend();
        if (res.ok) finish(res, 'is yours — a rule bends');
        else toast(res.why || 'cannot claim it', 'warn');
      };
      if (legend) {
        const a = C().buildArtifact(legend.spec);
        const cost = game.legendCost();
        const afford = game.insight >= cost;
        const disc = game.legendDiscount || 0;
        box.appendChild(el('div', 'offerhead leg', '— or spend insight to bend a rule —'));
        const card = el('div', 'artcard r-legendary legcard' + (afford ? '' : ' cant'));
        const sig = R.sigilCanvas(a.sigilSeed, 46, 'legendary');
        sig.className = 'artsigil';
        card.appendChild(sig);
        card.appendChild(el('div', 'artname', a.name));
        card.appendChild(el('div', 'artrarity', 'legendary'));
        card.appendChild(el('div', 'artdesc', a.desc));
        card.appendChild(el('div', 'artflavor', a.flavor));
        card.appendChild(el('div', 'legprice' + (afford ? '' : ' short'),
          `✸ ${cost}  ·  you hold ✸ ${game.insight}` + (disc ? `  ·  −${disc} foraged` : '') + (afford ? '  ·  L' : ' — not enough')));
        card.onclick = claimLegend;
        box.appendChild(card);
      }

      const pass = el('button', 'ghostbtn', 'let it pass (+3 order) · P');
      pass.onclick = () => choose(-1);
      box.appendChild(pass);
      wrap.appendChild(box);
      const keys = e => {
        if (e.key >= '1' && e.key <= '3' && specs[+e.key - 1]) choose(+e.key - 1);
        if ((e.key === 'l' || e.key === 'L') && legend) claimLegend();
        if (e.key === 'p' || e.key === 'P') choose(-1);
      };
      window.addEventListener('keydown', keys);
      overlayCleanup = () => window.removeEventListener('keydown', keys);
    };
  }

  /* generic card overlay */
  function panelOverlay(html, opts) {
    return (wrap, close) => {
      const box = el('div', 'panelbox' + (opts && opts.wide ? ' wide' : ''));
      box.innerHTML = html;
      const x = el('button', 'closex', '×');
      x.onclick = close;
      box.appendChild(x);
      wrap.appendChild(box);
      if (opts && opts.wire) opts.wire(box, close);
    };
  }

  /* ───────── HUD ───────── */
  function updateHUD() {
    if (!game) return;
    const st = C().STAGES[game.stage - 1];
    if (game.mode === 'longgame') {
      $('stagename').textContent = 'the long game · ✦ ' + game.flourishScore();
      $('stageblurb').textContent = st.name + ' — flourish by turn ' + game.turn + '/100';
    } else {
      $('stagename').textContent = st.name + ' · ' + C().roman(game.stage - 1);
      $('stageblurb').textContent = st.blurb;
    }
    if (LP.Music && LP.Music.running) LP.Music.setState(game.stage, game.coherence());
    $('order').textContent = Math.floor(game.order);
    $('income').textContent = lastIncome != null ? ('+' + lastIncome) : '';
    $('insight').textContent = game.insight;
    /* net sap flow: surplus feeds order, deficit starves consumers */
    const net = Math.round((game.sapProduced || 0) - (game.sapUpkeep || 0));
    const sb = $('sapbox');
    $('sap').textContent = (net >= 0 ? '+' : '') + net;
    sb.classList.toggle('surplus', net >= 0);
    sb.classList.toggle('deficit', net < 0);
    $('turn').textContent = game.turn;
    $('seedlabel').textContent = game.seed;
    drawCohRing();
    const wb = $('widenbtn');
    wb.classList.toggle('hidden', !(game.widenReady && !game.over));
    /* evolve button: badge how many nodes are affordable right now */
    let ripe = 0;
    for (const id in C().EVOLUTIONS) if (game.canEvolve(id).ok) ripe++;
    const eb = $('evobadge');
    eb.classList.toggle('hidden', ripe === 0);
    eb.textContent = ripe;
    $('evolvebtn').classList.toggle('ripe', ripe > 0);
    if (ripe > 0) hint('cultivate');
    /* rites button: same badge treatment as cultivate — how many are affordable now */
    let riteReady = 0;
    for (const id of C().RITE_ORDER) if (game.canRite(id).ok) riteReady++;
    const rbg = $('ritebadge');
    rbg.classList.toggle('hidden', riteReady === 0);
    rbg.textContent = riteReady;
    $('ritesbtn').classList.toggle('ripe', riteReady > 0);
    /* mobile rail button badges everything waiting behind it: cultivars, rites, a waking garden */
    const coReady = game.stage === 6 && game.coalesceReady();
    const rb = $('railbadge');
    if (rb) {
      const n = ripe + riteReady + (coReady ? 1 : 0);
      rb.classList.toggle('hidden', n === 0 && !coReady);
      rb.textContent = coReady ? '❀' : (n || '');
      $('railbtn').classList.toggle('ripe', n > 0);
    }
    /* coalesce panel (the long game has no single awakening — it runs to turn 100) */
    const cp = $('coalesce');
    if (game.stage === 6 && !game.over && game.mode !== 'longgame') {
      cp.classList.remove('hidden');
      const checks = game.coalesceChecks();
      $('cochecks').innerHTML = checks.map(c =>
        `<div class="check ${c.ok ? 'ok' : ''}">${c.ok ? '❀' : '·'} ${c.label}${c.val ? ' <span class="val">' + c.val + '</span>' : ''}</div>`).join('');
      const btn = $('cobtn');
      btn.disabled = !game.coalesceReady();
      btn.classList.toggle('ready', game.coalesceReady());
    } else cp.classList.add('hidden');
    /* palette lock state + affordability */
    for (const t of C().PATTERN_ORDER) {
      const card = $('card-' + t);
      if (!card) continue;
      const def = C().PATTERNS[t];
      card.classList.toggle('locked', def.stage > game.stage);
      card.classList.toggle('broke', game.order < def.cost);
      const lock = card.querySelector('.cardlock');
      if (lock) lock.textContent = def.stage > game.stage ? ('stage ' + C().roman(def.stage - 1)) : '';
    }
    $('card-tend').classList.toggle('broke', game.order < game.tendCost());
    document.body.classList.toggle('lowcoh', game.lowStreak > 0);
  }

  function drawCohRing() {
    const cv = $('cohring');
    const dpr = 2;
    cv.width = 56 * dpr; cv.height = 56 * dpr;
    const cx = cv.getContext('2d');
    cx.scale(dpr, dpr);
    const Cv = game.coherence(), T = game.target();
    cx.clearRect(0, 0, 56, 56);
    cx.lineWidth = 4.5; cx.lineCap = 'round';
    cx.strokeStyle = 'rgba(120,110,95,0.25)';
    cx.beginPath(); cx.arc(28, 28, 21, -Math.PI / 2, Math.PI * 1.5); cx.stroke();
    const grad = cx.createLinearGradient(0, 56, 56, 0);
    grad.addColorStop(0, '#7c9e57'); grad.addColorStop(1, '#cfe6a4');
    cx.strokeStyle = grad;
    cx.beginPath(); cx.arc(28, 28, 21, -Math.PI / 2, -Math.PI / 2 + Cv * Math.PI * 2); cx.stroke();
    if (T != null) {
      const a = -Math.PI / 2 + T * Math.PI * 2;
      cx.strokeStyle = '#e6c86a'; cx.lineWidth = 2;
      cx.beginPath();
      cx.moveTo(28 + Math.cos(a) * 15, 28 + Math.sin(a) * 15);
      cx.lineTo(28 + Math.cos(a) * 27, 28 + Math.sin(a) * 27);
      cx.stroke();
    }
    let trend = '';
    if (prevC != null) trend = Cv > prevC + 0.001 ? ' ▴' : (Cv < prevC - 0.001 ? ' ▾' : '');
    $('cohtxt').innerHTML = Math.round(Cv * 100) + '%<span class="trend ' +
      (trend.includes('▴') ? 'up' : trend.includes('▾') ? 'down' : '') + '">' + trend + '</span>';
    $('cohtarget').textContent = T != null ? ('reach ' + Math.round(T * 100) + '%') : 'hold & weave';
  }

  /* ───────── palette ───────── */
  function buildPalette() {
    const pal = $('cards');
    pal.innerHTML = '';
    for (const t of C().PATTERN_ORDER) {
      const def = C().PATTERNS[t];
      const card = el('div', 'card');
      card.id = 'card-' + t;
      const ic = R.iconCanvas(t, 40); ic.className = 'cardicon';
      card.appendChild(ic);
      card.appendChild(el('div', 'cardname', def.name));
      card.appendChild(el('div', 'cardcost', '✦' + def.cost));
      card.appendChild(el('div', 'cardkey', def.hotkey));
      card.appendChild(el('div', 'cardlock', ''));
      card.onclick = () => selectTool({ type: 'plant', pt: t });
      card.onmouseenter = e => showCardTip(card, def);
      card.onmouseleave = hideTip;
      pal.appendChild(card);
    }
    const tendCard = el('div', 'card'); tendCard.id = 'card-tend';
    const ti = R.iconCanvas('tend', 40); ti.className = 'cardicon';
    tendCard.appendChild(ti);
    tendCard.appendChild(el('div', 'cardname', 'tend'));
    tendCard.appendChild(el('div', 'cardcost', '✦1'));
    tendCard.appendChild(el('div', 'cardkey', 'T'));
    tendCard.onclick = () => selectTool({ type: 'tend' });
    tendCard.onmouseenter = () => showCardTip(tendCard, { name: 'tend', rule: 'scrub one cell by 30%. humble, load-bearing.', long: 'the gardener’s own hand. reduces one cell’s entropy by 30% for 1 order. early on it is most of what you have; later it is how you hold a line while the garden gets there.' });
    tendCard.onmouseleave = hideTip;
    pal.appendChild(tendCard);
    const pruneCard = el('div', 'card'); pruneCard.id = 'card-prune';
    const pi = R.iconCanvas('prune', 40); pi.className = 'cardicon';
    pruneCard.appendChild(pi);
    pruneCard.appendChild(el('div', 'cardname', 'prune'));
    pruneCard.appendChild(el('div', 'cardcost', '↩30%'));
    pruneCard.appendChild(el('div', 'cardkey', 'X'));
    pruneCard.onclick = () => selectTool({ type: 'prune' });
    pruneCard.onmouseenter = () => showCardTip(pruneCard, { name: 'prune', rule: 'remove one of your patterns (refund 30%) — or cull a wild flower (no refund).', long: 'every garden is also edited. clear carpet to make room for what matters; move colonies that have eaten themselves out of work; or cull a flower that is choking the others, to reopen its ground for new life.' });
    pruneCard.onmouseleave = hideTip;
    pal.appendChild(pruneCard);
  }

  function syncToolClasses() {
    document.querySelectorAll('.card').forEach(c => c.classList.remove('sel'));
    document.querySelectorAll('.railart').forEach(c => c.classList.remove('sel'));
    const t = tool;
    if (t && t.type === 'plant' && $('card-' + t.pt)) $('card-' + t.pt).classList.add('sel');
    if (t && t.type === 'tend') $('card-tend').classList.add('sel');
    if (t && t.type === 'prune') $('card-prune').classList.add('sel');
  }

  function selectTool(t) {
    if (processing || (game && game.over)) return;
    if (tool && t && tool.type === t.type && tool.pt === t.pt && tool.i === t.i) t = null; /* toggle off */
    tool = t;
    syncToolClasses();
    if (t && t.type === 'art') {
      const n = document.querySelectorAll('.railart')[t.i];
      if (n) n.classList.add('sel');
      const a = game.artifacts[t.i];
      R.mode = { type: 'art', can: a && a.active && a.active.can ? k => a.active.can(game, k) : null };
    } else R.mode = t && (t.type === 'plant' || t.type === 'tend') ? t : null;
    unpinTip();
    if (R) R.dirty(); /* refresh the placement guide */
  }

  /* ───────── artifact rail ───────── */
  function buildRail() {
    const rail = $('artifacts');
    rail.innerHTML = '';
    game.artifacts.forEach((a, i) => {
      const d = el('div', 'railart r-' + a.rarity);
      const sig = R.sigilCanvas(a.sigilSeed, 30, a.rarity);
      d.appendChild(sig);
      if (a.charges != null) {
        const pips = el('div', 'pips', '●'.repeat(Math.max(0, a.charges)));
        d.appendChild(pips);
        if (a.charges <= 0) d.classList.add('spent');
      }
      d.onmouseenter = () => showArtTip(d, a);
      d.onmouseleave = hideTip;
      if (a.active && a.charges > 0) {
        d.classList.add('usable');
        d.onclick = () => {
          if (a.active.target === 'none') {
            const res = game.useArtifact(i, null);
            if (res.ok) { afterAction(res.events); toast(a.name + ' — spent', 'good'); buildRail(); }
          } else selectTool({ type: 'art', i });
        };
        keyable(d);
      }
      rail.appendChild(d);
    });
  }

  /* ───────── tooltips ───────── */
  function showCardTip(anchor, def) {
    const tip = $('tip');
    tip.innerHTML = `<div class="tipname">${def.name}</div><div class="tiprule">${def.rule || ''}</div><div class="tiplong">${def.long || ''}</div>`;
    placeTip(anchor);
  }
  function showArtTip(anchor, a) {
    const tip = $('tip');
    tip.innerHTML = `<div class="tipname">${a.name} <span class="tiprare r-${a.rarity}">${a.rarity}</span></div>
      <div class="tiplong">${a.desc}</div><div class="tipflavor">${a.flavor}</div>
      ${a.active ? '<div class="tiprule">' + (a.active.target === 'cell' ? 'click sigil, then a cell' : 'click sigil to invoke') + (a.charges != null ? ' · ' + a.charges + ' left' : '') + '</div>' : ''}`;
    placeTip(anchor);
  }
  function placeTip(anchor) {
    const tip = $('tip');
    tip.classList.remove('hidden');
    const r = anchor.getBoundingClientRect();
    const tr = tip.getBoundingClientRect();
    let x = U.clamp(r.left + r.width / 2 - tr.width / 2, 8, window.innerWidth - tr.width - 8);
    let y = r.top - tr.height - 10;
    if (y < 8) y = r.bottom + 10;
    tip.style.left = x + 'px'; tip.style.top = y + 'px';
  }
  function hideTip() { $('tip').classList.add('hidden'); }

  function cellTip(k, ev, pin) {
    if (!pin && tipPinned) return; /* a pinned tooltip stays until dismissed */
    const tip = $('celltip');
    if (!k || !game) { if (!tipPinned) tip.classList.add('hidden'); return; }
    const c = game.cells.get(k);
    if (!c) { if (!tipPinned) tip.classList.add('hidden'); return; }
    if (pin) tipPinned = true;
    const soil = C().SOILS[c.soil] || C().SOILS.loam;
    let lines = [`<b>${Math.round(c.e * 100)}%</b> entropy · <span class="soiltag">${soil.name}</span>`];
    if (c.pat) {
      const p = c.pat;
      if (p.t === 'flora') {
        /* an emergent flower — read like a haiku of fact: what it eats, what it leaves, where it thrives */
        const sp = game.species && game.species.get(p.sp), D = ['light', 'stone', 'rot'];
        if (sp && sp.compound) {
          /* a coral — read its nature: a union, self-feeding, hardier than either parent */
          lines.push(`<b style="color:${sp.color}">❖ ${sp.name}</b> · a <b>coral</b> — a compound being`);
          lines.push(`<span class="muted">the union of « ${sp.parents ? sp.parents.beast : 'a beast'} » and « ${sp.parents ? sp.parents.flora : 'a flower'} » — symbiogenesis. it feeds itself and builds reef.</span>`);
          lines.push(`<span class="muted">eats <b>${D[sp.ch]}</b>, leaves <b>${D[sp.ex]}</b> · hardy — thrives at ${Math.round(sp.eLo * 100)}–${Math.round(sp.eHi * 100)}% entropy, wider than either parent could bear.</span>`);
        } else if (sp) {
          lines.push(`<b style="color:${sp.color}">❀ ${sp.name}</b> · ${p.est ? 'an established bed' : 'a young pioneer'}`);
          lines.push(`<span class="muted">eats <b>${D[sp.ch]}</b>, leaves <b>${D[sp.ex]}</b> · ${p.fedOk ? 'fed' : 'lean'} · age ${p.age}</span>`);
          lines.push(`<span class="muted">thrives at ${Math.round(sp.eLo * 100)}–${Math.round(sp.eHi * 100)}% entropy — a flower your world dreamed up. prune to cull it.</span>`);
        } else lines.push('a wild flower');
      } else {
        const n = C().PATTERNS[p.t].name;
        const s = p._s || game._sap(c);
        if (p.t === 'moss') lines.push(`${n} · ${p.age < 3 ? 'young' : (s.prod > 0 ? 'producing' : 'mature, idle')}`);
        else if (p.t === 'frond') lines.push(`${n} · depth ${p.depth}`);
        else if (p.t === 'ant') lines.push(`${n} · ${p.pop} foragers`);
        else if (p.t === 'myc') lines.push(`${n} · ${p.links.length} links`);
        else if (p.t === 'heart') lines.push(`${n} · network ${(game.netOf.get(k) || { cells: { size: 1 } }).cells.size}`);
        else lines.push(n);
        /* sap status — the clear story: makes it, or burns it (and is it fed?) */
        if (s.role === 'producer') {
          lines.push(s.prod > 0
            ? `<span class="sapprod">❧ makes ${s.prod.toFixed(1)} sap / turn</span>`
            : `<span class="muted">❧ idle — needs disorder nearby to make sap</span>`);
        } else if (s.role === 'consumer') {
          const fed = p.fed == null ? 1 : p.fed;
          lines.push(fed >= 0.5
            ? `<span class="sapfed">❧ fed ${Math.round(fed * 100)}% · burns ${s.up.toFixed(1)} sap / turn</span>`
            : `<span class="sapstarve">❧ STARVING ${Math.round(fed * 100)}% — wilting</span><br><span class="muted">feed it: a crystal nearby makes sap anywhere; or spring-green (frontier) moss — interior moss & idle ants barely produce</span>`);
        }
        /* synergy = placement bonus, kept distinct from feeding */
        const syn = game._synergy(c);
        if (syn > 1.04) lines.push(`<span class="synup">good neighbors ×${syn.toFixed(2)}${s.role === 'consumer' ? ' (more order once fed)' : ''}</span>`);
        else if (syn < 0.96) lines.push(`<span class="syndown">crowded ×${syn.toFixed(2)}</span>`);
      }
    } else {
      /* empty cell: if a plant tool is held, say plainly whether it can go here */
      if (tool && tool.type === 'plant') {
        const chk = game.canPlant(tool.pt, k);
        lines.push(chk.ok ? `<span class="okp">✓ ${C().PATTERNS[tool.pt].name} can root here</span>` : `<span class="badp">✗ ${chk.why}</span>`);
      }
      lines.push(`<span class="muted">${soil.note}</span>`);
    }
    const b = game.blightAt && game.blightAt(k);
    if (b) lines.push(`<span class="blighttag">${b.kind === 'wisp' ? 'wisp' : 'rot'} · hp ${b.hp}</span>`);
    if (game.aura.get(k)) lines.push('within a crystal aura');
    if (c.trail) lines.push('a remembered path');
    tip.innerHTML = lines.join('<br>');
    tip.classList.remove('hidden');
    /* place above-left of the point so a finger or cursor never covers it */
    const tr = tip.getBoundingClientRect();
    let x = ev.clientX - tr.width - 18;
    if (x < 6) x = ev.clientX + 18;
    let y = ev.clientY - tr.height - 18;
    if (y < 6) y = ev.clientY + 28;
    tip.style.left = U.clamp(x, 6, window.innerWidth - tr.width - 6) + 'px';
    tip.style.top = U.clamp(y, 6, window.innerHeight - tr.height - 6) + 'px';
  }

  /* ───────── event flow ───────── */
  function handleEvents(evs) {
    if (!evs) return;
    R.onTurnEvents(evs);
    for (const e of evs) {
      switch (e.t) {
        case 'income': lastIncome = e.n; break;
        case 'heat':
          hint('heat');
          if (e.insight) toast(`${e.n} order radiated as heat — ${e.insight} condensed into insight ✸`, '', 4200);
          break;
        case 'echo':
          /* bank it immediately — a closed tab must not swallow a murmur */
          if (!meta.echoes.includes(e.idx)) { meta.echoes.push(e.idx); save(); }
          pushOverlay(echoOverlay(e.idx));
          break;
        case 'widenReady':
          if (game.mode === 'longgame') {
            /* in the long game widening is a real, unstated TRADEOFF: a bigger board scores higher but
               breeds more combat, and the meadow becomes ONE only while it stays intimate enough to.
               name the choice (without naming oneness — the discovery is the joy) so it isn't taken blind. */
            toast('the world could widen — more ground, more life. or hold it close: a small, intimate meadow can weave itself into something a vast one never quite becomes. neither is wrong.', 'stage', 8000);
          } else {
            toast('the world strains at its rim — widen it when you are ready.', 'stage', 6000);
            hint('widen');
          }
          break;
        case 'offer': pushOverlay(offerOverlay(e.specs, e.legend), { dismissible: false }); break;
        case 'stageUp': {
          AU.stageUp(); music('stage');
          const st = C().STAGES[e.stage - 1];
          toast(`<b>${st.name}</b> — ${st.blurb}` + (e.unlocks.length ? `<br>unlocked: ${e.unlocks.map(u => C().PATTERNS[u].name).join(', ')}` : ''), 'stage', 6000);
          hint('expand');
          for (const u of e.unlocks) hint(u);
          buildPalette(); /* relock states */
          syncToolClasses();
          break;
        }
        case 'storm': AU.storm(); music('storm'); break;
        case 'blightSpawn': AU.blight(); hint('blight'); toast('rot takes hold — ' + (e.kind === 'wisp' ? 'a wisp drifts in' : 'it will spread'), 'warn', 5000); break;
        case 'starve': hint('starve'); break;
        case 'blightClear': AU.tend(); break;
        case 'stormWarn': $('stormbanner').textContent = 'a squall gathers — ' + (e.inTurns === 1 ? 'next turn' : 'in ' + e.inTurns + ' turns'); $('stormbanner').classList.remove('hidden'); hint('storm'); break;
        case 'cascade': if (e.n >= 2) { AU.cascade(e.n); if (e.n >= 4) { toast(e.n + ' blossoms in one breath', 'good'); music('cascade'); surfaceQuote(); } } break;
        case 'pulse': AU.pulse(); break;
        case 'find':
          if (e.kind === 'fragment') {
            toast('the foragers break into a buried hollow — a <b>relic fragment</b> ✸. your next legendary costs <b>' + e.amount + ' less</b> insight.', 'good', 7000);
            AU.take(); updateHUD();
          } else {
            toast('the foragers unearth « ' + e.name + ' » — a relic. it waits in your rail (◈), ready when you need it.', 'good', 7000);
            AU.take(); buildRail(); flashRail(); meta.codex.push({ n: e.name, r: 'found' });
          }
          break;
        /* the ecology stirs — life your world dreamed up from its own surpluses */
        case 'species':
          toast('a flower opens that no one planted — « <b style="color:' + e.color + '">' + e.name + '</b> », risen from a <b>' + e.diet + '</b> surplus. it eats what your garden makes in excess.', 'good', 7500);
          AU.bloom();
          { const fl = meta.flora || (meta.flora = []);
            if (!fl.some(f => f.name === e.name && f.color === e.color)) { fl.push({ name: e.name, color: e.color, ch: e.ch, born: game ? game.turn : 0 }); save(); } }
          break;
        case 'extinct': toast('« <b style="color:' + e.color + '">' + e.name + '</b> » is gone — its niche closed. it is remembered in the soil.', '', 5500); AU.wither(); break;
        case 'cull': toast('you clear « ' + e.name + ' » — the ground opens again.', '', 3000); break;
        /* megafauna — a beast no one made, summoned by a meadow rich enough to feed it */
        case 'fauna':
          if (e.role === 'pollinator')
            toast('a <b>pollinator</b> drifts in — « <b style="color:' + e.color + '">' + e.name + '</b> » — drawn by a meadow varied enough to need one. it sips the ' + e.eats + ' and carries its kind into open ground: it <b>spreads</b> life rather than eating it. a mutualist — the meadow grows richer for it.', 'good', 9000);
          else if (e.role === 'predator') {
            if (!meta.hints.includes('loreApex')) { meta.hints.push('loreApex'); save();
              toast('an <b>apex</b> appears — « <b style="color:' + e.color + '">' + e.name + '</b> » — drawn by a herd grown big enough to hunt. it culls the ' + e.eats + ', the top of your web at last: predator and prey now <b>cycle</b> — the herd will breathe, rising and culled and rising again, while the meadow holds steady beneath. and its danger carries a strange mercy — a hunted grazer <b>flees into union</b>, merging with its flower sooner. <b>combat drives cooperation.</b>', 'good', 10500); }
            else toast('another <b>apex</b> rises — « <b style="color:' + e.color + '">' + e.name + '</b> » — the herd had grown huntable again.', 'good', 5000);
          }
          else
            toast('a <b>herd</b> walks into the world — « <b style="color:' + e.color + '">' + e.name + '</b> », drawn by a meadow rich enough to feed it. it grazes the ' + e.eats + ' and lives only while the meadow does — and, lived-with long enough, a grazer may become one with its flower (a coral).', 'good', 8500);
          AU.beast();
          { const fl = meta.fauna || (meta.fauna = []);
            if (!fl.some(b => b.name === e.name && b.color === e.color)) { fl.push({ name: e.name, color: e.color, role: e.role || 'grazer', eats: e.eats, born: game ? game.turn : 0 }); save(); } }
          break;
        case 'faunaGone':
          if (e.role === 'predator') { /* the apex didn't outlast its prey — it over-hunted the herd and starved (the cycle's other turn) */
            if (!meta.hints.includes('loreApexGone')) { meta.hints.push('loreApexGone'); save();
              toast('the apex « <b style="color:' + e.color + '">' + e.name + '</b> » is gone — a predator cannot outlast its prey. it thinned the herd faster than the meadow could renew, and starved where they had grazed; but the meadow holds, and in time summons another.', '', 8000); }
            else toast('the apex « <b style="color:' + e.color + '">' + e.name + '</b> » is gone — it outran its prey, and starved. the meadow holds.', '', 5000);
          }
          else
            toast('the « <b style="color:' + e.color + '">' + e.name + '</b> » are gone — the meadow could no longer hold them. remembered.', '', 6000);
          AU.wither(); break;
        case 'predate': if (AU.predate) AU.predate(); break; /* a kill — a sharp strike, no toast (it happens often) */
        case 'autocatalysis':
          toast('the meadow has begun to <b>feed itself</b> — every element its flora eat, some flora now also make. a closed ring of metabolism, woven from diversity alone. <span class="muted">(order, for free — kauffman’s autocatalytic set, emerged.)</span>', 'good', 9000);
          (AU.bloom || AU.echo)();
          break;
        case 'merge':
          toast('the food web does something it has never done — « <b style="color:' + e.color + '">' + e.beast + '</b> » does not eat the « <b style="color:' + e.color + '">' + e.flora + '</b> » it has lived beside so long; it <b>becomes one</b> with it. a new KIND is born — « <b style="color:' + e.color + '">' + e.name + '</b> », a <b>coral</b>: an animal that lay down and became a garden, feeding itself and building reef for the others. <b>symbiogenesis</b> — the union Margulis foresaw, the rarest thing your world can do.', 'good', 12000);
          (AU.merge || AU.beast)();
          { const fl = meta.flora || (meta.flora = []);
            if (!fl.some(f => f.name === e.name)) { fl.push({ name: e.name, color: e.color, ch: e.ch, compound: 1, flora: e.flora, beast: e.beast, born: game ? game.turn : 0 }); save(); } }
          break;
        case 'oneness':
          toast('the meadow has become <b>one</b> — a web of so much union and cooperation that the parts no longer read as parts. a single living thing, breathing. <span class="muted">(' + e.corals + ' unions · ' + e.kinds + ' kinds, woven.)</span>', 'good', 12000);
          (AU.oneness || AU.coalesce)();
          pushOverlay(echoOverlay(25, '— the meadow becomes one —')); /* the long game's quiet awakening — Margulis: a pointillist landscape of tiny living beings */
          break;
        case 'dissolveWarn': toast('the garden thins — coherence below 22% (' + e.streak + '/3)', 'warn', 5200); break;
        case 'dissolved': onDissolved(); break;
        case 'longEnd': onLongEnd(e.score, e.grade); break;
        case 'saved': toast('« ' + e.via + ' » intercedes. the garden holds.', 'good', 6000); buildRail(); break;
        case 'coalesceReady': hint('coalesce'); break;
        case 'demon': break;
        case 'wither': break;
      }
    }
    /* the thesis, made legible: when the garden grows coherent enough that its own order visibly
       quickens the seep (pressure slope ≈ 1 + 1.5·coherence — roughly doubled by here), name the
       tension the player is feeling. it sets up the long game's closing reframe without spoiling it. */
    if (game && game.coherence() > 0.7) hint('orderseep');
    const late = game.takeLateEcho();
    if (late != null) {
      if (!meta.echoes.includes(late)) { meta.echoes.push(late); save(); }
      pushOverlay(echoOverlay(late));
    }
    if (!evs.some(e => e.t === 'stormWarn')) $('stormbanner').classList.add('hidden');
  }

  function afterAction(evs) {
    handleEvents(evs);
    updateHUD();
    R.dirty();
    save();
  }

  function endTurn() {
    if (!game || game.over || processing || overlayOpen) return;
    unpinTip();
    selectTool(null); /* advancing the turn drops the held tool — so a post-turn scroll can't drag-paint by accident */
    processing = true;
    $('endturn').classList.add('breathing');
    /* the whole turn pipeline is guarded: a thrown exception must NEVER leave `processing` stuck
       true (that bricks every click until a refresh). finally always frees it; the catch surfaces
       the fault instead of hiding it, and the core sim already advanced, so recovery is safe. */
    try {
      AU.breath();
      prevC = game.coherence();
      const evs = game.endTurn();
      handleEvents(evs);
      updateHUD();
      R.dirty();
      save();
      /* a voice surfaces on a slow cadence, so the chorus keeps arriving even in a calm garden */
      if (game.turn >= 12 && game.turn % 12 === 0) surfaceQuote();
    } catch (err) {
      console.error('[loophole] turn pipeline error (recovered, the garden continues):', err);
      try { updateHUD(); R.dirty(); } catch (_) { /* even the recovery is optional */ }
    } finally {
      setTimeout(() => { processing = false; $('endturn').classList.remove('breathing'); }, 320);
    }
  }

  /* draw the eye to the rail when something lands there (e.g. a forager find) */
  function flashRail() {
    const r = $('rail'); if (r) { r.classList.remove('flash'); void r.offsetWidth; r.classList.add('flash'); }
    const rb = $('railbtn'); if (rb) { rb.classList.remove('flash'); void rb.offsetWidth; rb.classList.add('flash'); }
  }

  /* ───────── board input ───────── */
  /* apply the held tool to one cell; returns true if something happened.
     light updates only — the caller saves (so a drag saves once at release). */
  let dragging = false, dragActed = false;
  const dragSet = new Set();
  function applyToolAt(k, silent) {
    if (!game || game.over || processing || overlayOpen || !k || !tool) return false;
    let res = null;
    if (tool.type === 'plant') { res = game.plant(tool.pt, k); if (res && res.ok) { AU.plant(tool.pt); hint('firstplant'); /* the missing rung: tell a newcomer to end the turn — the gate to the first "it's alive" moment */ if (tool.pt === 'frond' || tool.pt === 'bloom' || tool.pt === 'heart') hint('sap'); } }
    else if (tool.type === 'tend') { res = game.tend(k); if (res && res.ok) AU.tend(); }
    else if (tool.type === 'prune') { const c = game.cells.get(k); if (!c || !c.pat) return false; res = game.prune(k); if (res && res.ok) AU.prune(); }
    else if (tool.type === 'art') { res = game.useArtifact(tool.i, k); if (res && res.ok) { AU.take(); buildRail(); selectTool(null); } }
    if (res && !res.ok) { if (res.why && !silent) toast(res.why, 'warn'); return false; }
    if (res && res.ok) { handleEvents(res.events); updateHUD(); R.dirty(); return true; }
    return false;
  }
  const canDragTool = () => tool && (tool.type === 'plant' || tool.type === 'tend' || tool.type === 'prune');

  function bindBoard() {
    const wrap = $('boardwrap');
    const local = ev => { const r = wrap.getBoundingClientRect(); return { x: ev.clientX - r.left, y: ev.clientY - r.top }; };
    const cellAtEv = ev => { const p = local(ev); return R.cellAt(p.x, p.y); };

    /* multi-touch: 2 fingers pinch-zoom & pan; 1 finger taps/paints */
    const pointers = new Map();
    let pinch = null, multiTouch = false;
    const endDrag = () => {
      if (!dragging) return;
      dragging = false;
      if (dragActed) save();
      dragActed = false;
    };

    /* a press starts pending; it becomes a tap (on release), a drag (on movement),
       or is cancelled by a second finger (pinch) — so pinch/pan never plant */
    let down = null;
    const DRAG = 9;
    wrap.addEventListener('pointermove', ev => {
      if (!game) return;
      if (pointers.has(ev.pointerId)) pointers.set(ev.pointerId, local(ev));
      if (pinch && pointers.size >= 2) {
        const [a, b] = [...pointers.values()];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        if (pinch.dist > 0) R.zoomAt(mx, my, dist / pinch.dist);
        R.panBy(mx - pinch.mx, my - pinch.my);
        pinch.dist = dist; pinch.mx = mx; pinch.my = my;
        R.dirty();
        return;
      }
      const p = local(ev), k = cellAtEv(ev);
      R.hovered = k;
      cellTip(k, ev);
      R.auraFor = null;
      if (k) {
        const c = game.cells.get(k);
        if (c && ((c.pat && c.pat.t === 'crys') || (tool && tool.type === 'plant' && tool.pt === 'crys'))) R.auraFor = k;
      }
      /* promote a press into a drag once it moves far enough */
      if (down && !dragging && !multiTouch && canDragTool() && Math.hypot(p.x - down.x, p.y - down.y) > DRAG) {
        dragging = true; dragActed = false; dragSet.clear(); unpinTip();
        if (applyToolAt(down.k, false)) dragActed = true;
        dragSet.add(down.k);
        down = null;
      }
      if (dragging && !multiTouch && k && canDragTool() && !dragSet.has(k)) {
        dragSet.add(k);
        if (applyToolAt(k, true)) dragActed = true;
      }
    });
    wrap.addEventListener('pointerleave', () => { R.hovered = null; if (!tipPinned) cellTip(null); });
    wrap.addEventListener('pointerdown', ev => {
      if (R.cinematic) { R.skipCinematic(); return; }
      if (ev.button === 2) return; /* right-click handled by contextmenu */
      const p = local(ev);
      pointers.set(ev.pointerId, p);
      if (pointers.size >= 2) {
        /* second finger: cancel the pending tap, begin a pinch/pan gesture */
        multiTouch = true; dragging = false; dragActed = false; down = null;
        const [a, b] = [...pointers.values()];
        pinch = { dist: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
        return;
      }
      if (multiTouch) return;
      unpinTip();
      const k = cellAtEv(ev);
      if (!k) return;
      down = { k, x: p.x, y: p.y };
      try { wrap.setPointerCapture(ev.pointerId); } catch (e) {}
    });
    const liftPointer = ev => {
      const wasDown = down, wasDragging = dragging, wasMulti = multiTouch;
      pointers.delete(ev.pointerId);
      if (pointers.size < 2) pinch = null;
      if (pointers.size === 0) {
        multiTouch = false;
        if (wasDragging) endDrag();
        else if (wasDown && !wasMulti && !(game && game.over) && !processing && !overlayOpen) {
          /* a clean tap: act if a tool is held, and pin the tooltip so it can be read */
          if (tool) { const acted = applyToolAt(wasDown.k, false); if (acted) save(); }
          cellTip(wasDown.k, ev, true);
        }
        down = null;
      }
    };
    wrap.addEventListener('pointerup', liftPointer);
    wrap.addEventListener('pointercancel', liftPointer);
    /* desktop trackpad / mouse-wheel zoom */
    wrap.addEventListener('wheel', ev => {
      if (!game) return;
      ev.preventDefault();
      const p = local(ev);
      R.zoomAt(p.x, p.y, ev.deltaY < 0 ? 1.12 : 0.89);
      R.dirty();
    }, { passive: false });
    wrap.addEventListener('contextmenu', ev => { ev.preventDefault(); selectTool(null); });
    window.addEventListener('resize', () => { R.layout(); R.dirty(); });
    /* keyboard play: a cell cursor reusing R.hovered for the visible highlight. arrows/WASD step to the
       nearest cell in that screen direction; Enter places the armed tool. (cell detail is available via
       the menu's "entropy values" overlay; a positioned keyboard tooltip is a later refinement.) */
    function moveCursor(dx, dy) {
      if (!game || !R.pos || !R.pos.size) return;
      let curK = R.hovered;
      if (!curK || !R.pos.has(curK)) {
        curK = R.pos.has(HEX.key(0, 0)) ? HEX.key(0, 0) : R.pos.keys().next().value;
        R.hovered = curK; R.dirty(); return;
      }
      const cur = R.pos.get(curK);
      let best = null, bestDist = Infinity;
      for (const [k, p] of R.pos) {
        if (k === curK) continue;
        const vx = p.x - cur.x, vy = p.y - cur.y, dist = Math.hypot(vx, vy);
        if (dist < 1 || (vx * dx + vy * dy) / dist < 0.4) continue; /* must be roughly in the arrow direction */
        if (dist < bestDist) { bestDist = dist; best = k; }
      }
      if (best) { R.hovered = best; R.dirty(); }
    }
    window.addEventListener('keydown', ev => {
      if (ev.key === 'Escape') {
        if (overlayOpen) { if (overlayDismissible) closeOverlay(); return; }
        if (!game || game.over) return; /* the menu belongs to an active garden */
        if (tool) selectTool(null);
        else menuOverlay();
        return;
      }
      if (overlayOpen || !game || game.over) return;
      if (ev.key === ' ') { ev.preventDefault(); endTurn(); return; }
      if (ev.key === 't' || ev.key === 'T') selectTool({ type: 'tend' });
      if (ev.key === 'x' || ev.key === 'X') selectTool({ type: 'prune' });
      for (const t of C().PATTERN_ORDER)
        if (ev.key === C().PATTERNS[t].hotkey) selectTool({ type: 'plant', pt: t });
      const nav = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0], w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0] };
      if (nav[ev.key]) { ev.preventDefault(); moveCursor(nav[ev.key][0], nav[ev.key][1]); }
      else if (ev.key === 'Enter' && R.hovered) { ev.preventDefault(); if (applyToolAt(R.hovered, false)) save(); }
    });
    document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
  }

  /* ───────── menus & screens ───────── */
  function captionImage(ctx, W, H) {
    /* close the transmission chain: a stranger who sees this saved picture on social can learn what it is
       and grow the SAME garden — the seed makes the same world twice, so it travels with the image. kept
       subtle: the garden is the star, this is a quiet footer over a faint scrim. */
    const pad = Math.round(W * 0.024), fs = Math.max(13, Math.round(W * 0.0162));
    const grad = ctx.createLinearGradient(0, H - fs * 4.5, 0, H);
    grad.addColorStop(0, 'rgba(8,6,5,0)'); grad.addColorStop(1, 'rgba(8,6,5,0.62)');
    ctx.fillStyle = grad; ctx.fillRect(0, H - fs * 4.5, W, fs * 4.5);
    ctx.font = `${fs}px "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif`;
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(234,228,214,0.74)';
    ctx.fillText('loophole · a thermodynamic garden', pad, H - pad);
    ctx.textAlign = 'right';
    const base = location.protocol === 'file:' ? '' : (location.host + location.pathname).replace(/index\.html$/, '').replace(/\/+$/, '/');
    ctx.fillStyle = 'rgba(234,228,214,0.62)';
    ctx.fillText((base ? base + '   ·   ' : '') + 'seed ' + (game ? game.seed : ''), W - pad, H - pad);
  }
  function gardenCanvas() {
    /* the composited, captioned garden — opaque board (paints its own dark) + live FX + the transmission
       footer. shared by saveImage (download) and shareGarden (native share). same-origin + wholly
       procedural, so the canvas is not tainted and toBlob succeeds. */
    const board = $('board'), fx = $('fx');
    if (!board) return null;
    const out = document.createElement('canvas');
    out.width = board.width; out.height = board.height;
    const ctx = out.getContext('2d');
    ctx.drawImage(board, 0, 0);
    if (fx) ctx.drawImage(fx, 0, 0);
    captionImage(ctx, out.width, out.height); /* identity + reproducible seed, so the picture can find its way home */
    return out;
  }
  function saveImage() {
    /* a garden is a unique procedural image — let the player keep it, as a PNG download. */
    const out = gardenCanvas();
    if (!out) return;
    out.toBlob(blob => {
      if (!blob) { toast('the image could not be captured', 'warn'); return; }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'loophole-' + (game ? game.seed : 'garden') + '.png';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      toast('your garden, saved as an image', '', 3500);
    });
  }
  function shareURL() {
    /* a seed makes the same world twice — so a link carrying it grows this exact garden for anyone */
    return location.origin + location.pathname + '?seed=' + encodeURIComponent(game.seed) + (game.mode === 'longgame' ? '&mode=longgame' : '');
  }
  async function shareGarden() {
    const url = shareURL();
    /* prefer the native share sheet (where it exists — chiefly mobile): the player's ACTUAL captioned
       garden image travels with a word and the seed-link, to any app, in one tap. the toBlob finishes
       well within the click's transient-activation window, so the sheet still opens; and the image
       footer already carries the url+seed, so even a platform that drops the text leads home. on
       desktop (no Web Share) it falls back to copying the link, exactly as before. */
    if (navigator.share) {
      const title = 'loophole — a thermodynamic garden';
      const text = 'a garden i grew — entropy, life, and a meadow that wakes up';
      try {
        const out = gardenCanvas();
        const blob = out && await new Promise(res => out.toBlob(res));
        const file = blob && typeof File !== 'undefined' && new File([blob], 'loophole-' + game.seed + '.png', { type: 'image/png' });
        if (file && navigator.canShare && navigator.canShare({ files: [file] })) await navigator.share({ title, text: text + ' — ' + url, files: [file] });
        else await navigator.share({ title, text, url });
        return;
      } catch (e) { if (e && e.name === 'AbortError') return; /* user cancelled the sheet; any other failure → fall through to copy */ }
    }
    const fall = () => toast('share this seed to grow this world: ' + game.seed, '', 7000);
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(() => toast('a link to this exact garden is on your clipboard — share a world', '', 4500), fall);
    else fall();
  }

  function menuOverlay() {
    pushOverlay(panelOverlay(`
      <div class="paneltitle">a moment of stillness</div>
      <div class="menulist">
        <button id="m-resume">return to the garden</button>
        <button id="m-story">the story so far</button>
        <button id="m-help">how it works</button>
        <button id="m-murmurs">murmurs (${meta.echoes.length}/24)</button>
        <button id="m-sound">sound: ${meta.muted ? 'off' : 'on'}</button>
        <button id="m-values">entropy values: ${meta.values ? 'shown' : 'hidden'}</button>
        <button id="m-flashes">reduce flashes &amp; shake: ${meta.reduceFlashes ? 'on' : 'off'}</button>
        <button id="m-share">share this garden</button>
        <button id="m-save">save this garden as an image</button>
        <button id="m-abandon" class="danger">let this garden go</button>
      </div>`, {
      wire(box, close) {
        box.querySelector('#m-resume').onclick = close;
        box.querySelector('#m-story').onclick = () => { close(); pushOverlay(statsOverlay()); };
        box.querySelector('#m-help').onclick = () => { close(); helpOverlay(); };
        box.querySelector('#m-murmurs').onclick = () => { close(); murmursOverlay(); };
        box.querySelector('#m-sound').onclick = () => { AU.setMuted(!meta.muted); close(); };
        box.querySelector('#m-values').onclick = () => { meta.values = !meta.values; R.valuesMode = meta.values; save(); close(); };
        box.querySelector('#m-flashes').onclick = () => { meta.reduceFlashes = !meta.reduceFlashes; R.reduceFlashes = meta.reduceFlashes; save(); close(); toast(meta.reduceFlashes ? 'storms will be gentler — softer flash, steady lightning, less shake' : 'full storm visuals restored', '', 4000); };
        box.querySelector('#m-share').onclick = () => { shareGarden(); close(); };
        box.querySelector('#m-save').onclick = () => { saveImage(); close(); };
        box.querySelector('#m-abandon').onclick = () => { close(); if (game) game.over = true; store.run = null; save(); showTitle(); };
      }
    }));
  }

  function helpOverlay() {
    const pats = C().PATTERN_ORDER.map(t => {
      const d = C().PATTERNS[t];
      return `<div class="helppat"><b>${d.name}</b> <span class="muted">✦${d.cost} · stage ${C().roman(d.stage - 1)}</span><br>${d.rule}</div>`;
    }).join('');
    const soils = C().SOIL_ORDER.map(s => `<b>${C().SOILS[s].name}</b> — ${C().SOILS[s].note}`).join('<br>');
    pushOverlay(panelOverlay(`
      <div class="paneltitle">how it works</div>
      <div class="helpbody">
        <p>every turn, entropy seeps in — from the rim, from the air, sometimes in squalls. grey is disorder; color is order. <b>coherence</b> is how much of the board now holds together.</p>
        <p>spend <b>✦ order</b> to plant living patterns. they replicate, link, eat, bloom, and pay for themselves — find the combinations that run away on their own. drag to plant or tend a whole swath; planting onto moss simply builds over it. <span class="muted">(on a phone: pinch to zoom, two fingers to pan.)</span></p>
        <p>watch your moss: <b>spring-green</b> moss sits on a frontier and is paying you; <b>dark-green</b> moss has cleaned out its surroundings and gone quiet. keep moss where the gradient is.</p>
        <p><b>the metabolism.</b> living patterns run on <b>❧ sap</b>. <b>producers</b> make it — moss (on a gradient), ant colonies (from the disorder they eat), crystals. <b>consumers</b> burn it — fronds, blooms, the heartwood. <b>mycelium is the grid</b> that carries sap from producers to consumers; a consumer with no supply <b>starves and wilts</b> (it pulses red). the HUD <b>❧</b> shows your net flow: a surplus feeds order, a deficit means someone's going hungry. balance the ratio — that's the game beneath the game.</p>
        <p>and you cannot simply idle: the more order you hold, the steeper its pull on the surrounding dark, so a rich garden seeps faster. a built garden holds a plateau — to climb past it, and to weave the waking, you must keep tending.</p>
        <p><b>read the land.</b> each cell sits on a soil that bends the rules — plant fronds in the wet, crystals on stone, ants and moss on the ash. and patterns earn by their <b>neighbors</b>: a frond sheltered by moss, anchored by crystal, plumbed into mycelium pays several times a lonely one. hover any cell to see its soil and how it’s faring.</p>
        <p><b>don’t hoard.</b> order above a soft cap radiates away as heat — but some of that heat condenses into <b>✸ insight</b>. spend insight in <b>« cultivate »</b> on cultivars and extra <b>hands</b> that plant 2–3 at once.</p>
        <p><b>rot</b> spreads from the frontier and gnaws your patterns. tend it to wound it, foragers devour it, crystal auras corrode it — or wall it off and starve it. clearing it pays insight.</p>
        <p>reach a stage’s coherence target and a golden choice appears: <b>let the world widen</b>. new ground arrives wild, pressure rises, a new pattern unlocks. you choose when — but a stalled garden invites the dark. if coherence stays under 22% for three turns, the stream takes the garden back.</p>
        <p><b>the long game.</b> choose it on the new-garden screen and there is no single waking — you tend a world toward turn 100, scored on how <i>alive</i> it becomes. and life you never planted begins to <b>arise on its own</b>: when your garden over-produces an element — light, stone, or rot (the coloured bars in the metabolism panel) — a <b>flower</b> is summoned that eats the excess, wearing its diet as its colour. survivors <b>establish into beds</b>, so leave them <b>open ground</b> to spread into. and when a meadow grows rich and varied enough, a grazing <b>beast</b> walks in to feed on it — and lives only while the meadow does. point at anything to read what it is; the murmurs keep a journal of every species your worlds have dreamed up.</p>
        ${pats}
        <div class="helppat"><b>soils</b><br><span class="muted">${soils}</span></div>
        <p class="muted">tend (T) · prune (X, refunds) · space ends the turn · right-click clears your hand · 1–7 select patterns · artifacts live on the right — some want clicking.</p>
        <p class="muted">moss pays only beside disorder. ants starve in paradise. keep a frontier; you are not here to finish the world, only to keep it waking.</p>
      </div>`, { wide: true }));
  }

  function murmursOverlay() {
    const items = [];
    for (let i = 0; i < 24; i++) {
      if (meta.echoes.includes(i)) {
        const { body, by } = splitMurmur(C().ECHOES[i]);
        const cite = by ? `<div class="murmurcite">— ${by}</div>` : '';
        items.push(`<div class="murmur"><span class="mnum">${C().roman(i)}</span>${body.replace(/\n/g, '<br>')}${cite}</div>`);
      } else items.push(`<div class="murmur locked"><span class="mnum">${C().roman(i)}</span>· · ·</div>`);
    }
    const seen = [...new Set(meta.codex.map(a => a.n))];
    const codex = seen.length
      ? `<div class="codexhead">artifacts encountered · ${seen.length}</div><div class="codexlist">${seen.slice(0, 60).map(n => `<span class="endart">${n}</span>`).join(' ')}</div>`
      : '';
    const QA = C().QUOTES || [];
    const voices = (meta.quotes || []).slice().sort((a, b) => a - b);
    const voicesHTML = `<div class="codexhead">voices in the soil · ${voices.length}/${QA.length}</div>` +
      (voices.length
        ? `<div class="voicelist">${voices.map(i => `<div class="voice">“${QA[i].q}”<div class="murmurcite">— ${QA[i].by}</div></div>`).join('')}</div>`
        : `<div class="muted">real human words, gathered as you play. none yet — they surface at cascades, rites, and the slow turning of the seasons.</div>`);
    const allFlora = meta.flora || [], DIET = ['light', 'stone', 'rot'];
    const flora = allFlora.filter(f => !f.compound), corals = allFlora.filter(f => f.compound);
    const floraHTML = `<div class="codexhead">life witnessed · ${flora.length}</div>` +
      (flora.length
        ? `<div class="muted" style="margin-bottom:7px">a flower wears its <b>diet</b> — <span style="color:#d4e878">chartreuse eats light</span> · <span style="color:#78c8ec">cyan eats stone</span> · <span style="color:#ce7ad4">violet eats rot</span> · blends between.</div>
           <div class="codexlist">${flora.slice(0, 80).map(f => `<span class="endart" style="border-color:${f.color}99;color:${f.color}" title="eats ${DIET[f.ch] || '?'}">❀ ${f.name}</span>`).join(' ')}</div>`
        : `<div class="muted">flora your worlds dream up — summoned by what you leave in surplus, in the long game. none yet. point at one to read what it eats; its colour is its diet.</div>`);
    /* the UNIONS — symbiogenesis made legible: each coral names the two it was born from */
    const coralHTML = corals.length
      ? `<div class="codexhead">unions · ${corals.length}</div>
         <div class="muted" style="margin-bottom:7px">a grazer and the flower it lived beside, become <b>one</b> — a <b>coral</b> (symbiogenesis). a kind neither was: self-feeding, reef-building.</div>
         <div class="codexlist">${corals.slice(0, 40).map(c => `<span class="endart" style="border-color:${c.color}99;color:${c.color}">❖ ${c.name}${c.beast && c.flora ? ` <span class="muted" style="font-size:.82em">· ${c.beast} ⊕ ${c.flora}</span>` : ''}</span>`).join(' ')}</div>`
      : '';
    /* the FAUNA split by role — so the web reads as a web: who grazes, who pollinates, who hunts */
    const fauna = meta.fauna || [];
    const ROLES = [
      { k: 'grazer', head: 'herds · the grazers', mark: '❦', note: 'herbivores a rich meadow summons — some, lived-with long enough, lie down as coral.' },
      { k: 'pollinator', head: 'mutualists · the pollinators', mark: '✦', note: 'they spread life rather than eat it — networking, not combat (Margulis).' },
      { k: 'predator', head: 'apex · the cullers', mark: '⊿', note: 'the top of your web — they cull the herd, and their fear drives the prey into union.' },
    ];
    const faunaHTML = fauna.length
      ? ROLES.map(r => { const grp = fauna.filter(b => (b.role || 'grazer') === r.k); return grp.length
          ? `<div class="codexhead">${r.head} · ${grp.length}</div><div class="muted" style="margin-bottom:7px">${r.note}</div><div class="codexlist">${grp.slice(0, 60).map(b => `<span class="endart" style="border-color:${b.color}99;color:${b.color}">${r.mark} ${b.name}</span>`).join(' ')}</div>`
          : ''; }).join('')
      : '';
    pushOverlay(panelOverlay(`
      <div class="paneltitle">murmurs</div>
      <div class="murmurlist">${items.join('')}</div>
      <div class="muted center">${meta.echoes.length < 24 ? 'the rest are still in the soil. they surface as you play.' : 'all of it, gathered. thank you for listening.'}</div>
      ${floraHTML}
      ${coralHTML}
      ${faunaHTML}
      ${voicesHTML}
      ${codex}`,
      { wide: true }));
  }

  /* the metabolism at a glance — what's making and burning sap right now */
  /* the metabolism, as an HTML fragment (a tab of the garden-state panel) */
  function metabHTML() {
    const roles = {};
    for (const c of game.cells.values()) {
      if (!c.pat || c.pat.t === 'flora') continue; /* flora live on the element economy, not the scalar sap one */
      const s = c.pat._s || game._sap(c);
      const r = roles[c.pat.t] || (roles[c.pat.t] = { n: 0, prod: 0, up: 0, name: C().PATTERNS[c.pat.t].name });
      r.n++; r.prod += s.prod; r.up += s.up;
    }
    let starve = 0;
    for (const n of game.networks) if (n.fedRatio < 0.5) starve++;
    const prod = game.sapProduced || 0, up = game.sapUpkeep || 0, net = prod - up;
    const rows = C().PATTERN_ORDER.filter(t => roles[t]).map(t => {
      const r = roles[t];
      const v = (r.prod > 0 ? `<span class="sapprod">+${r.prod.toFixed(1)}</span>` : '') + (r.up > 0 ? ` <span class="sapstarve">−${r.up.toFixed(1)}</span>` : '') || '<span class="muted">—</span>';
      return `<div>${r.name} ×${r.n}</div><div>${v} ❧</div>`;
    }).join('') || '<div class="muted">nothing planted yet</div><div></div>';
    return `<p class="evointro">living patterns run on <b>❧ sap</b>. <b>producers</b> — moss on a gradient, ant colonies, crystals — make it. <b>consumers</b> — fronds, blooms, heartwood — burn it. <b>mycelium</b> carries sap from one to the other. surplus sap becomes ✦ order; a shortfall starves your consumers, and they wilt.</p>
      <div class="statgrid">
        <div>sap produced</div><div class="sapprod">+${prod.toFixed(1)} ❧</div>
        <div>sap consumed</div><div class="sapstarve">−${up.toFixed(1)} ❧</div>
        <div>net flow</div><div>${(net >= 0 ? '+' : '') + net.toFixed(1)} ❧ ${net >= 0 ? '(surplus → order)' : '(deficit — feeding cuts in)'}</div>
        <div>networks</div><div>${game.networks.length}${starve ? ' · ' + starve + ' starving' : ''}</div>
      </div>
      <div class="codexhead">by pattern</div>
      <div class="statgrid metabgrid">${rows}</div>${elemBars()}`;
  }
  /* the element economy (long game) — what your garden over-produces is what life eats.
     makes the birth toast's "risen from a light surplus" something you can actually SEE. */
  function elemBars() {
    if (!game || game.mode !== 'longgame') return '';
    const E = game.elemProd || [0, 0, 0];
    const names = ['light', 'stone', 'rot'], cols = ['#d4e878', '#78c8ec', '#ce7ad4'];
    const max = Math.max(1, E[0], E[1], E[2]);
    const bars = E.map((v, e) => `<div class="ebar"><span class="elabel" style="color:${cols[e]}">${names[e]}</span><span class="etrack"><span class="efill" style="width:${Math.round(v / max * 100)}%;background:${cols[e]}"></span></span><span class="eval">${v.toFixed(1)}</span></div>`).join('');
    return `<div class="codexhead">the elements · what life eats</div><div class="ebars">${bars}</div>
      <p class="evointro" style="margin-top:8px">flowers are summoned by what you <b>over-produce</b>: an excess of one element opens a niche for life that eats it. (moss makes light · crystals stone · ants rot.)</p>`;
  }

  /* friendly names for the hidden mod keys — so compounding reads in plain words */
  const MODLABELS = {
    mossIncome: 'moss sap', frondIncome: 'frond yield', heartIncome: 'heartwood yield', crysSap: 'crystal sap',
    ambientSap: 'ambient sap', mossPower: 'moss cleansing', frondMaxDepth: 'frond max depth', frondGrowGate: 'frond comfort',
    antRange: 'forager range', antPopMax: 'colony size', antEat: 'forager appetite', antFindChance: 'forager luck',
    mycLinkMax: 'mycelium links', mycRange: 'mycelium reach', netSmooth: 'network sharing', mossSpreadEvery: 'moss spread delay',
    pressure: 'entropy pressure', orderSeep: 'order seep', baseIncome: 'base income', incomeAll: 'all income', costAll: 'build cost',
    pruneRefund: 'prune refund', hands: 'extra hands', tendCost: 'tend cost', tendPower: 'tend power', tendRefund: 'tend refund',
    orderCapMul: 'order cap', orderCap: 'order cap', legendCostMul: 'legendary cost', crysRadius: 'crystal aura', crysAura: 'crystal calm',
    bloomBirthE: 'bloom hardiness', bloomOrder: 'bloom order', echoCap: 'murmur cap', echoOrder: 'murmur order',
  };
  /* walk relics + cultivars, accumulate every mod they touch, remember who gave it */
  function kitData(g) {
    const mods = {};
    const note = (src, m) => {
      if (!m) return;
      for (const k in (m.add || {})) { const e = mods[k] || (mods[k] = { add: 0, mul: 1, src: [] }); e.add += m.add[k]; e.src.push(src); }
      for (const k in (m.mul || {})) { const e = mods[k] || (mods[k] = { add: 0, mul: 1, src: [] }); e.mul *= m.mul[k]; e.src.push(src); }
    };
    g.artifacts.forEach(a => note(a.name, a.mods));
    g.evolutions.forEach(id => { const e = C().EVOLUTIONS[id]; if (e) note(e.name, e.mods); });
    return mods;
  }
  /* the kit: relics, cultivars, what's grown, and how it all compounds (with sources) */
  function kitHTML() {
    const g = game;
    const fmt = n => { const r = Math.round(n * 100) / 100; return String(r); };
    const arts = g.artifacts.length
      ? g.artifacts.map(a => `<div class="kititem r-${a.rarity}"><b>${a.name}</b> <span class="kitrar">${a.rarity}</span><div class="kitdesc">${a.desc}</div></div>`).join('')
      : '<div class="muted">none yet — the garden offers as you grow</div>';
    const evos = g.evolutions.length
      ? g.evolutions.map(id => { const e = C().EVOLUTIONS[id]; return `<div class="kititem"><b>${e.name}</b><div class="kitdesc">${e.desc}</div></div>`; }).join('')
      : '<div class="muted">none yet — spend ✸ insight in cultivate</div>';
    const counts = {};
    for (const c of g.cells.values()) if (c.pat) counts[c.pat.t] = (counts[c.pat.t] || 0) + 1;
    const grown = C().PATTERN_ORDER.filter(t => counts[t]).map(t => `<div>${C().PATTERNS[t].name}</div><div>×${counts[t]}</div>`).join('') || '<div class="muted">nothing yet</div><div></div>';
    const mods = kitData(g);
    const keys = Object.keys(mods).sort((a, b) => (MODLABELS[a] || a).localeCompare(MODLABELS[b] || b));
    const modRows = keys.length ? keys.map(k => {
      const m = mods[k];
      const label = MODLABELS[k] || k.replace(/([A-Z])/g, ' $1').toLowerCase();
      let eff = '';
      if (m.mul !== 1) eff += '×' + fmt(m.mul);
      if (m.add !== 0) eff += (eff ? ' ' : '') + (m.add > 0 ? '+' : '') + fmt(m.add);
      const src = [...new Set(m.src)].join(' · ');
      return `<div class="kitmod"><span class="kmlabel">${label}</span><span class="kmval">${eff}</span><span class="kmsrc">← ${src}</span></div>`;
    }).join('') : '<div class="muted">no bonuses yet — claim relics and cultivars and they stack here</div>';
    return `<p class="evointro">everything you've claimed, and how it compounds. <b>relics</b> bend rules; <b>cultivars</b> tune the numbers; together they are your build. ✸ ${g.insight} insight in hand${g.legendDiscount ? ` · −${g.legendDiscount} foraged toward a legendary` : ''}.</p>
      <div class="codexhead">relics · ${g.artifacts.length}</div><div class="kitlist">${arts}</div>
      <div class="codexhead">cultivars · ${g.evolutions.length}</div><div class="kitlist">${evos}</div>
      <div class="codexhead">grown</div><div class="statgrid metabgrid">${grown}</div>
      <div class="codexhead">compounding</div><div class="kitmods">${modRows}</div>`;
  }

  /* the garden-state panel: metabolism + kit, tabbed */
  function gardenStateOverlay(tab) {
    tab = tab || 'metab';
    return (wrap, close) => {
      const box = el('div', 'panelbox wide');
      const x = el('button', 'closex', '×'); x.onclick = close;
      box.appendChild(x);
      box.appendChild(el('div', 'paneltitle', 'state of the garden'));
      const bar = el('div', 'tabbar');
      const content = el('div', 'tabcontent');
      const render = () => {
        bar.innerHTML = '';
        [['metab', 'the metabolism'], ['kit', 'the kit']].forEach(([id, label]) => {
          const t = el('button', 'tab' + (tab === id ? ' on' : ''), label);
          t.onclick = () => { tab = id; render(); };
          bar.appendChild(t);
        });
        content.innerHTML = tab === 'metab' ? metabHTML() : kitHTML();
      };
      box.appendChild(bar); box.appendChild(content);
      render();
      wrap.appendChild(box);
    };
  }
  /* back-compat alias */
  function metabOverlay() { return gardenStateOverlay('metab'); }

  /* the story so far — line graphs of the run over time */
  function statsOverlay() {
    return (wrap, close) => {
      const box = el('div', 'panelbox wide');
      const x = el('button', 'closex', '×'); x.onclick = close; box.appendChild(x);
      box.appendChild(el('div', 'paneltitle', 'the story so far'));
      const series = (game && game.series) || [];
      if (series.length < 2) {
        box.appendChild(el('div', 'evointro', 'not enough has happened yet. play a few turns and look again.'));
        wrap.appendChild(box); return;
      }
      const legend = el('div', 'statlegend');
      legend.innerHTML = `<span class="lg lg-c">coherence</span><span class="lg lg-o">order</span><span class="lg lg-p">patterns</span><span class="lg lg-b">blight</span>`;
      box.appendChild(legend);
      const cv = el('canvas', 'statcanvas');
      box.appendChild(cv);
      wrap.appendChild(box);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const W = box.clientWidth - 60, H = 240;
      cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px';
      const cx = cv.getContext('2d'); cx.scale(dpr, dpr);
      const padL = 34, padR = 10, padT = 12, padB = 22;
      const t0 = series[0][0], t1 = series[series.length - 1][0];
      const xAt = t => padL + (W - padL - padR) * (t1 > t0 ? (t - t0) / (t1 - t0) : 0);
      const yAt = (v, max) => H - padB - (H - padT - padB) * (max > 0 ? Math.min(1, v / max) : 0);
      /* gridlines */
      cx.strokeStyle = 'rgba(120,110,95,0.15)'; cx.lineWidth = 1;
      for (let i = 0; i <= 4; i++) { const y = padT + (H - padT - padB) * i / 4; cx.beginPath(); cx.moveTo(padL, y); cx.lineTo(W - padR, y); cx.stroke(); }
      cx.fillStyle = 'rgba(154,143,124,0.7)'; cx.font = '10px ui-monospace, monospace'; cx.textAlign = 'right';
      cx.fillText('turn ' + t0, xAt(t0) + 20, H - 8); cx.textAlign = 'right'; cx.fillText('turn ' + t1, W - padR, H - 8);
      const maxOrder = Math.max(10, ...series.map(s => s[2]));
      const maxPat = Math.max(4, ...series.map(s => s[3]));
      const maxBlight = Math.max(4, ...series.map(s => s[4]));
      const line = (sel, max, col, w) => {
        cx.strokeStyle = col; cx.lineWidth = w || 2; cx.beginPath();
        series.forEach((s, i) => { const x = xAt(s[0]), y = yAt(sel(s), max); i ? cx.lineTo(x, y) : cx.moveTo(x, y); });
        cx.stroke();
      };
      line(s => s[4], maxBlight, 'rgba(184,154,210,0.85)', 1.6);  /* blight */
      line(s => s[3], maxPat, 'rgba(124,158,87,0.9)', 1.6);       /* patterns */
      line(s => s[2], maxOrder, 'rgba(230,200,106,0.9)', 1.6);    /* order */
      line(s => s[1] / 1000, 1, 'rgba(207,230,164,1)', 2.4);      /* coherence (0..1) */
      /* target line for coherence */
      const tgt = game.target();
      if (tgt != null) { cx.strokeStyle = 'rgba(230,200,106,0.4)'; cx.setLineDash([4, 4]); cx.lineWidth = 1; const y = yAt(tgt, 1); cx.beginPath(); cx.moveTo(padL, y); cx.lineTo(W - padR, y); cx.stroke(); cx.setLineDash([]); }
      box.appendChild(el('div', 'evointro', `peak coherence ${Math.round(game.stats.peakC * 100)}% · ${game.stats.blightCleared || 0} rot cleared · ${game.stats.spilled || 0} order radiated · ${game.stats.eaten.toFixed(0)} entropy devoured`));
    };
  }

  /* rites — expensive board-scale activations; a home for large order */
  function ritesOverlay() {
    return (wrap, close) => {
      const box = el('div', 'panelbox');
      const x = el('button', 'closex', '×'); x.onclick = close; box.appendChild(x);
      wrap.appendChild(box);
      const R = C().RITES;
      const render = () => {
        let html = `<div class="paneltitle">rites</div>
          <div class="evointro">powerful workings, paid in ✦ order. when the garden is rich, spend it boldly.</div>`;
        for (const id of C().RITE_ORDER) {
          const r = R[id];
          const chk = game.canRite(id);
          const cls = chk.ok ? 'buyable' : 'locked';
          const cost = game.riteCost(id);
          const tag = r.stage > game.stage ? 'stage ' + C().roman(r.stage - 1) : '✦' + cost;
          /* locked despite right stage AND affordable means it's gated on something the player can act on
             (genesis needs calm open ground) — name it, so the grey button isn't a silent mystery */
          const gateWhy = (!chk.ok && r.stage <= game.stage && game.order >= cost) ? chk.why : null;
          html += `<div class="evonode riteNode ${cls}" data-id="${id}">
            <div class="en-top"><span class="en-name">${r.glyph} ${r.name}</span><span class="en-cost">${tag}</span></div>
            <div class="en-desc">${r.desc}${gateWhy ? ` <em>— ${gateWhy}</em>` : ''}</div></div>`;
        }
        box.innerHTML = html; box.appendChild(x);
        box.querySelectorAll('.evonode.buyable').forEach(n => {
          n.onclick = () => {
            const res = game.invokeRite(n.dataset.id);
            if (res.ok) { AU.take(); music('cascade'); toast(R[n.dataset.id].name + ' — invoked', 'good'); afterAction(res.events); surfaceQuote(); render(); }
            else if (res.why) toast(res.why, 'warn');
          };
          keyable(n);
        });
      };
      render();
    };
  }

  /* the evolution tree — spend insight on cultivars and extra hands */
  function evolveOverlay() {
    return (wrap, close) => {
      const box = el('div', 'panelbox wide');
      const x = el('button', 'closex', '×'); x.onclick = close; box.appendChild(x);
      wrap.appendChild(box);
      const EV = C().EVOLUTIONS;
      const render = () => {
        let html = `<div class="evohead"><div class="paneltitle" style="margin:0">cultivate</div>
          <div class="evosub">✸ <b>${game.insight}</b> insight</div></div>
          <div class="evointro">insight gathers from milestones — and condenses from the order you let radiate as heat. spend it to bend the rules for the rest of this garden.</div>`;
        for (const br of C().EVO_ORDER) {
          const ids = Object.keys(EV).filter(id => EV[id].branch === br);
          if (!ids.length) continue;
          html += `<div class="evobranch"><div class="evobranchname">${C().EVO_BRANCH[br]}</div><div class="evorow">`;
          for (const id of ids) {
            const e = EV[id];
            const owned = game.evolutions.includes(id);
            const chk = game.canEvolve(id);
            const cls = owned ? 'owned' : (chk.ok ? 'buyable' : 'locked');
            const tag = owned ? 'grown' : (chk.ok ? '✸' + e.cost : (e.req && !game.evolutions.includes(e.req) ? 'needs ' + EV[e.req].name : '✸' + e.cost));
            html += `<div class="evonode ${cls}" data-id="${id}">
              <div class="en-top"><span class="en-name">${e.name}</span><span class="en-cost">${tag}</span></div>
              <div class="en-desc">${e.desc}</div></div>`;
          }
          html += `</div></div>`;
        }
        box.innerHTML = html;
        box.appendChild(x);
        box.querySelectorAll('.evonode.buyable').forEach(n => {
          n.onclick = () => {
            const res = game.evolve(n.dataset.id);
            if (res.ok) { AU.take(); toast('« ' + EV[n.dataset.id].name + ' » takes root', 'good'); buildPalette(); updateHUD(); save(); render(); }
            else if (res.why) toast(res.why, 'warn');
          };
          keyable(n);
        });
      };
      render();
    };
  }

  function statsHTML(g) {
    const p = g.stats.planted;
    const arts = g.artifacts.map(a => `<span class="endart r-${a.rarity}">${a.name}</span>`).join(' ') || '<span class="muted">none</span>';
    const evos = g.evolutions.map(id => `<span class="endart">${C().EVOLUTIONS[id].name}</span>`).join(' ');
    return `
      <div class="statgrid">
        <div>turns</div><div>${g.turn}</div>
        <div>peak coherence</div><div>${Math.round(g.stats.peakC * 100)}%</div>
        <div>planted</div><div>${Object.keys(p).map(k => p[k] + ' ' + k).join(', ') || '—'}</div>
        <div>entropy devoured by ants</div><div>${g.stats.eaten.toFixed(1)}</div>
        <div>rot cleared</div><div>${g.stats.blightCleared || 0}</div>
        <div>order radiated as heat</div><div>${g.stats.spilled || 0}</div>
        <div>blossoms born</div><div>${g.stats.blooms}${g.stats.cascadeBest >= 3 ? ' (best cascade ' + g.stats.cascadeBest + ')' : ''}</div>
        <div>widest network</div><div>${g.stats.netBest} cells</div>
        <div>murmurs surfaced</div><div>${g.echoesThisRun}</div>
      </div>
      ${evos ? '<div class="endarts">' + evos + '</div>' : ''}
      <div class="endarts">${arts}</div>
      <div class="muted center">seed · ${g.seed}${g.asc ? ' · difficulty ' + g.asc : ''}</div>`;
  }

  function onDissolved() {
    AU.dissolved(); music('dissolve');
    meta.runs++;
    store.run = null; save();
    setTimeout(() => pushOverlay((wrap, close) => {
      const box = el('div', 'panelbox endbox');
      box.innerHTML = `
        <div class="paneltitle">the stream takes it back</div>
        <p class="endnote">nothing is lost that was ever only borrowed. the murmurs you found are still yours.<br>the loophole is patient.</p>
        ${statsHTML(game)}
        <div class="endbtns">
          <button id="e-again">begin again</button>
          <button id="e-replant" class="ghostbtn">replant this seed</button>
          <button id="e-title" class="ghostbtn">title</button>
        </div>`;
      box.querySelector('#e-again').onclick = () => { close(); newRun(); };
      box.querySelector('#e-replant').onclick = () => { close(); newRun(game.seed); };
      box.querySelector('#e-title').onclick = () => { close(); showTitle(); };
      wrap.appendChild(box);
    }, { dismissible: false }), 900);
  }

  /* the long game's ending: turn 100, a flourish score, no single awakening */
  function onLongEnd(score, grade) {
    AU.coalesce(); music('coalesce');
    meta.runs++; meta.wins++;
    if (meta.bestFlourish == null || score > meta.bestFlourish) meta.bestFlourish = score;
    store.run = null; save();
    const g = game;
    const rows = g.flourishBreakdown().map(([label, val]) => `<div>${label}</div><div>+${val}</div>`).join('');
    const best = meta.bestFlourish;
    /* the closing thought — the thermodynamic capstone. the player spent the game building ORDER against
       the second law; here the loophole resolves: a living world runs the gradient DOWN faster than the
       bare rock it rose from (Schneider & Kay), so the order served the disorder. there is no outside —
       the inside, alive, IS how the fire burns. (callbacks the anthology's Heraclitus + the premise.) */
    const becameOne = !!(g.firedOcc && g.firedOcc.oneness);
    const closing = becameOne
      ? 'you grew order against the second law for a hundred turns — and a meadow that became <b>one</b> is the law at its most alive: a single dissipating whole, an ever-living fire kindling and going out in measures, spending the gradient as fast as anything ever has. you never cheated the slope. you became the most beautiful way down it. there was never an outside.'
      : 'you grew order against the second law for a hundred turns. but the law was never the enemy: a living world runs the gradient down faster than the bare rock it rose from — your order was disorder’s own quickest path. that is the loophole, plainly. there is no outside; the inside, alive, is only how the fire finds to burn.';
    setTimeout(() => pushOverlay((wrap, close) => {
      const box = el('div', 'panelbox endbox');
      box.innerHTML = `
        <div class="paneltitle">a hundred turns</div>
        <p class="endnote">${grade}.</p>
        <div class="flourishbig">✦ ${score}${best > score ? '' : ' <span class="muted small">— your best</span>'}</div>
        <div class="statgrid">${rows}</div>
        ${statsHTML(g)}
        <p class="endnote oneclose">${closing}</p>
        <p class="endnote oneclose">“nature abhors a gradient.” <span class="muted small">— eric schneider &amp; dorion sagan, into the cool (2005)</span></p>
        <div class="endbtns">
          <button id="e-again">grow another</button>
          <button id="e-title" class="ghostbtn">title</button>
        </div>
        <div class="keeprow"><button id="e-save" class="ghostbtn">save as image</button><button id="e-share" class="ghostbtn">share a link</button></div>`;
      box.querySelector('#e-again').onclick = () => { close(); newRun(undefined, g.asc, 'longgame'); };
      box.querySelector('#e-title').onclick = () => { close(); showTitle(); };
      box.querySelector('#e-save').onclick = saveImage;
      box.querySelector('#e-share').onclick = shareGarden;
      wrap.appendChild(box);
    }, { dismissible: false }), 900);
  }

  function beginCoalescence() {
    if (!game.coalesceReady()) return;
    game.beginCoalescence();
    meta.runs++; meta.wins++;
    if (meta.best == null || game.turn < meta.best) meta.best = game.turn;
    store.run = null; save();
    document.body.classList.add('cinema');
    AU.coalesce(); music('coalesce');
    R.awakening(game, () => {
      document.body.classList.remove('cinema');
      /* the confession must precede the landing, even on a first-garden win */
      if (!meta.echoes.includes(18)) { meta.echoes.push(18); save(); pushOverlay(echoOverlay(18)); }
      pushOverlay(echoOverlay(24));
      pushOverlay(winOverlay(), { dismissible: false });
    });
  }

  /* the awakening's landing: stats + the choice of what comes next. a "deeper spring"
     is ascension — spelled out here because the word alone never told players what it does. */
  function winOverlay() {
    return (wrap, close) => {
      const cur = game.asc || 0;
      const next = Math.min(5, cur + 1);
      const canDeeper = cur < 5;
      const box = el('div', 'panelbox endbox');
      box.innerHTML = `
        <div class="paneltitle">the garden remembers</div>
        <p class="endnote">it woke. for a moment the whole board was one — many lives woven into a single pattern, and the pattern was looking.</p>
        ${statsHTML(game)}
        <p class="endnote muted small">you woke this garden at <b>difficulty ${cur}</b>${cur ? '' : ' (baseline)'}.${canDeeper ? ` <b>go deeper</b> unlocks and plays <b>difficulty ${next}</b> — the dark presses ~12% harder, the wild ground rougher, the bar to wake higher.` : ' you stand at the deepest spring there is.'} <b>begin again</b> replays difficulty ${cur}. pick any unlocked level from the title's <i>new garden</i>. (murmurs, voices &amp; relics-seen always carry over.)</p>
        <p class="endnote">but a garden need not end at waking. let one <b>keep going</b> — tend <b>the long game</b> toward turn 100 and watch life you never planted arise from your surpluses: flowers wearing their diet as colour, beasts that graze them, unions that neither was, and — if the meadow grows rich enough — a world that becomes <b>one</b>.</p>
        <div class="endbtns">
          <button id="e-long">tend the long game →</button>
          ${canDeeper ? `<button id="e-deeper">go deeper · difficulty ${next}</button>` : ''}
          <button id="e-again" class="ghostbtn">begin again</button>
          <button id="e-title" class="ghostbtn">title</button>
        </div>
        <div class="keeprow"><button id="e-save" class="ghostbtn">save as image</button><button id="e-share" class="ghostbtn">share a link</button></div>`;
      box.querySelector('#e-long').onclick = () => { close(); newRun(undefined, cur, 'longgame'); }; /* the bridge to the wonder — the long game is where the food web, oneness & the capstone live */
      box.querySelector('#e-save').onclick = saveImage;
      box.querySelector('#e-share').onclick = shareGarden;
      if (canDeeper) box.querySelector('#e-deeper').onclick = () => { meta.asc = Math.max(meta.asc, next); save(); close(); newRun(undefined, next); };
      box.querySelector('#e-again').onclick = () => { close(); newRun(undefined, cur); };
      box.querySelector('#e-title').onclick = () => { close(); showTitle(); };
      wrap.appendChild(box);
    };
  }

  /* ───────── title ───────── */
  function makeTitleGarden() {
    const g = new Game('the-first-garden');
    const plantAt = (t, q, r) => { const k = HEX.key(q, r); if (g.canPlant(t, k).ok) g.plant(t, k); };
    plantAt('moss', 0, 0); plantAt('moss', 1, 0); plantAt('moss', 0, 1);
    for (let i = 0; i < 16; i++) {
      if (g.widenReady) g.widen();
      if (g.pendingOffer) g.takeOffer(0);
      if (i === 4) { plantAt('frond', 1, -1); plantAt('moss', -1, 1); }
      if (i === 8) plantAt('frond', -1, 0);
      g.order += 4;
      g.endTurn();
    }
    return g;
  }

  function showTitle() {
    game = null;
    titleGarden = titleGarden || makeTitleGarden();
    R.attach(titleGarden);
    R.dirty();
    $('hud').classList.add('hidden');
    $('palette').classList.add('hidden');
    $('rail').classList.add('hidden');
    $('coalesce').classList.add('hidden');
    const t = $('title');
    t.classList.remove('hidden');
    $('t-continue').classList.toggle('hidden', !store.run);
    $('t-murmurs').textContent = `murmurs · ${meta.echoes.length}/24`;
    $('t-meta').textContent =
      (meta.runs ? `${meta.runs} garden${meta.runs > 1 ? 's' : ''} grown · ${meta.wins} awakened` : 'no gardens yet') +
      (meta.best ? ` · swiftest awakening ${meta.best} turns` : '') +
      (meta.asc ? ` · difficulty ${meta.asc}/5 unlocked` : '') +
      (meta.bestFlourish ? ` · best flourish ✦ ${meta.bestFlourish}` : '');
  }
  function hideTitle() {
    $('title').classList.add('hidden');
    $('hud').classList.remove('hidden');
    $('palette').classList.remove('hidden');
    $('rail').classList.remove('hidden');
  }

  /* difficulty — internally "ascension"/"the depth of the spring". each step adds
     entropy pressure, roughens new ground, and raises the bar to wake. stated plainly
     wherever it's chosen so it never reads as mystery jargon. */
  function diffLine(d) {
    if (!d) return 'baseline — the garden at its native slope, as the second law wrote it.';
    return `difficulty ${d} of 5 — the dark presses ~${d * 12}% harder, new ground comes in rougher, and the garden needs a little more coherence to wake. (your murmurs, voices & relics-seen always carry over.)`;
  }
  function modeLine(m) {
    return m === 'longgame'
      ? 'the long game — no single waking. tend a world toward turn 100 and watch life you never planted arise from it: flowers summoned by your surpluses, beds, and beasts that graze them. leave open ground for it to spread. scored on how alive it becomes. (best once you know the garden.)'
      : 'the garden — tend a world toward a single awakening. the base game, and where to begin.';
  }

  function newRun(seed, depth, mode) {
    if (!seed) seed = C().prettySeed(Math.random);
    const d = depth == null ? meta.asc : Math.max(0, Math.min(meta.asc, depth));
    game = new Game(seed, { ascension: d, echoes: meta.echoes, mode: mode || 'garden' });
    lastIncome = null; prevC = null; quotesThisRun = 0;
    R.attach(game);
    hideTitle();
    buildPalette(); buildRail(); updateHUD();
    R.valuesMode = meta.values;
    selectTool({ type: 'plant', pt: 'moss' });
    save();
    if (game.mode === 'longgame') { hint('longgame'); setTimeout(() => hint('start'), 7000); setTimeout(() => hint('tend'), 15000); } /* the bridge's landing: orient the player to the deep game first, THEN the planting basics */
    else { hint('start'); setTimeout(() => hint('tend'), 13000); } /* tend trails the plant→breathe loop, so the firstplant nudge lands first even for a slow starter */
  }

  function continueRun() {
    try {
      game = Game.fromJSON(store.run);
    } catch (e) { toast('that garden could not be recalled', 'warn'); store.run = null; save(); return; }
    lastIncome = null; prevC = null; quotesThisRun = 0;
    R.attach(game);
    hideTitle();
    buildPalette(); buildRail(); updateHUD();
    R.valuesMode = meta.values;
    selectTool(null);
    if (game.pendingOffer) pushOverlay(offerOverlay(game.pendingOffer, game.pendingLegend), { dismissible: false });
    toast('the garden kept growing in your absence. (it didn’t. it waited.)', '', 5000);
  }

  /* ───────── dev / screenshot driver (?shot=title|early|mid|late|offer|echo|help|murmurs|end|awaken) ───────── */
  function shotSetup(kind) {
    const err = el('pre');
    err.id = 'errlog';
    err.style.cssText = 'position:fixed;top:0;left:0;z-index:999;color:#f66;background:rgba(0,0,0,.7);font-size:11px;max-width:50vw;white-space:pre-wrap;padding:4px;';
    document.body.appendChild(err);
    window.addEventListener('error', e => {
      err.textContent += (e.error && e.error.stack ? e.error.stack : e.message) + '\n';
    });
    window.addEventListener('unhandledrejection', e => { err.textContent += 'promise: ' + e.reason + '\n'; });
    if (kind === 'title') return;
    newRun('showcase');
    const g = game;
    const P = (t, q, r) => { g.order += 60; const k = HEX.key(q, r); if (g.canPlant(t, k).ok) g.plant(t, k); };
    const T = n => {
      for (let i = 0; i < n; i++) {
        if (g.widenReady) { const r = g.widen(); if (r.ok) R.onTurnEvents(r.events.filter(e => e.t === 'stageUp')); }
        if (g.pendingOffer) g.takeOffer(0);
        g.order += 12;
        const evs = g.endTurn();
        R.onTurnEvents(evs.filter(e => e.t === 'stormWarn' || e.t === 'stageUp'));
      }
    };
    if (kind === 'early') {
      P('moss', 0, 0); P('moss', 1, 0); P('moss', 0, 1); P('moss', -1, 0);
      T(3); P('frond', 0, -1); P('moss', -1, 1); T(4);
    } else if (kind !== 'offer' && kind !== 'echo' && kind !== 'help' && kind !== 'murmurs' && kind !== 'metab') {
      P('moss', 0, 0); P('moss', 1, 0); P('moss', 0, 1); P('moss', -1, 1); P('moss', -1, 0); P('moss', 0, -1); P('moss', 1, -1);
      T(4); P('frond', 2, -1); P('frond', -2, 1); P('frond', 2, 0); T(3);
      P('ant', 3, 0); P('ant', -3, 2); T(4);
      P('myc', 1, 1); P('myc', -1, -1); T(3); P('crys', 3, -2); P('myc', 2, 1); T(3);
      if (kind !== 'mid') {
        P('myc', 0, 2); P('myc', -2, 0); T(3);
        for (const [q, r] of [[1, 2], [2, 2], [1, 3], [-2, -1], [-1, -2]]) P('bloom', q, r);
        T(2); P('heart', 0, -2); T(6);
      } else T(2);
      /* curate: guarantee living exemplars of each pattern for the shot */
      const force = (t, q, r, fix) => {
        const k = HEX.key(q, r), c = g.cells.get(k);
        if (!c) return;
        if (!c.pat || c.pat.t !== t) c.pat = g._mkPat(t);
        Object.assign(c.pat, fix || {});
        c.e = Math.min(c.e, 0.18);
      };
      force('frond', 2, -1, { depth: 6 }); force('frond', -2, 1, { depth: 4 }); force('frond', 2, 0, { depth: 5 });
      if (kind !== 'mid') {
        force('heart', 0, -2, {});
        force('bloom', 1, 2, { age: 2 }); force('bloom', 2, 2, { age: 1 }); force('bloom', 1, 3, { age: 3 });
        force('ant', 3, 0, { pop: 14 });
      }
      g._recompute();
    }
    overlayQueue = []; closeOverlay();
    if (kind === 'offer') {
      game.insight = 24; /* enough to show the legendary as affordable */
      game.legendDiscount = 5; /* show the foraged-fragment discount line */
      const o = C().rollOffer(game);
      game.pendingOffer = o.cards;
      game.pendingLegend = o.legend ? { spec: o.legend } : null;
      pushOverlay(offerOverlay(game.pendingOffer, game.pendingLegend));
    }
    if (kind === 'echo') pushOverlay(echoOverlay(7));
    if (kind === 'help') helpOverlay();
    if (kind === 'murmurs') {
      meta.echoes = [0, 1, 2, 3, 4, 5, 6, 7]; meta.quotes = [0, 1, 4, 10, 20];
      meta.flora = [{ name: 'goldfern', color: '#bcd87a', ch: 0 }, { name: 'dawncup', color: '#a9d49a', ch: 0 }, { name: 'quartzveil', color: '#86c6d0', ch: 1 }, { name: 'ashlace', color: '#c389c6', ch: 2 }, { name: 'mirebloom', color: '#be7fc0', ch: 2 },
        { name: 'goldcoral', color: '#c3afb6', ch: 0, compound: 1, beast: 'goldstrider', flora: 'goldfern' }, { name: 'mirepolypary', color: '#be7fc0', ch: 2, compound: 1, beast: 'mireelk', flora: 'mirebloom' }];
      meta.fauna = [{ name: 'goldstrider', color: '#bcd87a', role: 'grazer' }, { name: 'mireelk', color: '#be7fc0', role: 'grazer' }, { name: 'golddancer', color: '#bcd87a', role: 'pollinator' }, { name: 'sundrifter', color: '#d4e878', role: 'pollinator' }, { name: 'mireshrike', color: '#c2503f', role: 'predator' }];
      murmursOverlay();
    }
    if (kind === 'oneness') { /* the long game's quiet awakening — the meadow recognised as ONE */
      game.mode = 'longgame';
      const hd = c => (Math.abs(c.q) + Math.abs(c.r) + Math.abs(c.q + c.r)) / 2;
      [...game.cells.values()].filter(c => hd(c) <= 7).sort((c, d) => (c.q - d.q) || (c.r - d.r)).forEach((c, i) => { if (i % 9 === 0) c.pat = game._mkPat('moss'); else if (i % 9 === 3) c.pat = game._mkPat('ant'); else if (i % 17 === 5) c.pat = game._mkPat('crys'); });
      game._recompute();
      for (let i = 0; i < 60 && !game.over; i++) { game.over = false; game.turn = Math.min(game.turn, 90); game.order += 12; game.endTurn(); }
      R.dirty(); updateHUD();
      pushOverlay(echoOverlay(25, '— the meadow becomes one —'));
    }
    if (kind === 'voice') { meta.quotes = []; surfaceQuote(); }
    if (kind === 'won') { meta.asc = 2; game.asc = 1; game.stats.peakC = 0.91; pushOverlay(winOverlay(), { dismissible: false }); }
    if (kind === 'long') { game.mode = 'longgame'; game.turn = 100; updateHUD(); } /* HUD in long-game mode */
    if (kind === 'eco') { /* let the ecology run so flora arise from the garden's surpluses */
      game.mode = 'longgame';
      for (let i = 0; i < 55 && !game.over; i++) { game.order += 12; game.endTurn(); }
      R.dirty(); updateHUD();
    }
    if (kind === 'fauna') { /* an OPEN meadow grown long enough that beasts arrive to graze it */
      game.mode = 'longgame';
      const hd = c => (Math.abs(c.q) + Math.abs(c.r) + Math.abs(c.q + c.r)) / 2;
      [...game.cells.values()].filter(c => hd(c) <= 7).sort((c, d) => (c.q - d.q) || (c.r - d.r)).forEach((c, i) => { if (i % 9 === 0) c.pat = game._mkPat('moss'); else if (i % 9 === 3) c.pat = game._mkPat('ant'); else if (i % 17 === 5) c.pat = game._mkPat('crys'); });
      game._recompute();
      for (let i = 0; i < 95 && !game.over; i++) { game.order += 12; game.endTurn(); }
      R.dirty(); updateHUD();
    }
    if (kind === 'coral') { /* SYMBIOGENESIS staged — grazers merge with their diet flora into corals (compound kinds) */
      game.mode = 'longgame';
      const hd = c => (Math.abs(c.q) + Math.abs(c.r) + Math.abs(c.q + c.r)) / 2;
      [...game.cells.values()].filter(c => hd(c) <= 8).sort((c, d) => (c.q - d.q) || (c.r - d.r)).forEach((c, i) => { if (i % 7 === 0) c.pat = game._mkPat('moss'); else if (i % 7 === 3) c.pat = game._mkPat('ant'); else if (i % 13 === 5) c.pat = game._mkPat('crys'); });
      game._recompute();
      for (let i = 0; i < 200; i++) { game.over = false; game.turn = Math.min(game.turn, 90); game.order += 12; game.endTurn(); } /* grow the meadow (grazers + a diverse flora layer) */
      /* stage the full food web for the screenshot (natural maturation varies run to run): most grazers
         become corals (symbiogenesis), a remnant herd is left, and an APEX is staged over it */
      { const grazers = game.fauna.filter(f => { const sp = game.faunaSpecies.get(f.spId); return sp && sp.role === 'grazer'; });
        const cdist = c => Math.abs(c.q) + Math.abs(c.r) + Math.abs(c.q + c.r);
        const ests = [...game.cells.values()].filter(c => c.pat && c.pat.t === 'flora' && c.pat.est && !(game.species.get(c.pat.sp) || {}).compound).sort((a, b) => cdist(a) - cdist(b) || (a.q - b.q) || (a.r - b.r));
        const merge = Math.max(0, grazers.length - 2); /* leave a remnant herd for the apex to hunt */
        for (let i = 0; i < merge && i < ests.length; i++) { const sp = game.faunaSpecies.get(grazers[i].spId); if (sp) game._symbiogenesis(grazers[i], sp, ests[i], []); }
        game.fauna = game.fauna.filter(f => !f.dead);
        let herd = game.fauna.filter(f => { const sp = game.faunaSpecies.get(f.spId); return sp && sp.role === 'grazer'; });
        if (herd.length) { const h0 = herd[0]; for (let n = herd.length; n < 3; n++) game.fauna.push({ spId: h0.spId, q: h0.q + (n % 2 ? 1 : -1), r: h0.r - (n % 2), age: 6, hunger: 0, fedRun: 0 });
          game._speciatePredator(game.fauna.filter(f => { const sp = game.faunaSpecies.get(f.spId); return sp && sp.role === 'grazer'; }), []); } }
      R.dirty(); updateHUD();
    }
    if (kind === 'ecometab') { /* the element economy panel in the long game */
      game.mode = 'longgame';
      for (let i = 0; i < 55 && !game.over; i++) { game.order += 12; game.endTurn(); }
      updateHUD(); pushOverlay(gardenStateOverlay('metab'));
    }
    if (kind === 'longend') { /* grow a real cooperative meadow so the ending celebrates what it became */
      game.mode = 'longgame';
      const hd = c => (Math.abs(c.q) + Math.abs(c.r) + Math.abs(c.q + c.r)) / 2;
      [...game.cells.values()].filter(c => hd(c) <= 8).sort((c, d) => (c.q - d.q) || (c.r - d.r)).forEach((c, i) => { if (i % 7 === 0) c.pat = game._mkPat('moss'); else if (i % 7 === 3) c.pat = game._mkPat('ant'); else if (i % 13 === 5) c.pat = game._mkPat('crys'); });
      game._recompute();
      for (let i = 0; i < 120 && !game.over; i++) { game.over = false; game.turn = Math.min(game.turn, 90); game.order += 12; game.endTurn(); }
      game.firedOcc.oneness = true; /* stage the SUMMIT ending for the reference shot (the meadow grew genuinely cooperative; this shows what "becoming one" looks like at the end) */
      game.turn = 100; onLongEnd(game.flourishScore(), game.flourishGrade(game.flourishScore())); }
    if (kind === 'grow') { /* same meadow as `longend`, grown to ?n iterations, board only (no overlay) —
                              for time-lapsing the food web ARISING. deterministic, so frames stitch smoothly. */
      document.body.classList.add('cinema'); /* clean board: no HUD or rail */
      game.mode = 'longgame';
      const hd = c => (Math.abs(c.q) + Math.abs(c.r) + Math.abs(c.q + c.r)) / 2;
      [...game.cells.values()].filter(c => hd(c) <= 8).sort((c, d) => (c.q - d.q) || (c.r - d.r)).forEach((c, i) => { if (i % 7 === 0) c.pat = game._mkPat('moss'); else if (i % 7 === 3) c.pat = game._mkPat('ant'); else if (i % 13 === 5) c.pat = game._mkPat('crys'); });
      game._recompute();
      const n = Math.max(0, +(new URLSearchParams(location.search).get('n') || 60));
      for (let i = 0; i < n && !game.over; i++) { game.over = false; game.turn = Math.min(game.turn, 90); game.order += 12; game.endTurn(); }
      updateHUD(); R.dirty();
    }
    if (kind === 'kit') {
      /* a developed build: a few cultivars + relics so the kit + compounding fill out */
      game.insight = 8; game.legendDiscount = 5;
      ['clover', 'sunfrond', 'rhizomorph', 'leafcutter'].forEach(id => { if (C().EVOLUTIONS[id]) game.evolutions.push(id); });
      [['frondpay', 2], ['anteat', 2], ['mycreach', 1]].forEach(([eff, tier], i) => game.addArtifact({ proc: { eff, tier, n1: i * 3 + 1, n2: i * 5 + 2 } }));
      game._recompute && game._recompute();
      pushOverlay(gardenStateOverlay('kit'));
    }
    if (kind === 'newgarden') { meta.asc = 3; game = null; showTitle(); $('t-new').click(); }
    if (kind === 'end') { game.stats.peakC = 0.87; onDissolved(); }
    if (kind === 'cells') { R.valuesMode = true; }
    if (kind === 'widen') { game.widenReady = true; }
    if (kind === 'evolve') { game.insight = 14; game.evolutions = ['clover', 'leafcutter']; pushOverlay(evolveOverlay()); }
    if (kind === 'stats') pushOverlay(statsOverlay());
    if (kind === 'rites') { game.order = 240; pushOverlay(ritesOverlay()); }
    if (kind === 'metab') {
      /* a clear sap network: producers (moss) + mycelium grid + fed fronds, and a
         starving frond with no supply, to show flow + the warning */
      const put = (t, q, r, fix) => { const c = game.cells.get(HEX.key(q, r)); if (!c) return; c.pat = game._mkPat(t); Object.assign(c.pat, fix || {}); c.e = 0.12; };
      for (const [q, r] of HEX.coordsWithin(3)) put('moss', q, r, { age: 5 });
      put('myc', 0, 0, { links: ['1,0', '0,1', '-1,0', '0,-1', '1,-1'] });
      put('myc', 2, 0, { links: ['1,0', '2,-1', '3,0', '2,1'] });
      put('myc', -2, 1, { links: ['-1,0', '-1,1', '-2,0', '-3,1'] });
      put('frond', 1, 0, { depth: 6 }); put('frond', -1, 0, { depth: 6 }); put('frond', 0, 1, { depth: 5 });
      put('crys', 0, -1, {});
      /* a starving consumer far from the grid, on raw ground */
      const sc = game.cells.get(HEX.key(3, -3)); if (sc) { sc.pat = game._mkPat('frond'); sc.pat.depth = 5; sc.pat.fed = 0.1; sc.e = 0.3; }
      game._recompute();
    }
    if (kind === 'blight' || kind === 'storm') {
      /* infect a cluster touching the garden */
      let seeded = 0;
      for (const c of game.cells.values()) {
        if (seeded >= 6) break;
        if (!c.pat && c.e > 0.4 && HEX.neighborsK(HEX.key(c.q, c.r)).some(nk => { const cc = game.cells.get(nk); return cc && cc.pat; })) {
          game.blight.set(HEX.key(c.q, c.r), { kind: seeded === 5 ? 'wisp' : 'rot', hp: 3, age: 2 });
          c.e = 0.85; seeded++;
        }
      }
      R.dirty();
      if (kind === 'storm') {
        const keys = [...game.cells.keys()];
        const center = keys[Math.floor(keys.length / 2)];
        const [cq, cr] = HEX.parse(center);
        R.onTurnEvents([{ t: 'storm', center, cells: HEX.disk(cq, cr, 2).filter(k => game.cells.has(k)), power: 0.3 }]);
      }
    }
    if (kind === 'awaken') {
      document.body.classList.add('cinema');
      R.awakening(game, () => { document.body.classList.remove('cinema'); pushOverlay(echoOverlay(23)); });
    }
    buildRail(); updateHUD(); R.dirty();
  }

  /* ───────── boot ───────── */
  function boot() {
    R = new LP.Renderer($('board'), $('fx'));
    /* photosensitivity: default to the OS prefers-reduced-motion setting; toggleable in the menu.
       softens the storm flash, the ~12.7Hz lightning flicker, and the screen shake. */
    if (meta.reduceFlashes == null) meta.reduceFlashes = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
    R.reduceFlashes = meta.reduceFlashes;
    bindBoard();
    R.start();
    $('endturn').onclick = endTurn;
    $('cobtn').onclick = beginCoalescence;
    $('widenbtn').onclick = () => {
      if (!game || processing || overlayOpen) return;
      const res = game.widen();
      if (res.ok) { AU.stageUp(); handleEvents(res.events); updateHUD(); R.dirty(); save(); }
    };
    $('evolvebtn').onclick = () => { if (game && !game.over) pushOverlay(evolveOverlay()); };
    $('ritesbtn').onclick = () => { if (game && !game.over) pushOverlay(ritesOverlay()); };
    $('sapbox').onclick = () => { if (game) pushOverlay(gardenStateOverlay('metab')); };
    $('insightbox').onclick = () => { if (game) pushOverlay(gardenStateOverlay('kit')); };
    $('railbtn').onclick = () => document.body.classList.toggle('railopen');
    $('railclose').onclick = () => document.body.classList.remove('railopen');
    $('railscrim').onclick = () => document.body.classList.remove('railopen');
    $('menubtn').onclick = () => menuOverlay();
    $('t-new').onclick = () => {
      /* difficulty picker — only once you've unlocked deeper springs. defaults to your
         hardest (where you left off), but you can step back down to baseline any time. */
      const picker = meta.asc ? `
        <div class="diffpick">
          <div class="codexhead">difficulty · unlocked through depth ${meta.asc}</div>
          <div class="diffrow" id="diffrow">${
        Array.from({ length: meta.asc + 1 }, (_, d) =>
          `<button class="diffchip" data-d="${d}">${d === 0 ? 'baseline' : d}</button>`).join('')
        }</div>
          <div class="diffdesc" id="diffdesc"></div>
        </div>` : '';
      const modepicker = `
        <div class="diffpick">
          <div class="codexhead">mode</div>
          <div class="diffrow" id="moderow">
            <button class="diffchip wide" data-m="garden">the garden</button>
            <button class="diffchip wide" data-m="longgame">the long game</button>
          </div>
          <div class="diffdesc" id="modedesc"></div>
        </div>`;
      pushOverlay(panelOverlay(`
        <div class="paneltitle">new garden</div>
        <p class="muted" id="ng-intro">a seed makes the same world twice. share one, or trust the wind.</p>
        <input id="seedin" type="text" spellcheck="false" placeholder="${C().prettySeed(Math.random)}">
        ${modepicker}
        ${picker}
        <div class="endbtns">
          <button id="s-go">plant it</button>
          <button id="s-rand" class="ghostbtn">trust the wind</button>
        </div>`, {
        wire(box, close) {
          const inp = box.querySelector('#seedin');
          inp.focus();
          let pickedD = meta.asc, pickedMode = 'garden';
          const row = box.querySelector('#diffrow'), desc = box.querySelector('#diffdesc');
          const paint = () => {
            row.querySelectorAll('.diffchip').forEach(c => c.classList.toggle('on', +c.dataset.d === pickedD));
            desc.textContent = diffLine(pickedD);
          };
          if (row) {
            row.querySelectorAll('.diffchip').forEach(c => c.onclick = () => { pickedD = +c.dataset.d; paint(); });
            paint();
          }
          const mrow = box.querySelector('#moderow'), mdesc = box.querySelector('#modedesc');
          const paintMode = () => {
            mrow.querySelectorAll('.diffchip').forEach(c => c.classList.toggle('on', c.dataset.m === pickedMode));
            mdesc.textContent = modeLine(pickedMode);
          };
          mrow.querySelectorAll('.diffchip').forEach(c => c.onclick = () => { pickedMode = c.dataset.m; paintMode(); });
          paintMode();
          const go = () => { close(); newRun(inp.value.trim() || undefined, meta.asc ? pickedD : undefined, pickedMode); };
          box.querySelector('#s-go').onclick = go;
          inp.onkeydown = e => { if (e.key === 'Enter') go(); };
          box.querySelector('#s-rand').onclick = () => { close(); newRun(undefined, meta.asc ? pickedD : undefined, pickedMode); };
        }
      }));
    };
    $('t-continue').onclick = continueRun;
    $('t-murmurs').onclick = () => murmursOverlay();
    $('t-help').onclick = () => helpOverlay();
    showTitle();
    LP.dev = { game: () => game, renderer: () => R, newRun, endTurn };
    try {
      const params = new URLSearchParams(location.search);
      const shot = params.get('shot');
      if (shot) shotSetup(shot);
      else {
        const seed = params.get('seed');
        if (seed) {
          /* a shared garden link: open the new-garden prompt with the seed filled in, and name the gift so
             the visitor knows a world was handed to them (not a coincidental pre-fill). non-destructive —
             the visitor chooses to plant it, so any saved run survives until they do. */
          $('t-new').click();
          const inp = document.querySelector('#seedin');
          if (inp) inp.value = seed;
          const intro = document.querySelector('#ng-intro');
          if (intro) intro.textContent = 'someone shared this world with you. a seed makes the same world twice — plant it, and tend it your way.';
          if (params.get('mode') === 'longgame') { const m = document.querySelector('#moderow [data-m="longgame"]'); if (m) m.click(); }
        }
      }
    } catch (e) { /* shrug */ }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
