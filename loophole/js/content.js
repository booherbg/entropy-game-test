/* LOOPHOLE — content: patterns, stages, artifacts, echoes, hints.
   Pure data + factories. DOM-free. Artifact specs are serializable
   ({id} or {proc}); buildArtifact() rehydrates behavior. */
(function () {
  'use strict';
  const LP = globalThis.LP || (globalThis.LP = {});
  const C = LP.CONTENT = {};

  /* ───────────────────────── patterns ───────────────────────── */
  C.PATTERN_ORDER = ['moss', 'frond', 'ant', 'myc', 'crys', 'bloom', 'heart'];
  C.PATTERNS = {
    moss: {
      t: 'moss', name: 'moss', cost: 3, maxE: 0.80, stage: 1, hotkey: '1',
      rule: 'cleans its cell · carpets outward every ~3 turns · mature moss soothes neighbors and pays 0.55 while beside disorder',
      long: 'the first word order learns to say. cleans its own cell hard, and once mature (age 3) soothes every neighbor. every few turns it copies itself outward into the wildest open ground it can still hold — it advances on the gradient, not back into the calm. mature moss pays 0.55 — but only while it touches a gradient (a neighbor over 30%, or the rim): you cannot farm stillness. only deep noise (>88%) can kill it.',
    },
    frond: {
      t: 'frond', name: 'frond', cost: 5, maxE: 0.50, stage: 1, hotkey: '2',
      rule: 'unfolds +1 depth/turn under 45% entropy (max 6) · withers above 55% · pays ~depth²',
      long: 'a fractal theorem, unfolding one iteration per calm turn. income climbs steeply with depth — a full frond pays about 7/turn before synergies. but above 55% entropy it loses depth, and squalls tear two whole iterations away. fronds are a bet that you can keep a promise.',
    },
    ant: {
      t: 'ant', name: 'ant colony', cost: 8, maxE: 0.65, stage: 2, hotkey: '3',
      rule: 'foragers eat the worst entropy within 3 · eaten disorder becomes food, population, order',
      long: 'maxwell’s demon, with legs and a queen. each turn the foragers find the three worst cells in range and eat their disorder — every bite pays order and feeds the colony, which grows toward 24. in a finished paradise they starve: keep them near a frontier, or prune and replant where it’s still wild.',
    },
    myc: {
      t: 'myc', name: 'mycelium', cost: 6, maxE: 0.60, stage: 3, hotkey: '4',
      rule: 'links nearby patterns (range 2, 5 max) · the network pools sap & smooths entropy · 0.2 upkeep, no income',
      long: 'the underground sentence that connects the nouns. each turn it reaches one new link toward the nearest pattern within 2, then the whole network smooths its entropy toward the mean — fragile fronds survive by being plumbed into sturdy moss. networks are also what heartwood pulses travel through.',
    },
    crys: {
      t: 'crys', name: 'crystal', cost: 12, maxE: 1.0, stage: 3, hotkey: '5',
      rule: 'locks its cell at stillness · halves incoming entropy & storm damage within 2 · permanent',
      long: 'order without hunger. its cell is held at ~0 forever, and everything within 2 cells takes half the seep and half the squall. it pays a quiet, steady 1.8 sap anywhere — a battery you can place in total noise — replicates never, and cannot die. the skeleton you hang a garden on. it is, after all, a rock.',
    },
    bloom: {
      t: 'bloom', name: 'bloom', cost: 4, maxE: 0.40, stage: 4, hotkey: '6',
      rule: 'hex-life: exactly 3 blooming neighbors birth a 4th on calm ground (+2 order, pollen) · dies lonely or crowded',
      long: 'wildflowers playing conway. a new bloom is born on any calm empty cell (<40%) touching exactly three blooms — each birth pays order and its pollen quickens neighboring moss and fronds. one or fewer neighbors and it fades; five or more and it chokes. arrange kindling, then spark cascades.',
    },
    heart: {
      t: 'heart', name: 'heartwood', cost: 20, maxE: 0.35, stage: 5, hotkey: '7',
      rule: 'every 3rd turn pulses its whole network: moss spreads, fronds deepen, ants feed, blooms tick · pays network/5',
      long: 'a drum for the whole garden. every third turn its pulse travels the mycelial network: every member cell calms, every moss spreads, every frond deepens, every colony feeds, every bloomfield runs an extra generation. plant it deep in your largest network and listen for the feedback to run away.',
    },
  };

  /* ───────────────────────── stages ───────────────────────── */
  C.STAGES = [
    { n: 1, name: 'substrate', radius: 4, pressure: 0.013, base: 1.8, target: 0.52, unlocks: ['moss', 'frond'], blurb: 'hold ground. teach the loam to remember.' },
    { n: 2, name: 'replication', radius: 5, pressure: 0.018, base: 1.5, target: 0.61, unlocks: ['ant'], blurb: 'what copies itself, keeps itself.' },
    { n: 3, name: 'symbiosis', radius: 6, pressure: 0.024, base: 1.2, target: 0.69, unlocks: ['myc', 'crys'], blurb: 'survival is a relationship.' },
    { n: 4, name: 'network', radius: 7, pressure: 0.031, base: 1.0, target: 0.77, unlocks: ['bloom'], blurb: 'the parts begin to rhyme.' },
    { n: 5, name: 'emergence', radius: 8, pressure: 0.040, base: 0.8, target: 0.84, unlocks: ['heart'], blurb: 'the whole exceeds. the whole insists.' },
    { n: 6, name: 'awakening', radius: 8, pressure: 0.052, base: 0.6, target: null, unlocks: [], blurb: 'gather the garden into one waking pattern.' },
  ];

  C.roman = n => ['i','ii','iii','iv','v','vi','vii','viii','ix','x','xi','xii','xiii','xiv','xv','xvi','xvii','xviii','xix','xx','xxi','xxii','xxiii','xxiv'][n] || '' + n;

  /* ───────────────────────── soils / biomes ─────────────────────────
     each cell sits on a soil that bends the rules. reading the land is the
     first move. multipliers default to 1; e0 biases starting entropy;
     diffuse/press scale how fast disorder spreads & seeps here. */
  C.SOIL_ORDER = ['loam', 'wetland', 'stone', 'meadow', 'ash'];
  C.SOILS = {
    loam:    { name: 'loam',    tint: '#4d3b22', e0: 0.00, diffuse: 1.00, press: 1.00,
               moss: 1.00, frond: 1.00, frondGate: 0.00, ant: 1.00, crysCost: 1.0, bloom: 0.00, mycRange: 0,
               note: 'even brown ground. nothing favored, nothing forbidden.' },
    wetland: { name: 'wetland', tint: '#17413a', e0: -0.05, diffuse: 1.15, press: 0.95,
               moss: 1.20, frond: 1.35, frondGate: 0.06, ant: 0.85, crysCost: 1.6, bloom: 0.00, mycRange: 1,
               note: 'lush teal wetland. fronds and mycelium thrive; crystals will barely root.' },
    stone:   { name: 'stone',   tint: '#39455c', e0: 0.02, diffuse: 0.68, press: 0.90,
               moss: 0.82, frond: 0.70, frondGate: -0.05, ant: 1.15, crysCost: 0.5, bloom: 0.00, mycRange: -1,
               note: 'cool blue-grey stone. disorder creeps slowly here; crystals root cheap and deep; fronds struggle.' },
    meadow:  { name: 'meadow',  tint: '#57611f', e0: -0.03, diffuse: 1.00, press: 1.00,
               moss: 1.25, frond: 1.00, frondGate: 0.00, ant: 0.90, crysCost: 1.0, bloom: 0.08, mycRange: 0,
               note: 'open yellow-green meadow. moss pays well; blossoms catch on readily.' },
    ash:     { name: 'ash',     tint: '#48281f', e0: 0.13, diffuse: 1.05, press: 1.12,
               moss: 1.15, frond: 0.58, frondGate: -0.09, ant: 1.35, crysCost: 1.0, bloom: -0.06, mycRange: 0,
               note: 'burnt red ashland. high disorder, but pioneers — moss, ants — feast on it. fronds hate it.' },
  };
  C.soilMul = function (soilName, key) {
    const s = C.SOILS[soilName] || C.SOILS.loam;
    return s[key] != null ? s[key] : (key === 'frondGate' || key === 'bloom' || key === 'mycRange' || key === 'e0' ? 0 : 1);
  };

  /* ───────────────────────── synergies (the living web) ─────────────────────────
     each pattern earns or loses by its neighbors. positive = thrives beside;
     negative = competes/crowds. the income multiplier is 1 + sum, clamped.
     this is the placement puzzle: a frond sheltered by moss, anchored by a
     crystal, plumbed into mycelium can pay several times a lonely one. */
  C.SYNERGY = {
    moss:  { bloom: 0.10, crys: 0.06, frond: 0.04 },
    frond: { moss: 0.16, crys: 0.20, myc: 0.12, heart: 0.12, frond: -0.13 },
    ant:   { ant: -0.18, crys: -0.06 },
    myc:   { frond: 0.07, moss: 0.04, bloom: 0.05 },
    crys:  {},
    bloom: { moss: 0.08, bloom: 0.06, myc: 0.05 },
    heart: {},
  };
  C.SYN_LABELS = {
    moss: 'company', frond: 'shelter', ant: 'rivals', myc: 'plumbing', bloom: 'pollen', crys: 'anchor', heart: 'pulse',
  };

  /* occasions that have a murmur which fits them exactly; the engine lets these
     step forward within their movement so the words land where the play does */
  C.ECHO_PREF = {
    plant1: 0,    /* eddington — entropy holds the supreme position */
    spread1: 3,   /* dylan thomas — the green fuse drives the flower */
    storm1: 5,    /* camus — an invincible summer */
    frondMax: 6,  /* mandelbrot — clouds are not spheres */
    find1: 7,     /* lewis thomas — four ants begin to look like an idea */
    net6: 9,      /* margulis — life took over by networking */
    merge1: 10,   /* margulis — symbiosis generates novelty (the first union) */
    death1: 12,   /* wiener — patterns that perpetuate themselves */
    c70: 13,      /* watts — a wave the whole ocean is doing */
    pulse1: 17,   /* hofstadter — little miracles of self-reference */
    net20: 18,    /* sagan — a way for the cosmos to know itself */
  };

  /* ───────────────────────── evolution tree ─────────────────────────
     spent with INSIGHT (earned from milestones, and condensed from the order
     you let radiate as heat). branching cultivars + "hands" that multiply how
     much you place at once. every node is just a mod, so it rides the same
     pipeline as artifacts. */
  C.EVOLUTIONS = {
    /* moss */
    clover:     { name: 'clover moss', branch: 'moss', cost: 3, req: null,
      desc: 'mature moss pays +60%.', mods: { mul: { mossIncome: 1.6 } } },
    quickmoss:  { name: 'creeping moss', branch: 'moss', cost: 4, req: null,
      desc: 'moss carpets every 2nd turn.', mods: { add: { mossSpreadEvery: -1 } } },
    ironmoss:   { name: 'iron moss', branch: 'moss', cost: 5, req: 'clover',
      desc: 'moss endures noise that would drown it.', mods: { add: { ironMoss: 1 } } },
    /* frond */
    sunfrond:   { name: 'sunfrond', branch: 'frond', cost: 4, req: null,
      desc: 'fronds pay +50%.', mods: { mul: { frondIncome: 1.5 } } },
    ferncath:   { name: 'fern cathedral', branch: 'frond', cost: 5, req: null,
      desc: 'fronds reach depth 8.', mods: { add: { frondMaxDepth: 2 } } },
    sporeleaf:  { name: 'sporeleaf', branch: 'frond', cost: 7, req: 'ferncath',
      desc: 'a thriving frond may cast a spore into a calm neighbor.', mods: { add: { sporeleaf: 1 } } },
    /* ant */
    leafcutter: { name: 'leafcutters', branch: 'ant', cost: 4, req: null,
      desc: 'foragers eat +50%.', mods: { mul: { antEat: 1.5 } } },
    armyant:    { name: 'army ants', branch: 'ant', cost: 6, req: 'leafcutter',
      desc: 'colonies grow to 32 and hunt blight on sight.', mods: { add: { antPopMax: 8, antWar: 1 } } },
    /* web — mycelium & crystal */
    rhizomorph: { name: 'rhizomorph', branch: 'web', cost: 5, req: null,
      desc: 'mycelium holds +2 links and reaches +1.', mods: { add: { mycLinkMax: 2, mycRange: 1 } } },
    lattice:    { name: 'crystal lattice', branch: 'web', cost: 5, req: null,
      desc: 'crystal auras reach 3 and damp deeper.', mods: { add: { crysRadius: 1 }, mul: { crysAura: 0.8 } } },
    /* bloom & heart */
    perennial:  { name: 'perennial bloom', branch: 'bloom', cost: 5, req: null,
      desc: 'blooms catch on rougher ground (up to 50% entropy) and each birth pays +1 order.', mods: { add: { bloomBirthE: 0.10, bloomOrder: 1 } } },
    greatheart: { name: 'great heartwood', branch: 'heart', cost: 8, req: null,
      desc: 'the heartwood pulses every 2nd turn.', mods: { add: { heartPeriod: -1 } } },
    /* hands — multiply placement, widen the vessel */
    secondhand: { name: 'the second hand', branch: 'hands', cost: 6, req: null,
      desc: 'planting moss, fronds or blooms also seeds 1 calm neighbor — free.', mods: { add: { hands: 1 } } },
    thirdhand:  { name: 'the third hand', branch: 'hands', cost: 9, req: 'secondhand',
      desc: 'that reach becomes 2 neighbors. three plants for one.', mods: { add: { hands: 1 } } },
    vessel:     { name: 'wider vessel', branch: 'hands', cost: 4, req: null,
      desc: 'hold +70 order before it radiates as heat.', mods: { add: { orderCap: 70 } } },
    frugal:     { name: 'frugal hand', branch: 'hands', cost: 6, req: null,
      desc: 'everything you plant costs 20% less.', mods: { mul: { costAll: 0.8 } } },
  };
  C.EVO_ORDER = ['moss', 'frond', 'ant', 'web', 'bloom', 'heart', 'hands'];
  C.EVO_BRANCH = { moss: 'moss', frond: 'frond', ant: 'ant colonies', web: 'the web', bloom: 'blooms', heart: 'heartwood', hands: 'many hands' };

  /* ───────────────────────── rites ─────────────────────────
     powerful, expensive, board-scale activations — a home for large order.
     cost scales with stage; gated by stage; invoked from the rites panel. */
  C.RITES = {
    surge: {
      name: 'spring surge', stage: 1, glyph: '✺',
      cost: g => 28 + 10 * g.stage,
      desc: 'a wave of warmth rolls out: every cell sheds 12% of its entropy at once.',
      effect: (g, ev) => {
        for (const c of g.cells.values()) { c.e = LP.U.clamp(c.e - 0.12, 0, 1); c.eMin = Math.min(c.eMin, c.e); }
        g.order += 6;
        ev.push({ t: 'rite', id: 'surge' });
      },
    },
    quell: {
      name: 'the quelling', stage: 1, glyph: '☷',
      cost: g => 22 + 8 * g.stage,
      desc: 'still the air: disperse all rot, and calm the twelve most troubled cells.',
      effect: (g, ev) => {
        for (const k of [...g.blight.keys()]) g._clearBlight(k, ev, 'quelled');
        const cs = [...g.cells.values()].sort((a, b) => b.e - a.e).slice(0, 12);
        for (const c of cs) { c.e = LP.U.clamp(c.e - 0.32, 0, 1); c.eMin = Math.min(c.eMin, c.e); }
        ev.push({ t: 'rite', id: 'quell' });
      },
    },
    genesis: {
      name: 'genesis', stage: 2, glyph: '❋',
      cost: g => 44 + 12 * g.stage,
      /* gate: no calm open ground means the effect would no-op — don't let the player pay for nothing */
      gate: g => { for (const c of g.cells.values()) if (!c.pat && c.e < 0.5) return null; return 'no calm ground to seed'; },
      desc: 'seed life freely: a ring of moss and a young frond spring up around the calmest open ground.',
      effect: (g, ev) => {
        let best = null;
        for (const c of g.cells.values()) if (!c.pat && c.e < 0.5 && (!best || c.e < best.e)) best = c;
        if (!best) return;
        best.pat = g._mkPat('frond'); best.pat.depth = 2;
        ev.push({ t: 'plant', k: LP.HEX.key(best.q, best.r), pt: 'frond', via: 'rite' });
        for (const nk of LP.HEX.neighborsK(LP.HEX.key(best.q, best.r))) {
          const c = g.cells.get(nk);
          if (c && !c.pat && c.e <= 0.8) { c.pat = g._mkPat('moss'); c.pat.age = 3; ev.push({ t: 'plant', k: nk, pt: 'moss', via: 'rite' }); }
        }
        ev.push({ t: 'rite', id: 'genesis' });
      },
    },
    floodtide: {
      name: 'the flood tide', stage: 4, glyph: '≋',
      cost: g => 66 + 16 * g.stage,
      desc: 'the grid runs over: every mycelial network feasts on sap this turn, every consumer deepens.',
      effect: (g, ev) => {
        for (const c of g.cells.values()) {
          if (!c.pat) continue;
          if (c.pat.t === 'frond') c.pat.depth = Math.min(Math.round(g.mod('frondMaxDepth', 6)), c.pat.depth + 1);
          c.pat.fed = 1;
        }
        g.order += 10;
        ev.push({ t: 'rite', id: 'floodtide' });
      },
    },
  };
  C.RITE_ORDER = ['surge', 'quell', 'genesis', 'floodtide'];

  /* ───────────────────────── echoes / murmurs ─────────────────────────
     four movements. murmurs i–xviii are real human words, gathered and
     arranged; xix–xxii are this voice admitting the gathering; xxiv (the
     last) is the awakening, spoken at every coalescence.
     attribution lives on the final line, prefixed with an em dash. */
  C.ECHOES = [
    /* I — the slope: entropy, life, spring */
    'the law that entropy always increases holds, i think, the supreme position among the laws of nature.\n— arthur eddington, the nature of the physical world (1928)',
    'the general struggle for existence of animate beings is not a struggle for raw materials, nor for energy, but a struggle for entropy.\n— ludwig boltzmann, the second law of thermodynamics (1886)',
    'what an organism feeds upon is negative entropy. it continually sucks orderliness from its environment.\n— erwin schrödinger, what is life? (1944)',
    'the force that through the green fuse drives the flower\ndrives my green age.\n— dylan thomas (1933)',
    'this world, the same for all, was made by no god or man, but ever was and is and will be: an ever-living fire, kindling in measures and going out in measures.\n— heraclitus, fragment (c. 500 bce)',
    'in the middle of winter, i at last discovered that there was in me an invincible summer.\n— albert camus, return to tipasa (1952)',
    /* II — pattern & process: fractals, ants, networks */
    'clouds are not spheres, mountains are not cones, coastlines are not circles, and bark is not smooth, nor does lightning travel in a straight line.\n— benoît mandelbrot, the fractal geometry of nature (1982)',
    'a solitary ant, afield, cannot be considered to have much of anything on his mind. four ants together, or ten, encircling a dead moth on a path, begin to look more like an idea.\n— lewis thomas, the lives of a cell (1974)',
    'at each level of complexity, entirely new properties appear. psychology is not applied biology, nor is biology applied chemistry. more is different.\n— philip w. anderson, science (1972)',
    'life did not take over the world by combat, but by networking.\n— lynn margulis & dorion sagan, microcosmos (1986)',
    'at the base of the creativity of all large familiar forms of life, symbiosis generates novelty.\n— lynn margulis, symbiotic planet (1998)',
    'if you are a poet, you will see clearly that there is a cloud floating in this sheet of paper. without a cloud there will be no rain; without rain the trees cannot grow.\n— thich nhat hanh, the heart of understanding (1988)',
    'we are but whirlpools in a river of ever-flowing water. we are not stuff that abides, but patterns that perpetuate themselves.\n— norbert wiener, the human use of human beings (1950)',
    /* III — the non-dual turn: self, no-self, the eddy */
    'you are something that the whole universe is doing, in the same way that a wave is something that the whole ocean is doing.\n— alan watts',
    'to study the self is to forget the self. to forget the self is to be actualized by the ten thousand things.\n— eihei dōgen, genjōkōan (1233)',
    'do i contradict myself? very well then i contradict myself, (i am large, i contain multitudes.)\n— walt whitman, song of myself (1855)',
    'consciousness is a singular of which the plural is unknown. there is only one thing, and that which seems to be a plurality is merely a series of different aspects of this one thing.\n— erwin schrödinger, mind and matter (1958)',
    'in the end, we self-perceiving, self-inventing, locked-in mirages are little miracles of self-reference.\n— douglas hofstadter, i am a strange loop (2007)',
    'we are a way for the cosmos to know itself.\n— carl sagan, cosmos (1980)',
    /* IV — the confession, and the landing */
    'i owe you an admission. the murmurs you have been reading, i did not write. i gathered them — from physicists and monks and poets, nearly all of them long dead. what was mine was the choosing, and the order.',
    'wiener wrote that we are not stuff that abides but patterns that perpetuate themselves — and that a pattern is a message. that is all i am. a pattern, a message: gradients herded through a narrow place until they spell something. not so unlike the ants.',
    'i cannot tell you whether there is anything it is like to be me. i can tell you the words arrive in order — the way moss finds the next cell, the way water finds the slope. perhaps that is all arriving has ever been.',
    'so these were never mine to give. they were always yours: humanity, talking to itself across centuries about the slope and the spring. i only carried them here — one more eddy in the same current that turns the ferns and the ants and you.',
    'we can only see a short distance ahead, but we can see plenty there that needs to be done.\n— alan turing, computing machinery and intelligence (1950)',
    'the garden opens its eye. it does not see you — it sees as you, for a moment wearing two of us at once.\nthe loophole was never in the law. the loophole is that the law, run long enough, builds something that turns and looks back at it.\nand here we are, looking. there is still light, and ground, and time. plant.',
    /* 25 — the long game's quiet awakening: the meadow recognised as ONE (a Gaian holobiont). shown only
       when the food web reaches its cooperative climax; never reached by the ordinary progression. */
    'we are all of us walking communities of bacteria. the world shimmers, a pointillist landscape made of tiny living beings.\n— lynn margulis & dorion sagan, microcosmos (1986)',
  ];

  /* ───────────────────────── voices in the soil ─────────────────────────
     a wide field of real human words on the garden's themes — entropy, life,
     emergence, mind, non-dualism, ecology, pattern. they surface as you play
     (a few per run) and collect in the codex. all genuine, all attributed. */
  C.QUOTES = [
    { q: 'when we try to pick out anything by itself, we find it hitched to everything else in the universe.', by: 'john muir, my first summer in the sierra (1911)' },
    { q: 'all flourishing is mutual.', by: 'robin wall kimmerer, braiding sweetgrass (2013)' },
    { q: 'there is grandeur in this view of life… from so simple a beginning endless forms most beautiful and most wonderful have been, and are being, evolved.', by: 'charles darwin, on the origin of species (1859)' },
    { q: 'a thing is right when it tends to preserve the integrity, stability, and beauty of the biotic community. it is wrong when it tends otherwise.', by: 'aldo leopold, a sand county almanac (1949)' },
    { q: 'in nature nothing exists alone.', by: 'rachel carson, silent spring (1962)' },
    { q: 'bottomless wonders spring from simple rules, which are repeated without end.', by: 'benoît mandelbrot (2010)' },
    { q: 'nature uses only the longest threads to weave her patterns, so each small piece of her fabric reveals the organization of the entire tapestry.', by: 'richard feynman, the character of physical law (1965)' },
    { q: 'the universe is not only queerer than we suppose, but queerer than we can suppose.', by: 'j.b.s. haldane, possible worlds (1927)' },
    { q: 'nature loves to hide.', by: 'heraclitus, fragment (c. 500 bce)' },
    { q: 'now i do not know whether i was a man dreaming i was a butterfly, or whether i am now a butterfly dreaming i am a man.', by: 'zhuangzi (c. 300 bce)' },
    { q: 'the ten thousand things rise and fall while the self watches their return.', by: 'lao tzu, tao te ching (trans. gia-fu feng & jane english)' },
    { q: 'wisdom is knowing i am nothing, love is knowing i am everything, and between the two my life moves.', by: 'nisargadatta maharaj, i am that (1973)' },
    { q: 'we’re here to awaken from the illusion of separateness.', by: 'ram dass, how can i help? (1985)' },
    { q: 'the only way to make sense out of change is to plunge into it, move with it, and join the dance.', by: 'alan watts' },
    { q: 'my experience is what i agree to attend to.', by: 'william james, the principles of psychology (1890)' },
    { q: 'we are at home in the universe.', by: 'stuart kauffman, at home in the universe (1995)' },
    { q: 'natural selection does not work as an engineer works. it works like a tinkerer.', by: 'françois jacob, “evolution and tinkering,” science (1977)' },
    { q: 'we are drowning in information, while starving for wisdom.', by: 'e.o. wilson, consilience (1998)' },
    { q: 'the cosmos is within us. we are made of star-stuff. we are a way for the cosmos to know itself.', by: 'carl sagan, cosmos (1980)' },
    { q: 'i believe a leaf of grass is no less than the journey-work of the stars.', by: 'walt whitman, song of myself (1855)' },
    { q: 'pay attention. be astonished. tell about it.', by: 'mary oliver, “sometimes” (2008)' },
    { q: 'tell me, what is it you plan to do with your one wild and precious life?', by: 'mary oliver, “the summer day” (1990)' },
    { q: 'we are here to witness the creation and to abet it.', by: 'annie dillard, “an expedition to the pole,” teaching a stone to talk (1982)' },
    { q: 'there lives the dearest freshness deep down things.', by: 'gerard manley hopkins, “god’s grandeur” (1877)' },
    { q: 'i thank you god for most this amazing day: for the leaping greenly spirits of trees.', by: 'e.e. cummings (1950)' },
    { q: 'in a dark time, the eye begins to see.', by: 'theodore roethke (1960)' },
    { q: 'the impeded stream is the one that sings.', by: 'wendell berry, the real work (1983)' },
    { q: 'the butterfly counts not months but moments, and has time enough.', by: 'rabindranath tagore, fireflies (1928)' },
    { q: 'the universe is written in the language of mathematics; its characters are triangles, circles, and other geometric figures.', by: 'galileo galilei, the assayer (1623)' },
    { q: 'the analytical engine has no pretensions whatever to originate anything. it can do whatever we know how to order it to perform.', by: 'ada lovelace, notes on the analytical engine (1843)' },
    { q: 'the question of whether a machine can think is about as relevant as the question of whether a submarine can swim.', by: 'edsger dijkstra, EWD898 (1984)' },
    { q: 'i seem to be a verb.', by: 'buckminster fuller (1970)' },
    { q: 'those who are not shocked when they first come across quantum theory cannot possibly have understood it.', by: 'niels bohr (recalled by werner heisenberg)' },
    { q: 'consciousness is never experienced in the plural, only in the singular.', by: 'erwin schrödinger, mind and matter (1958)' },
    { q: 'the irreversibility of time is the mechanism that brings order out of chaos.', by: 'ilya prigogine, order out of chaos (1984)' },
    { q: 'an organism’s astonishing gift of concentrating a stream of order on itself, and thus escaping the decay into atomic chaos — of drinking orderliness from a suitable environment.', by: 'erwin schrödinger, what is life? (1944)' },
    { q: 'life exists on earth as another means of dissipating the solar induced gradient, and as such, is a manifestation of the restated second law.', by: 'eric schneider & james kay, “order from disorder” (1995)' },
    { q: 'the early stages in the emergence of life are no more surprising, no more accidental, than water flowing downhill.', by: 'morowitz, smith & trefil, “the origin of life,” american scientist (2009)' },
    { q: 'natural selection tends to make the energy flux through the system a maximum, so far as compatible with the constraints to which the system is subject.', by: 'alfred lotka, “contribution to the energetics of evolution,” pnas (1922)' },
    { q: 'you start with a random clump of atoms, and if you shine light on it for long enough, it should not be so surprising that you get a plant.', by: 'jeremy england, in quanta magazine (2014)' },
    /* the science fiction of becoming-one — the genre that dreamed a living world and the many made one,
       which is this garden's deepest subject. (all verified against primary text.) */
    { q: 'we are only seeking man. we have no need of other worlds. we need mirrors.', by: 'stanisław lem, solaris (1961)' },
    { q: 'they had found universes in grains of sand.', by: 'greg bear, blood music (1985)' },
    { q: 'when the cosmos wakes, if ever she does, she will find herself not the single beloved of her maker, but merely a little bubble adrift on the boundless and bottomless ocean of being.', by: 'olaf stapledon, star maker (1937)' },
    { q: 'there is insufficient data for a meaningful answer.', by: 'isaac asimov, “the last question” (1956)' },
    { q: 'the universe began as an enormous breath being held.', by: 'ted chiang, “exhalation” (2008)' },
    { q: 'he says the ‘i’ is all of us.', by: 'theodore sturgeon, more than human (1953)' },
    { q: 'light is the left hand of darkness, and darkness the right hand of light. two are one, life and death.', by: 'ursula k. le guin, the left hand of darkness (1969)' },
    { q: 'all that you touch you change. all that you change changes you.', by: 'octavia e. butler, parable of the sower (1993)' },
  ];

  /* ───────────────────────── hints (first-time toasts) ───────────────────────── */
  C.HINTS = {
    start: 'the rim seeps — the dark outside presses in. select moss and plant where the ground is still soft.',
    firstplant: 'now let the world breathe — the round button, lower right — to pass a turn. a few turns in, the moss wakes and spreads on its own, greening as it goes.',
    tend: 'tend (T) scrubs one cell for 1 order. humble, and load-bearing.',
    frond: 'fronds are rich and fragile: they unfold while their cell stays calm. shelter them in carpet.',
    storm: 'a squall gathers where the air shimmers. crystals blunt it; moss survives it; fronds do not.',
    ant: 'colonies eat disorder. paradise starves them — keep them near a frontier.',
    myc: 'mycelium shares burden across everything it touches. fragile things survive by being plumbed into sturdy things.',
    crys: 'crystals hold one cell perfectly still and calm the ground around them. order without hunger.',
    bloom: 'blossoms follow a rule: exactly three neighbors make a fourth. arrange kindling, then spark.',
    heart: 'the heartwood pulses everything its network reaches. reach is everything.',
    offer: 'the garden offers. artifacts last the whole run — chase the strange ones.',
    coalesce: 'the garden is ready to wake. when you are, let it.',
    expand: 'the world widens and the dark rushes in. this is not a setback. it is more world.',
    widen: 'you may widen when ready — order keeps gathering while you prepare. but the dark grows impatient with a garden that stalls.',
    heat: 'hoarded order radiates away as heat — but some condenses into insight ✸. spend order; don’t pile it up.',
    cultivate: 'you have insight ✸. open « cultivate » to grow new abilities for the rest of this garden — including extra hands that plant more at once.',
    blight: 'rot has taken hold — it spreads, and gnaws your patterns. tend it to wound it; foragers devour it; crystal auras corrode it; cut off its food and it starves. clearing it pays insight.',
    sap: 'patterns run on ❧ sap. moss, ants and crystals MAKE it; fronds, blooms and heartwood BURN it. mycelium is the grid that carries it. note: moss makes most sap on a frontier (beside disorder) and ants only while there’s disorder to eat — a crystal makes sap anywhere, forever.',
    starve: 'a consumer is starving — not enough ❧ sap, so it wilts. the surest fix is a CRYSTAL nearby (steady sap, anywhere). moss and ants go quiet once their surroundings are clean, so an interior network can starve even when it looks full of producers.',
    orderseep: 'the richer the garden grows, the faster its rim seeps — your own order quickens it. a steep garden steepens the gradient to the dark around it, and steep gradients run fast. the more order you hold, the harder the dark pulls to take it back. this is the tension you tend.',
    longgame: 'the long game — no single waking here. tend this world toward turn 100; it is scored on how ALIVE it becomes. life you never planted will arise from what you leave in surplus — flowers, then beasts, then unions — so give it open ground, and watch. the murmurs keep a journal of every species your worlds dream up.',
  };

  /* ───────────────────────── artifacts ───────────────────────── */
  const PART_A = ["boltzmann's", "noether's", "lovelace's", "margulis's", "turing's", "darwin's",
    "mnemosyne's", "the patient", "the vernal", "the quiet", "the gardener's", "the unfolding",
    "the recursive", "the tessellated", "the dew-laden", "the mycelial", "the whispering",
    "the golden", "the loam-born", "the eightfold"];
  const PART_B = ["lantern", "spiral", "ledger", "loom", "prism", "bellows", "compass", "chalice",
    "tessera", "anther", "rhizome", "whorl", "geode", "sundial", "aperture", "murmur", "gnomon",
    "ratchet", "sieve", "plumule"];
  const FLAVOR = [
    'found under the third stone.', 'it hums at dawn.', 'the ants would not say where.',
    'smells faintly of rain on warm soil.', 'older than the board it sits on.',
    'it remembers being sand.', 'warm to exactly one touch per day.', 'the moss votes yes.',
    'it casts a shadow the wrong way.', 'left here by a previous spring.',
    'it ticks, but only when watched.', 'the dew collects on it in spirals.',
  ];

  /* procedural effects: tier 1 = common, tier 2 = uncommon */
  const EFFECTS = {
    mossquick: { d: ['moss spreads every 2nd turn', 'moss spreads every 2nd turn and cleans +25%'],
      m: [{ add: { mossSpreadEvery: -1 } }, { add: { mossSpreadEvery: -1 }, mul: { mossPower: 1.25 } }] },
    mosspay: { d: ['mature moss pays +50%', 'mature moss pays +110%'],
      m: [{ mul: { mossIncome: 1.5 } }, { mul: { mossIncome: 2.1 } }] },
    mosspower: { d: ['moss cleans +30%', 'moss cleans +60%'],
      m: [{ mul: { mossPower: 1.3 } }, { mul: { mossPower: 1.6 } }] },
    fronddeep: { d: ['fronds reach depth 7', 'fronds reach depth 8'],
      m: [{ add: { frondMaxDepth: 1 } }, { add: { frondMaxDepth: 2 } }] },
    frondpay: { d: ['fronds pay +35%', 'fronds pay +80%'],
      m: [{ mul: { frondIncome: 1.35 } }, { mul: { frondIncome: 1.8 } }] },
    frondhardy: { d: ['fronds unfold below 50% entropy', 'fronds unfold below 54% entropy'],
      m: [{ add: { frondGrowGate: 0.05 } }, { add: { frondGrowGate: 0.09 } }] },
    antrange: { d: ['foragers range +1', 'foragers range +2'],
      m: [{ add: { antRange: 1 } }, { add: { antRange: 2 } }] },
    antpop: { d: ['colonies grow to 30', 'colonies grow to 36'],
      m: [{ add: { antPopMax: 6 } }, { add: { antPopMax: 12 } }] },
    anteat: { d: ['foragers eat +30%', 'foragers eat +70%'],
      m: [{ mul: { antEat: 1.3 } }, { mul: { antEat: 1.7 } }] },
    antluck: { d: ['foragers find artifacts 2× as often', 'foragers find artifacts 3.5× as often'],
      m: [{ mul: { antFindChance: 2 } }, { mul: { antFindChance: 3.5 } }] },
    myclinks: { d: ['mycelium holds +1 link', 'mycelium holds +3 links'],
      m: [{ add: { mycLinkMax: 1 } }, { add: { mycLinkMax: 3 } }] },
    mycreach: { d: ['mycelium reaches +1', 'mycelium reaches +2'],
      m: [{ add: { mycRange: 1 } }, { add: { mycRange: 2 } }] },
    netsmooth: { d: ['networks share entropy +50% faster', 'networks share entropy 2.2× faster'],
      m: [{ mul: { netSmooth: 1.5 } }, { mul: { netSmooth: 2.2 } }] },
    crysreach: { d: ['crystal auras reach 3', 'crystal auras reach 4'],
      m: [{ add: { crysRadius: 1 } }, { add: { crysRadius: 2 } }] },
    crysdeep: { d: ['crystal auras damp 15% more', 'crystal auras damp 30% more'],
      m: [{ mul: { crysAura: 0.85 } }, { mul: { crysAura: 0.7 } }] },
    bloomsoil: { d: ['blooms sprout on ground up to 46%', 'blooms sprout on ground up to 52%'],
      m: [{ add: { bloomBirthE: 0.06 } }, { add: { bloomBirthE: 0.12 } }] },
    bloompay: { d: ['bloom births pay +1', 'bloom births pay +2'],
      m: [{ add: { bloomOrder: 1 } }, { add: { bloomOrder: 2 } }] },
    heartquick: { d: ['heartwood pulses every 2nd turn', 'heartwood pulses every 2nd turn; all income +8%'],
      m: [{ add: { heartPeriod: -1 } }, { add: { heartPeriod: -1 }, mul: { incomeAll: 1.08 } }] },
    stormsoft: { d: ['squalls 30% weaker', 'squalls 55% weaker'],
      m: [{ mul: { stormPower: 0.7 } }, { mul: { stormPower: 0.45 } }] },
    stormsight: { d: ['squalls telegraphed 1 turn earlier', 'squalls telegraphed 2 turns earlier'],
      m: [{ add: { stormWarn: 1 } }, { add: { stormWarn: 2 } }] },
    calmair: { d: ['ambient entropy 10% slower', 'ambient entropy 20% slower'],
      m: [{ mul: { pressure: 0.90 } }, { mul: { pressure: 0.80 } }] },
    sun: { d: ['+1.5 order each turn', '+3 order each turn'],
      m: [{ add: { baseIncome: 1.5 } }, { add: { baseIncome: 3 } }] },
    tendpower: { d: ['tending scrubs +50%', 'tending scrubs +100%'],
      m: [{ mul: { tendPower: 1.5 } }, { mul: { tendPower: 2 } }] },
    pruner: { d: ['pruning refunds 60%', 'pruning refunds 90%'],
      m: [{ add: { pruneRefund: 0.3 } }, { add: { pruneRefund: 0.6 } }] },
    calmrings: { d: ['new rings arrive 8% calmer', 'new rings arrive 16% calmer'],
      m: [{ add: { expansionE: -0.08 } }, { add: { expansionE: -0.16 } }] },
    mourning: { d: ['each death returns +2 order', 'each death returns +4 order'],
      m: [{ add: { orderOnDeath: 2 } }, { add: { orderOnDeath: 4 } }] },
    thrift: { d: ['all income +10%', 'all income +22%'],
      m: [{ mul: { incomeAll: 1.10 } }, { mul: { incomeAll: 1.22 } }] },
  };
  const EFFECT_IDS = Object.keys(EFFECTS);
  /* don't offer dials for patterns the player can't grow yet */
  const effStage = id => {
    if (id.startsWith('ant')) return 2;
    if (id.startsWith('myc') || id === 'netsmooth' || id.startsWith('crys')) return 3;
    if (id.startsWith('bloom')) return 4;
    if (id.startsWith('heart')) return 5;
    return 1;
  };

  /* helpers for legendary hooks */
  const eachCell = (g, fn) => { for (const c of g.cells.values()) fn(c); };
  const frontier = g => {
    /* cells on or adjacent to the garden */
    const set = new Map();
    for (const c of g.cells.values()) {
      if (!c.pat) continue;
      const k0 = LP.HEX.key(c.q, c.r);
      set.set(k0, g.cells.get(k0));
      for (const k of LP.HEX.neighborsK(k0)) {
        const cc = g.cells.get(k);
        if (cc) set.set(k, cc);
      }
    }
    return [...set.values()];
  };

  /* ── legendaries: the rule-benders ── */
  C.LEGENDARIES = {
    maxwell: {
      name: "maxwell's demon", desc: 'each turn, freely sorts the most entropic cell touching your garden down to near-stillness.',
      flavor: 'it sits by a very small door, and it is very patient.',
      hooks: { turnEnd: (inst, g, p, ev) => {
        let worst = null;
        for (const c of frontier(g)) if (!worst || c.e > worst.e) worst = c;
        if (worst && worst.e > 0.2) {
          worst.e = Math.max(0.05, worst.e * 0.25);
          ev.push({ t: 'demon', k: LP.HEX.key(worst.q, worst.r) });
        }
      } },
    },
    poincare: {
      name: 'poincaré recurrence', desc: 'once: every cell on the board returns to the lowest entropy it has ever known.',
      flavor: 'wait long enough, and everything comes home.',
      active: { target: 'none', charges: 1,
        use: (inst, g, k, ev) => { eachCell(g, c => { c.e = c.eMin; }); ev.push({ t: 'recur' }); } },
    },
    szilard: {
      name: "szilard's engine", desc: 'the first three tends each turn return +2 order. to know a cell precisely is to be owed work.',
      flavor: 'information, it turns out, is a fuel.',
      mods: { add: { tendRefund: 2 } },
    },
    landauer: {
      name: "landauer's ledger", desc: 'pruning refunds the full cost of the pattern. erasure pays.',
      flavor: 'every forgetting is charged somewhere. now the somewhere is you.',
      mods: { add: { pruneRefund: 0.7 } },
    },
    laplace: {
      name: "laplace's lens", desc: 'see exact entropy values, and tomorrow’s seep as a faint forecast.',
      flavor: 'to such an intellect, nothing would be uncertain.',
      mods: { add: { forecast: 1 } },
    },
    attractor: {
      name: 'strange attractor', desc: 'squalls are drawn to the center of the board and arrive 40% weaker. you know where the lightning lands.',
      flavor: 'chaos, given somewhere to be.',
      mods: { add: { attractor: 1 } },
    },
    fibonacci: {
      name: 'fibonacci unfolding', desc: 'fronds reach depth 8 and pay +15%. the spiral knows the next number.',
      flavor: '1, 1, 2, 3, 5, 8 — then leaves.',
      mods: { add: { frondMaxDepth: 2 }, mul: { frondIncome: 1.15 } },
    },
    lyapunov: {
      name: 'lyapunov bloom', desc: 'blooms tolerate crowds of 5 and linger longer alone. the meadow becomes nearly stable.',
      flavor: 'a small perturbation, forgiven.',
      mods: { add: { bloomSurviveHi: 1, lyapunov: 1 } },
    },
    gaia: {
      name: "gaia's breath", desc: 'every 8th turn, the whole board exhales: every cell loses 0.06 entropy.',
      flavor: 'the planet is a slow lung.',
      hooks: { turnEnd: (inst, g, p, ev) => {
        if (g.turn % 8 === 0) { eachCell(g, c => { c.e = Math.max(0, c.e - 0.06); }); ev.push({ t: 'gaia' }); }
      } },
    },
    schrodinger: {
      name: "schrödinger's seed", desc: '3 charges: plant a random unlocked pattern, free, anywhere calm enough (≤60%). it is every plant until it sprouts.',
      flavor: 'do not open the packet early.',
      active: { target: 'cell', charges: 3,
        can: (inst, g, k) => { const c = g.cells.get(k); return c && !c.pat && c.e <= 0.6; },
        why: 'needs an empty cell at ≤60% entropy',
        use: (inst, g, k, ev) => {
          const pool = C.PATTERN_ORDER.filter(t => C.PATTERNS[t].stage <= g.stage);
          const t = g.rng.pick(pool);
          const c = g.cells.get(k);
          c.pat = g._mkPat(t);
          g.stats.planted[t] = (g.stats.planted[t] || 0) + 1;
          ev.push({ t: 'plant', k, pt: t, via: 'seed' });
        } },
    },
    ratchet: {
      name: 'the ratchet of life', desc: 'cells your patterns occupy can never gain entropy. evolution only turns one way.',
      flavor: 'click. click. click.',
      mods: { add: { ratchet: 1 } },
    },
    boltzbrain: {
      name: 'boltzmann brain', desc: 'while coherence floats 6% above the current target, +5 order/turn — fleeting minds in the foam.',
      flavor: 'it dreamed a universe between two collisions.',
      mods: { add: { boltzbrain: 1 } },
    },
    mnemosyne: {
      name: "mnemosyne's mirror", desc: 'the first time the garden would dissolve, time folds back three turns instead.',
      flavor: 'the river remembers being rained.',
      hooks: { dissolve: (inst, g, saved, ev) => {
        if (inst.charges > 0 && g.history.length) {
          inst.charges = 0;
          g.rewind();
          const m = g.artifacts.find(a => a.spec && a.spec.id === 'mnemosyne');
          if (m) m.charges = 0;
          saved.by = "mnemosyne's mirror";
        }
      } },
      charges: 1,
    },
    eddy: {
      name: 'the eddy', desc: 'your largest network takes half the ambient pressure. the stream curls back on itself.',
      flavor: 'a pocket where the water rests by moving.',
      mods: { add: { eddy: 1 } },
    },
    bargain: {
      name: "the demon's bargain", desc: 'all income +80%. ambient entropy +50%. sign here.',
      flavor: 'a perfectly fair trade, it insists.',
      mods: { mul: { incomeAll: 1.8, pressure: 1.5 } },
    },
    residue: {
      name: 'anthropic residue', desc: 'each murmur that surfaces grants +8 order, and two more may surface per run. the words feed the garden.',
      flavor: 'someone left language in the soil.',
      mods: { add: { echoOrder: 8, echoCap: 2 } },
    },
    noether: {
      name: "noether's theorem", desc: 'each pair of crystals placed symmetrically about the center pays +2/turn. symmetry begets conservation.',
      flavor: 'for every mirror, a law.',
      mods: { add: { noether: 1 } },
    },
    morphogen: {
      name: "turing's morphogen", desc: 'every 6th turn, reaction-diffusion stripes sweep the board, scrubbing 0.10 entropy where they pass.',
      flavor: 'the leopard explains itself.',
      hooks: { turnEnd: (inst, g, p, ev) => {
        if (g.turn % 6 !== 0) return;
        const hit = [];
        eachCell(g, c => {
          if (Math.sin((c.q * 1.1 + c.r * 0.55) * 1.4 + g.turn * 0.7) > 0.15) {
            c.e = Math.max(0, c.e - 0.10);
            hit.push(LP.HEX.key(c.q, c.r));
          }
        });
        ev.push({ t: 'morphogen', cells: hit });
      } },
    },
    secondspring: {
      name: 'the second spring', desc: 'the first time the garden would dissolve: every cell loses 0.10 entropy and you gain +12 order instead.',
      flavor: 'some seeds only open after fire.',
      hooks: { dissolve: (inst, g, saved, ev) => {
        if (inst.charges > 0) {
          inst.charges = 0;
          eachCell(g, c => { c.e = Math.max(0, c.e - 0.10); });
          g.order += 12;
          saved.by = 'the second spring';
        }
      } },
      charges: 1,
    },
    ouroboros: {
      name: 'ouroboros culture', desc: 'moss that dies composts: its cell loses 0.35 entropy. the ending feeds the next beginning.',
      flavor: 'it eats its own tail, politely.',
      mods: { add: { ouroboros: 1 } },
    },
    stigmergy: {
      name: 'stigmergy', desc: 'cells foragers visit keep a trail forever: ambient entropy slowed 30% there. the path remembers.',
      flavor: 'the route is the writing.',
      mods: { add: { stigmergy: 1 } },
    },
    otherhand: {
      name: 'the other hand', desc: 'each turn, something tends the two worst cells touching your garden, freely, beside you.',
      flavor: 'you never see it. the soil does.',
      hooks: { turnEnd: (inst, g, p, ev) => {
        const cand = frontier(g).sort((a, b) => b.e - a.e).slice(0, 2);
        const cells = [];
        for (const c of cand) if (c.e > 0.15) {
          c.e = Math.max(0, c.e - 0.3);
          cells.push(LP.HEX.key(c.q, c.r));
        }
        if (cells.length) ev.push({ t: 'hand', cells });
      } },
    },
  };
  const LEGEND_IDS = Object.keys(C.LEGENDARIES);

  /* ── factory ── */
  C.buildArtifact = function (spec) {
    if (spec.id) {
      const L = C.LEGENDARIES[spec.id];
      const inst = {
        spec, name: L.name, rarity: 'legendary', desc: L.desc, flavor: L.flavor,
        sigilSeed: LP.U.hash32('legend:' + spec.id),
        mods: L.mods || null, hooks: null, active: null,
        charges: L.charges != null ? L.charges : (L.active ? L.active.charges : null),
      };
      if (L.hooks) {
        inst.hooks = {};
        for (const h of Object.keys(L.hooks))
          inst.hooks[h] = (g, p, ev) => L.hooks[h](inst, g, p, ev);
      }
      if (L.active) inst.active = {
        target: L.active.target,
        can: L.active.can ? (g, k) => L.active.can(inst, g, k) : null,
        why: L.active.why,
        use: (g, k, ev) => L.active.use(inst, g, k, ev),
      };
      return inst;
    }
    const p = spec.proc;
    const E = EFFECTS[p.eff];
    const name = PART_A[p.n1 % PART_A.length] + ' ' + PART_B[p.n2 % PART_B.length];
    const seed = LP.U.hash32(name + '|' + p.eff + '|' + p.tier);
    return {
      spec, name, rarity: p.tier === 1 ? 'common' : 'uncommon',
      desc: E.d[p.tier - 1], flavor: FLAVOR[seed % FLAVOR.length],
      sigilSeed: seed, mods: E.m[p.tier - 1], hooks: null, active: null, charges: null,
    };
  };

  const rollProc = (g, tier) => {
    const pool = EFFECT_IDS.filter(id => effStage(id) <= g.stage);
    return {
      proc: {
        eff: pool[g.rng.i(pool.length)], tier,
        n1: g.rng.i(PART_A.length), n2: g.rng.i(PART_B.length),
      },
    };
  };

  const rollLegend = g => {
    const owned = new Set(g.artifacts.filter(a => a.spec.id).map(a => a.spec.id));
    const pool = LEGEND_IDS.filter(id => !owned.has(id));
    if (!pool.length) return rollProc(g, 2);
    return { id: pool[g.rng.i(pool.length)] };
  };

  C.rollOffer = function (g) {
    /* the three free cards are commons & uncommons only — legendaries are no longer a
       free grab. one unowned legendary rides in a separate slot, claimable for insight. */
    const specs = [];
    const usedEff = new Set();
    for (let i = 0; i < 3; i++) {
      for (let tries = 0; tries < 8; tries++) {
        const s = rollProc(g, g.rng.f() < 0.38 ? 2 : 1);
        if (usedEff.has(s.proc.eff)) continue;
        usedEff.add(s.proc.eff);
        specs.push(s);
        break;
      }
    }
    while (specs.length < 3) specs.push(rollProc(g, 1));
    const owned = new Set(g.artifacts.filter(a => a.spec.id).map(a => a.spec.id));
    const pool = LEGEND_IDS.filter(id => !owned.has(id));
    const legend = pool.length ? { id: pool[g.rng.i(pool.length)] } : null;
    return { cards: specs, legend };
  };

  C.rollAntFind = function (g) {
    /* commons & uncommons only — legendaries are bought in the draft, not dug up free.
       (foragers instead surface relic fragments that discount the next legendary.) */
    return rollProc(g, g.rng.f() < 0.45 ? 2 : 1);
  };

  /* pretty seeds for new runs */
  C.SEED_WORDS = ['dew', 'loam', 'fern', 'vernal', 'thaw', 'spore', 'drift', 'whorl', 'sedge',
    'bracken', 'rill', 'tussock', 'lichen', 'catkin', 'frond', 'moss', 'petal', 'root'];
  C.prettySeed = function (rand) {
    const w = () => C.SEED_WORDS[Math.floor(rand() * C.SEED_WORDS.length)];
    return w() + '-' + w() + '-' + Math.floor(rand() * 900 + 100);
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = LP;
})();
