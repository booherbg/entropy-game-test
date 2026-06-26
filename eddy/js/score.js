;(function (root) {
  'use strict';
  const E = root.E = root.E || {};

  // The aspects — three ways to flourish, inherited from the parent. You choose one to pursue; the
  // world's entropy (springs draining, the 2nd-law sink) is what you pursue it against.
  //  · weaver  — diversity (a rich, many-niched world)
  //  · stiller — order (living biomass held against entropy)
  //  · burning — throughput (the gradient dissipated at full tilt — the title's true thermodynamic sense)
  E.ASPECTS = [
    { key: 'weaver', name: 'weaver', of: 'diversity' },
    { key: 'stiller', name: 'stiller', of: 'order' },
    { key: 'burning', name: 'burning', of: 'throughput' },
  ];

  // diversity counts niches via the shared E.speciesKey (defined in life.js), so the number the player
  // pursues, the criticality analysis, and keystone predation all mean the same thing by "species".
  E.score = function (sim) {
    const live = sim.life.list.filter(e => e.alive);
    const keys = new Set(live.map(E.speciesKey));
    const diversity = keys.size;
    let order = 0; for (const e of live) order += e.biomass;
    const throughput = sim.burnRate ? sim.burnRate() : 0;
    const flourish = diversity * 4 + order * 0.4 + throughput * 8; // composite, diversity-weighted
    return {
      diversity, order: Math.round(order * 10) / 10,
      throughput: Math.round(throughput * 100) / 100,
      flourish: Math.round(flourish),
    };
  };

  // The food web, read live — who is making a living, and how. A creature's guild is the element it eats
  // most; a humus-eater is a decomposer (it lives on the others' waste); a high-pred creature is a hunter.
  // Pure (node-testable); the data behind a "who eats whom" reading of the world.
  E.foodWeb = function (sim) {
    const live = sim.life.list.filter(e => e.alive);
    const guild = [0, 0, 0], biomass = [0, 0, 0];
    let hunters = 0;
    for (const e of live) {
      let d = 0; for (let k = 1; k < E.NEL; k++) if (e.diet[k] > e.diet[d]) d = k;
      guild[d]++; biomass[d] += e.biomass;
      if ((e.pred || 0) > 0.4) hunters++;
    }
    const links = []; // the flows carrying matter right now
    if (guild[E.LUM]) links.push('lumen → ' + guild[E.LUM] + ' producers');
    if (guild[E.MIN]) links.push('mineral → ' + guild[E.MIN] + ' producers');
    if (guild[E.HUM]) links.push(guild[E.HUM] + ' decomposers ← waste');
    if (hunters) links.push(hunters + ' hunters → prey');
    return {
      total: live.length,
      lumen: guild[E.LUM], mineral: guild[E.MIN], decomposers: guild[E.HUM], hunters,
      biomass: biomass.map(b => Math.round(b * 10) / 10),
      links,
    };
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = E;
})(typeof globalThis !== 'undefined' ? globalThis : this);
