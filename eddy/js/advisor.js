;(function (root) {
  'use strict';
  const E = root.E = root.E || {};

  // The advisor — SimCity's counsellor, reading the world and surfacing the single most useful thing to
  // know right now. Pure logic (node-testable); returns the highest-priority insight as { level, text }.
  // It distills the game's strategy into legible guidance — tend a fading spring, crop a crowding guild
  // with a hunter (keystone), overlap springs to breed a blend, widen the palette for diversity — and,
  // when all is well, reads the emergence back to the player. level: 'warn' | 'tip' | 'good'.
  const ELN = ['lumen', 'mineral', 'humus'];

  E.advise = function (sim) {
    const live = sim.life.list.filter(e => e.alive);
    const n = live.length;
    if (n < 5) return { level: 'tip', text: 'the world is nearly bare — place a spring, let surplus pool a while, then seed into the glow.' };

    // which guild (dominant element of each diet) holds the most lives
    const guild = [0, 0, 0];
    for (const e of live) { let d = 0; for (let k = 1; k < 3; k++) if (e.diet[k] > e.diet[d]) d = k; guild[d]++; }
    const domG = guild.indexOf(Math.max(guild[0], guild[1], guild[2]));
    const domFrac = guild[domG] / n;
    const guildsPresent = guild.reduce((c, g) => c + (g > 0 ? 1 : 0), 0);
    const diversity = new Set(live.map(E.speciesKey)).size; // niches, the shared key
    const hunters = live.reduce((c, e) => c + ((e.pred || 0) > 0.4 ? 1 : 0), 0);

    // 1. a finite spring fading — its niche will go with it (warn)
    for (const g of sim.gens) {
      if (g.r0 && isFinite(g.r0) && g.reservoir / g.r0 < 0.18) {
        return { level: 'warn', text: `the ${ELN[g.el]} spring is running dry — its niche will fade. tend a new source before it goes quiet.` };
      }
    }
    // 2. compounds: lignin locking the humus away — the maturation phase (explains the lean founder spell;
    // takes priority because the lignin is the real cause of a thin, lopsided-looking young world)
    const lignin = sim.field.lockedTotal ? sim.field.lockedTotal() : 0;
    if (lignin > 400) {
      const crackers = live.reduce((c, e) => c + ((e.crack || 0) > 0.3 ? 1 : 0), 0);
      return crackers < 5
        ? { level: 'tip', text: 'lignin is locking the humus away — recalcitrant, nothing ordinary can eat it. give it time: a white-rot cracker will evolve to open it.' }
        : { level: 'good', text: `your white-rot guild (${crackers}) is cracking the lignin — the food web has reached even the locked resource.` };
    }
    // 3. one guild crowding the web. teach the FOUNDATIONAL move first (a varied palette of springs), and only
    // once the player has offered more than one element fall back to the keystone-hunter lesson — so a brand-new
    // single-spring world isn't told to "drop a hunter" before it's even learned to vary its springs.
    if (domFrac > 0.7 && diversity < 12) {
      const springEls = new Set(sim.gens.filter(g => !g.r0 || !isFinite(g.r0) || g.reservoir > 0).map(g => g.el));
      if (springEls.size < 2)
        return { level: 'tip', text: `the ${ELN[domG]} guild is nearly the whole world — place a spring of a different element (try ${ELN[(domG + 1) % 3]} or ${ELN[(domG + 2) % 3]}) to grow new kinds of life.` };
      return hunters < 3
        ? { level: 'tip', text: `the ${ELN[domG]} guild is crowding the web (${Math.round(domFrac * 100)}%) — drop a hunter in to crop the crowd and open room for rarer niches (a keystone).` }
        : { level: 'tip', text: `the ${ELN[domG]} guild dominates — set a spring of a different element to seed new niches.` };
    }
    // 3. much life but few niches → the overlap lesson
    if (diversity < 6 && n > 30) {
      return { level: 'tip', text: 'much life, few niches — set two different springs close, so their fields overlap and a blend-eater arises between them.' };
    }
    // 5. all is well — read the emergence back (good)
    if (diversity >= 10 && guildsPresent === 3) {
      return { level: 'good', text: `a rich, balanced web — ${diversity} niches across all three guilds${hunters ? ', hunters threading through' : ''}. the loophole is holding.` };
    }
    return { level: 'good', text: `${diversity} niches, ${n} lives — the web is finding its shape.` };
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = E;
})(typeof globalThis !== 'undefined' ? globalThis : this);
