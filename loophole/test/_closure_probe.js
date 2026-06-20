/* empirical probe: is a mature meadow's survival-after-base-pull genuine metabolic CLOSURE
   (autocatalytic, Kauffman) or just a long dissipative LAG (Prigogine)? grow it, pull every
   producer, then run 300 turns and watch flora/fauna/fed-flora decay. closure → it plateaus
   above zero forever; lag → it bleeds to ~0. this answers how to frame the cascade test. */
const { Game } = require('../js/core.js');
require('../js/content.js');
const cellsOf = g => [...g.cells.values()];
const g = new Game('cascade-1', { mode: 'longgame' });
const hd = c => (Math.abs(c.q) + Math.abs(c.r) + Math.abs(c.q + c.r)) / 2;
cellsOf(g).filter(c => hd(c) <= 7).sort((c, d) => (c.q - d.q) || (c.r - d.r)).forEach((c, i) => { if (i % 9 === 0) c.pat = g._mkPat('moss'); else if (i % 9 === 3) c.pat = g._mkPat('ant'); else if (i % 17 === 5) c.pat = g._mkPat('crys'); });
g._recompute();
for (let t = 0; t < 85 && g.over === false; t++) { g.order += 12; g.endTurn(); }
const flora = () => cellsOf(g).filter(c => c.pat && c.pat.t === 'flora');
const fed = () => flora().filter(c => c.pat.fedOk).length;
const roles = () => { const r = {}; for (const f of g.fauna) { const sp = g.faunaSpecies.get(f.spId); const k = sp ? sp.role : '?'; r[k] = (r[k] || 0) + 1; } return JSON.stringify(r); };
console.log(`before pull:  flora=${flora().length} fed=${fed()} fauna=${g.fauna.length} ${roles()}`);
for (const c of g.cells.values()) if (c.pat && (c.pat.t === 'moss' || c.pat.t === 'crys' || c.pat.t === 'ant')) c.pat = null;
g._recompute();
for (let t = 1; t <= 300; t++) {
  g.over = false; g.turn = Math.min(g.turn, 90); /* neutralise the turn-100 long-game end so we can watch the true long-run trend */
  g.order += 12; g.endTurn();
  if (t % 25 === 0) console.log(`  +${String(t).padStart(3)} turns:  flora=${String(flora().length).padStart(2)} fed=${String(fed()).padStart(2)} fauna=${g.fauna.length} ${roles()}`);
}
console.log(`closure verdict: ${fed() > 0 ? 'FED FLORA PERSIST → autocatalytic closure (life cross-feeds, base-independent)' : 'fed flora → 0 → it was a lag, the web unwinds'}`);
