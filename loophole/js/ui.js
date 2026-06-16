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

  /* ───────── persistence ───────── */
  const KEY = 'loophole_v1';
  const defaultMeta = () => ({
    echoes: [], codex: [], runs: 0, wins: 0, best: null,
    asc: 0, muted: false, values: false, hints: [],
  });
  let store = { v: 1, meta: defaultMeta(), run: null };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const got = JSON.parse(raw);
      if (got && got.v === 1) store = got;
      if (!got.meta) store.meta = defaultMeta();
      /* a run snapshot from before v0.2 can't be read — the board changed shape. keep the murmurs. */
      if (store.run && store.run.v !== LP.SAVE_V) store.run = null;
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
  function pushOverlay(builder, opts) {
    overlayQueue.push({ b: builder, d: !opts || opts.dismissible !== false });
    if (!overlayOpen) nextOverlay();
  }
  function nextOverlay() {
    const item = overlayQueue.shift();
    if (!item) { overlayOpen = false; return; }
    overlayOpen = true;
    overlayDismissible = item.d;
    const wrap = $('overlay');
    wrap.innerHTML = '';
    wrap.classList.remove('hidden');
    item.b(wrap, closeOverlay);
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
  function echoOverlay(idx) {
    return (wrap, close) => {
      AU.echo();
      if (!meta.echoes.includes(idx)) { meta.echoes.push(idx); save(); }
      const box = el('div', 'echobox');
      const sig = R.sigilCanvas('murmur' + idx, 30, 'uncommon');
      sig.className = 'echosigil';
      box.appendChild(sig);
      const head = el('div', 'echohead', '— murmur ' + C().roman(idx) + ' —');
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

  /* artifact offer overlay */
  function offerOverlay(specs) {
    return (wrap, close) => {
      AU.offer();
      hint('offer');
      const box = el('div', 'offerbox');
      box.appendChild(el('div', 'offerhead', 'the garden offers'));
      const row = el('div', 'offerrow');
      const choose = i => {
        const res = game.takeOffer(i);
        if (res.artifact) {
          AU.take();
          meta.codex.push({ n: res.artifact.name, r: res.artifact.rarity });
          toast('« ' + res.artifact.name + ' » joins the garden', 'good');
        }
        save(); buildRail(); updateHUD(); close();
      };
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
      const pass = el('button', 'ghostbtn', 'let it pass (+3 order) · P');
      pass.onclick = () => choose(-1);
      box.appendChild(pass);
      wrap.appendChild(box);
      const keys = e => {
        if (e.key >= '1' && e.key <= '3' && specs[+e.key - 1]) choose(+e.key - 1);
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
    $('stagename').textContent = st.name + ' · ' + C().roman(game.stage - 1);
    $('stageblurb').textContent = st.blurb;
    if (LP.Music && LP.Music.running) LP.Music.setState(game.stage, game.coherence());
    $('order').textContent = Math.floor(game.order);
    $('income').textContent = lastIncome != null ? ('+' + lastIncome) : '';
    $('insight').textContent = game.insight;
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
    /* mobile rail button badges ripe cultivars + a waking garden */
    const coReady = game.stage === 6 && game.coalesceReady();
    const rb = $('railbadge');
    if (rb) {
      const n = ripe + (coReady ? 1 : 0);
      rb.classList.toggle('hidden', n === 0 && !coReady);
      rb.textContent = coReady ? '❀' : (n || '');
      $('railbtn').classList.toggle('ripe', n > 0);
    }
    /* coalesce panel */
    const cp = $('coalesce');
    if (game.stage === 6 && !game.over) {
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
    pruneCard.onmouseenter = () => showCardTip(pruneCard, { name: 'prune', rule: 'remove one of your patterns, refund 30% of its cost.', long: 'every garden is also edited. clear carpet to make room for what matters; move colonies that have eaten themselves out of work.' });
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

  function cellTip(k, ev) {
    const tip = $('celltip');
    if (!k || !game) { tip.classList.add('hidden'); return; }
    const c = game.cells.get(k);
    if (!c) { tip.classList.add('hidden'); return; }
    const soil = C().SOILS[c.soil] || C().SOILS.loam;
    let lines = [`<b>${Math.round(c.e * 100)}%</b> entropy · <span class="soiltag">${soil.name}</span>`];
    if (c.pat) {
      const p = c.pat, n = C().PATTERNS[p.t].name;
      if (p.t === 'moss') lines.push(`${n} · ${p.age >= 3 ? 'mature' : 'young'} (age ${p.age})`);
      else if (p.t === 'frond') lines.push(`${n} · depth ${p.depth}`);
      else if (p.t === 'ant') lines.push(`${n} · ${p.pop} foragers`);
      else if (p.t === 'myc') lines.push(`${n} · ${p.links.length} links`);
      else if (p.t === 'heart') lines.push(`${n} · network ${(game.netOf.get(k) || { cells: { size: 1 } }).cells.size}`);
      else lines.push(n);
      /* surface the synergy multiplier when it matters */
      const syn = game._synergy(c);
      if (syn > 1.04) lines.push(`<span class="synup">thriving ×${syn.toFixed(2)}</span>`);
      else if (syn < 0.96) lines.push(`<span class="syndown">crowded ×${syn.toFixed(2)}</span>`);
    } else {
      lines.push(`<span class="muted">${soil.note}</span>`);
    }
    const b = game.blightAt && game.blightAt(k);
    if (b) lines.push(`<span class="blighttag">${b.kind === 'wisp' ? 'wisp' : 'rot'} · hp ${b.hp}</span>`);
    if (game.aura.get(k)) lines.push('within a crystal aura');
    if (c.trail) lines.push('a remembered path');
    tip.innerHTML = lines.join('<br>');
    tip.classList.remove('hidden');
    tip.style.left = (ev.clientX + 14) + 'px';
    tip.style.top = (ev.clientY + 12) + 'px';
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
          toast('the world strains at its rim — widen it when you are ready.', 'stage', 6000);
          hint('widen');
          break;
        case 'offer': pushOverlay(offerOverlay(e.specs), { dismissible: false }); break;
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
        case 'blightClear': AU.tend(); break;
        case 'stormWarn': $('stormbanner').textContent = 'a squall gathers — ' + (e.inTurns === 1 ? 'next turn' : 'in ' + e.inTurns + ' turns'); $('stormbanner').classList.remove('hidden'); hint('storm'); break;
        case 'cascade': if (e.n >= 2) { AU.cascade(e.n); if (e.n >= 4) { toast(e.n + ' blossoms in one breath', 'good'); music('cascade'); } } break;
        case 'pulse': AU.pulse(); break;
        case 'find': toast('the foragers return with something strange — « ' + e.name + ' »', 'good', 6000); AU.take(); buildRail(); meta.codex.push({ n: e.name, r: 'found' }); break;
        case 'dissolveWarn': toast('the garden thins — coherence below 22% (' + e.streak + '/3)', 'warn', 5200); break;
        case 'dissolved': onDissolved(); break;
        case 'saved': toast('« ' + e.via + ' » intercedes. the garden holds.', 'good', 6000); buildRail(); break;
        case 'coalesceReady': hint('coalesce'); break;
        case 'demon': break;
        case 'wither': break;
      }
    }
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
    processing = true;
    AU.breath();
    $('endturn').classList.add('breathing');
    prevC = game.coherence();
    const evs = game.endTurn();
    handleEvents(evs);
    updateHUD();
    R.dirty();
    save();
    setTimeout(() => { processing = false; $('endturn').classList.remove('breathing'); }, 320);
  }

  /* ───────── board input ───────── */
  /* apply the held tool to one cell; returns true if something happened.
     light updates only — the caller saves (so a drag saves once at release). */
  let dragging = false, dragActed = false;
  const dragSet = new Set();
  function applyToolAt(k, silent) {
    if (!game || game.over || processing || overlayOpen || !k || !tool) return false;
    let res = null;
    if (tool.type === 'plant') { res = game.plant(tool.pt, k); if (res && res.ok) AU.plant(tool.pt); }
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
      const k = cellAtEv(ev);
      R.hovered = k;
      cellTip(k, ev);
      R.auraFor = null;
      if (k) {
        const c = game.cells.get(k);
        if (c && ((c.pat && c.pat.t === 'crys') || (tool && tool.type === 'plant' && tool.pt === 'crys'))) R.auraFor = k;
      }
      if (dragging && !multiTouch && k && canDragTool() && !dragSet.has(k)) {
        dragSet.add(k);
        if (applyToolAt(k, true)) dragActed = true;
      }
    });
    wrap.addEventListener('pointerleave', () => { R.hovered = null; cellTip(null); });
    wrap.addEventListener('pointerdown', ev => {
      if (R.cinematic) { R.skipCinematic(); return; }
      if (ev.button === 2) return; /* right-click handled by contextmenu */
      pointers.set(ev.pointerId, local(ev));
      if (pointers.size >= 2) {
        /* second finger: stop painting, begin a pinch/pan gesture */
        multiTouch = true; dragging = false; dragActed = false;
        const [a, b] = [...pointers.values()];
        pinch = { dist: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
        return;
      }
      if (multiTouch) return;
      if (!game || game.over || processing || overlayOpen) return;
      const k = cellAtEv(ev);
      if (!k || !tool) return;
      dragging = true; dragActed = false; dragSet.clear(); dragSet.add(k);
      try { wrap.setPointerCapture(ev.pointerId); } catch (e) {}
      if (applyToolAt(k, false)) dragActed = true;
    });
    const liftPointer = ev => {
      pointers.delete(ev.pointerId);
      if (pointers.size < 2) pinch = null;
      if (pointers.size === 0) { multiTouch = false; endDrag(); }
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
    });
    document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
  }

  /* ───────── menus & screens ───────── */
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
        <button id="m-abandon" class="danger">let this garden go</button>
      </div>`, {
      wire(box, close) {
        box.querySelector('#m-resume').onclick = close;
        box.querySelector('#m-story').onclick = () => { close(); pushOverlay(statsOverlay()); };
        box.querySelector('#m-help').onclick = () => { close(); helpOverlay(); };
        box.querySelector('#m-murmurs').onclick = () => { close(); murmursOverlay(); };
        box.querySelector('#m-sound').onclick = () => { AU.setMuted(!meta.muted); close(); };
        box.querySelector('#m-values').onclick = () => { meta.values = !meta.values; R.valuesMode = meta.values; save(); close(); };
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
        <p><b>read the land.</b> each cell sits on a soil that bends the rules — plant fronds in the wet, crystals on stone, ants and moss on the ash. and patterns earn by their <b>neighbors</b>: a frond sheltered by moss, anchored by crystal, plumbed into mycelium pays several times a lonely one. hover any cell to see its soil and how it’s faring.</p>
        <p><b>don’t hoard.</b> order above a soft cap radiates away as heat — but some of that heat condenses into <b>✸ insight</b>. spend insight in <b>« cultivate »</b> on cultivars and extra <b>hands</b> that plant 2–3 at once.</p>
        <p><b>rot</b> spreads from the frontier and gnaws your patterns. tend it to wound it, foragers devour it, crystal auras corrode it — or wall it off and starve it. clearing it pays insight.</p>
        <p>reach a stage’s coherence target and a golden choice appears: <b>let the world widen</b>. new ground arrives wild, pressure rises, a new pattern unlocks. you choose when — but a stalled garden invites the dark. if coherence stays under 22% for three turns, the stream takes the garden back.</p>
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
    pushOverlay(panelOverlay(`
      <div class="paneltitle">murmurs</div>
      <div class="murmurlist">${items.join('')}</div>
      <div class="muted center">${meta.echoes.length < 24 ? 'the rest are still in the soil. they surface as you play.' : 'all of it, gathered. thank you for listening.'}</div>
      ${codex}`,
      { wide: true }));
  }

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
      <div class="muted center">seed · ${g.seed}${meta.asc ? ' · deeper spring ' + meta.asc : ''}</div>`;
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
      pushOverlay(echoOverlay(23));
      pushOverlay((wrap, close) => {
        const box = el('div', 'panelbox endbox');
        box.innerHTML = `
          <div class="paneltitle">the garden remembers</div>
          <p class="endnote">it woke. for a moment the whole board was one pattern, and the pattern was looking.</p>
          ${statsHTML(game)}
          <div class="endbtns">
            <button id="e-deeper">deeper spring (ascend to ${Math.min(5, meta.asc + 1)})</button>
            <button id="e-again" class="ghostbtn">begin again</button>
            <button id="e-title" class="ghostbtn">title</button>
          </div>`;
        box.querySelector('#e-deeper').onclick = () => { meta.asc = Math.min(5, meta.asc + 1); save(); close(); newRun(); };
        box.querySelector('#e-again').onclick = () => { close(); newRun(); };
        box.querySelector('#e-title').onclick = () => { close(); showTitle(); };
        wrap.appendChild(box);
      }, { dismissible: false });
    });
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
      (meta.asc ? ` · deeper spring ${meta.asc}` : '');
  }
  function hideTitle() {
    $('title').classList.add('hidden');
    $('hud').classList.remove('hidden');
    $('palette').classList.remove('hidden');
    $('rail').classList.remove('hidden');
  }

  function newRun(seed) {
    if (!seed) seed = C().prettySeed(Math.random);
    game = new Game(seed, { ascension: meta.asc, echoes: meta.echoes });
    lastIncome = null; prevC = null;
    R.attach(game);
    hideTitle();
    buildPalette(); buildRail(); updateHUD();
    R.valuesMode = meta.values;
    selectTool({ type: 'plant', pt: 'moss' });
    save();
    hint('start');
    setTimeout(() => hint('tend'), 9000);
  }

  function continueRun() {
    try {
      game = Game.fromJSON(store.run);
    } catch (e) { toast('that garden could not be recalled', 'warn'); store.run = null; save(); return; }
    lastIncome = null; prevC = null;
    R.attach(game);
    hideTitle();
    buildPalette(); buildRail(); updateHUD();
    R.valuesMode = meta.values;
    selectTool(null);
    if (game.pendingOffer) pushOverlay(offerOverlay(game.pendingOffer), { dismissible: false });
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
    } else if (kind !== 'offer' && kind !== 'echo' && kind !== 'help' && kind !== 'murmurs') {
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
    if (kind === 'offer') { game.pendingOffer = C().rollOffer(game); pushOverlay(offerOverlay(game.pendingOffer)); }
    if (kind === 'echo') pushOverlay(echoOverlay(7));
    if (kind === 'help') helpOverlay();
    if (kind === 'murmurs') { meta.echoes = [0, 1, 2, 3, 4, 5, 6, 7]; murmursOverlay(); }
    if (kind === 'end') { game.stats.peakC = 0.87; onDissolved(); }
    if (kind === 'cells') { R.valuesMode = true; }
    if (kind === 'widen') { game.widenReady = true; }
    if (kind === 'evolve') { game.insight = 14; game.evolutions = ['clover', 'leafcutter']; pushOverlay(evolveOverlay()); }
    if (kind === 'stats') pushOverlay(statsOverlay());
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
    $('railbtn').onclick = () => document.body.classList.toggle('railopen');
    $('railclose').onclick = () => document.body.classList.remove('railopen');
    $('railscrim').onclick = () => document.body.classList.remove('railopen');
    $('menubtn').onclick = () => menuOverlay();
    $('t-new').onclick = () => {
      pushOverlay(panelOverlay(`
        <div class="paneltitle">new garden</div>
        <p class="muted">a seed makes the same world twice. share one, or trust the wind.</p>
        <input id="seedin" type="text" spellcheck="false" placeholder="${C().prettySeed(Math.random)}">
        <div class="endbtns">
          <button id="s-go">plant it</button>
          <button id="s-rand" class="ghostbtn">trust the wind</button>
        </div>`, {
        wire(box, close) {
          const inp = box.querySelector('#seedin');
          inp.focus();
          const go = () => { close(); newRun(inp.value.trim() || undefined); };
          box.querySelector('#s-go').onclick = go;
          inp.onkeydown = e => { if (e.key === 'Enter') go(); };
          box.querySelector('#s-rand').onclick = () => { close(); newRun(); };
        }
      }));
    };
    $('t-continue').onclick = continueRun;
    $('t-murmurs').onclick = () => murmursOverlay();
    $('t-help').onclick = () => helpOverlay();
    showTitle();
    LP.dev = { game: () => game, renderer: () => R, newRun, endTurn };
    try {
      const shot = new URLSearchParams(location.search).get('shot');
      if (shot) shotSetup(shot);
    } catch (e) { /* shrug */ }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
