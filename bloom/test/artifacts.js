'use strict';
// Artifacts — the RPG-draw layer. A deterministic draw of named, sigil-bearing relics whose bounded effects
// are PURE HOOKS over the public sim surface (never the economy's private consts, never the sim's own rng).
// The load-bearing invariant: NO artifacts → run byte-identical to baseline → the soul test is untouched.
// Run: node bloom/test/artifacts.js
['rng', 'const', 'field', 'genome', 'flower', 'plant', 'pollinator', 'colony', 'sim', 'artifact']
  .forEach(m => require('../js/' + m + '.js'));
const B = globalThis.B;

let fails = 0, total = 0;
function ok(c, m) { total++; console.log((c ? 'PASS' : 'FAIL') + ' — ' + m); if (!c) fails++; }
function section(n) { console.log('\n· ' + n); }

// grid distance between a bee decoder and a flower grid (lower = better read)
function gridDist(decoder, grid) { let d = 0; for (let i = 0; i < grid.length; i++) if (decoder[i] !== grid[i]) d++; return d; }
function warm(seed) { const s = B.makeSim(seed); s.warmStart(); return s; }

// ── (1) the draw: deterministic, well-formed, no dup archetype ──────────────────────────────────
section('the draw');
const A = B.Artifacts;
ok(A && typeof A.draw === 'function', 'B.Artifacts.draw exists');
ok(Array.isArray(A.CATALOG) && A.CATALOG.length >= 9, `catalog has >= 9 archetypes (${A.CATALOG && A.CATALOG.length})`);

const d1 = A.draw(4242, 2), d1b = A.draw(4242, 2), d2 = A.draw(4243, 2);
ok(d1.length === 2, 'draw returns the requested count');
ok(JSON.stringify(d1.map(a => [a.archetype, a.name, a.rarity, a.params])) ===
   JSON.stringify(d1b.map(a => [a.archetype, a.name, a.rarity, a.params])), 'same seed → identical draw (deterministic)');
ok(JSON.stringify(d1.map(a => a.archetype)) !== JSON.stringify(d2.map(a => a.archetype)) ||
   JSON.stringify(d1.map(a => a.name)) !== JSON.stringify(d2.map(a => a.name)), 'different seed → different draw');
ok(new Set(d1.map(a => a.archetype)).size === d1.length, 'no duplicate archetype within one draw');

// well-formed: name, flavor, rarity, sigil-genome, hooks
const RAR = new Set(['common', 'uncommon', 'rare', 'mythic']);
let wellFormed = true, sigilOk = true;
for (const id of A.CATALOG.map(c => c.id)) {
  const art = A.make(id, 9001);
  if (!art.name || !art.flavor || !RAR.has(art.rarity) || !art.hooks) wellFormed = false;
  if (!art.sigil || typeof art.sigil.symmetry !== 'number') sigilOk = false;
}
ok(wellFormed, 'every archetype makes a named, flavored, rarity-tagged, hooked artifact');
ok(sigilOk, 'every artifact carries a genome sigil (has symmetry etc.)');

// permutation count sanity — names vary across seeds (the "thousands of permutations" claim, in miniature)
const names = new Set(); for (let s = 0; s < 200; s++) names.add(A.make('rich-loam', s).name);
ok(names.size >= 12, `one archetype yields many distinct names across seeds (${names.size})`);

// ── (2) the sigil renders as self-contained SVG in bloom's own palette ──────────────────────────
section('sigil');
const svg = A.sigilSVG(A.make('the-eddy', 7), 96);
ok(typeof svg === 'string' && svg.indexOf('<svg') === 0, 'sigilSVG returns an <svg…> string');
ok(/<rect|<path|<circle/.test(svg), 'sigil draws real marks');
ok(B.PAL.some(hex => svg.toLowerCase().indexOf(hex.toLowerCase()) >= 0), "sigil uses the world's palette");

// ── (3) THE INVARIANT: no artifacts → byte-identical to baseline ────────────────────────────────
section('non-interference (the guardrail)');
function runFit(seed, applyEmpty) {
  const s = warm(seed);
  if (applyEmpty) s.applyArtifacts([]);        // the seam is exercised, but with nothing drawn
  for (let t = 0; t < 400; t++) s.tick();
  return { fit: s.meanFit(), pop: s.colonies.reduce((n, c) => n + c.bees.length, 0), plants: s.plants.length,
           rng: s.rng.state() };
}
const base = runFit(31, false), withEmpty = runFit(31, true);
ok(base.fit === withEmpty.fit && base.pop === withEmpty.pop && base.plants === withEmpty.plants,
   'applyArtifacts([]) changes nothing (fit/pop/plants identical)');
ok(base.rng === withEmpty.rng, 'the seam never touches the sim rng stream (state identical)');

// ── (4) effects are REAL and MEASURABLE (per-hook contracts) ────────────────────────────────────
section('effects');

// rich-loam: deepens the garden over time (grows niches — the honest "lusher garden" lever)
(function () {
  const s = warm(11); const art = A.make('rich-loam', 5); s.applyArtifacts([art]);
  const before = s.plants.reduce((n, p) => n + (p.niches || 1), 0);
  for (let k = 1; k <= 24; k++) art.hooks.onTick(s, art.params.every * k);
  const after = s.plants.reduce((n, p) => n + (p.niches || 1), 0);
  ok(after > before, `rich-loam deepens the garden over time (niches ${before} → ${after})`);
})();

// honest-bloom: pins exactly one flower to honesty=1, lace=0 — and holds it against erosion
(function () {
  const s = warm(12); const art = A.make('honest-bloom', 5); s.applyArtifacts([art]);
  const pinned = s.allFlowers().filter(f => f.honesty === 1 && f.lace === 0);
  ok(pinned.length >= 1, 'honest-bloom makes at least one incorruptible flower');
  const f = pinned[0]; f.honesty = 0.4; f.lace = 0.4;              // selection tries to corrupt it…
  art.hooks.onTick(s, s.tickCount);
  ok(f.honesty === 1 && f.lace === 0, 'honest-bloom holds its flower honest against erosion');
})();

// poincaré recurrence: rewinds the colony's keys to the opening — once
(function () {
  const s = warm(13); const art = A.make('poincare-recurrence', 5); s.applyArtifacts([art]);
  const b = s.colonies[0].bees[0]; const snap = Int8Array.from(b.key.decoder);
  for (let i = 0; i < b.key.decoder.length; i++) b.key.decoder[i] = (b.key.decoder[i] + 3) % 8;  // the dance moves on
  const moved = gridDist(b.key.decoder, snap);
  s.useArtifact('poincare-recurrence', 'recur');
  const after = gridDist(s.colonies[0].bees[0].key.decoder, snap);
  ok(moved > 0 && after < moved, `recurrence rewinds keys toward the opening (dist ${moved} → ${after})`);
  for (let i = 0; i < b.key.decoder.length; i++) b.key.decoder[i] = (b.key.decoder[i] + 3) % 8;
  const movedAgain = gridDist(s.colonies[0].bees[0].key.decoder, snap);
  s.useArtifact('poincare-recurrence', 'recur');                   // second pull…
  ok(gridDist(s.colonies[0].bees[0].key.decoder, snap) === movedAgain, 'recurrence is one-shot (no second rewind)');
})();

// maxwell-demon: sorts each poorly-fed forager toward the flower IT prefers → per-bee mismatch falls
(function () {
  const s = warm(14); const art = A.make('maxwell-demon', 5); s.applyArtifacts([art]);
  const bees = s.colonies[0].bees;
  const nearestByHue = (hue) => s.allFlowers().slice().sort((a, b) =>
    Math.abs(((a.beaconHue - hue + 1.5) % 1) - 0.5) - Math.abs(((b.beaconHue - hue + 1.5) % 1) - 0.5))[0];
  const misfit = () => bees.reduce((x, b) => { const f = nearestByHue(b.key.preference); return x + (f ? gridDist(b.key.decoder, f.grid) : 0); }, 0) / (bees.length || 1);
  const pre = misfit();
  for (let t = 0; t <= 20 * 16; t++) art.hooks.onTick(s, t);
  const post = misfit();
  ok(post < pre, `maxwell-demon sorts each forager toward its own niche (mean mismatch ${pre.toFixed(1)} → ${post.toFixed(1)})`);
})();

// the-eddy: order held against the drift — each forager reinforces the flower it fed on (its own best read)
(function () {
  const s = warm(15); const art = A.make('the-eddy', 5); s.applyArtifacts([art]);
  const fed = s.colonies[0].bees.filter(b => b.lastGrid);
  ok(fed.length > 0, 'the-eddy: foragers have fed (lastGrid set)');
  const dist = () => fed.reduce((x, b) => x + gridDist(b.key.decoder, b.lastGrid), 0) / (fed.length || 1);
  const pre = dist();
  for (let t = 0; t <= art.params.every * 30; t++) art.hooks.onTick(s, t);
  const post = dist();
  ok(post <= pre, `the-eddy holds each forager's read against the drift (dist ${pre.toFixed(1)} → ${post.toFixed(1)})`);
  ok(art.rarity === 'mythic', 'the-eddy is mythic');
})();

// ── (5) BOUNDEDNESS: the worst-case full-catalog draw still leaves a living world ────────────────
section('boundedness (no draw can death-spiral)');
for (const seed of [21, 88]) {
  const s = warm(seed);
  const all = A.CATALOG.map(c => A.make(c.id, seed + c.id.length));   // every archetype at once
  s.applyArtifacts(all);
  for (let t = 0; t < 2500; t++) s.tick();
  const pop = s.colonies.reduce((n, c) => n + c.bees.length, 0), fit = s.meanFit();
  ok(pop > 0 && s.plants.length > 0, `seed ${seed}: full-catalog draw leaves a living world (pop ${pop}, plants ${s.plants.length})`);
  ok(fit >= 0 && fit <= 1 && fit === fit, `seed ${seed}: fitness stays finite and in range (${fit.toFixed(2)})`);
}

console.log(`\n${fails ? 'FAIL' : 'ALL PASS'} — ${total - fails}/${total}`);
process.exit(fails ? 1 : 0);
