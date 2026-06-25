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

  if (typeof module !== 'undefined' && module.exports) module.exports = E;
})(typeof globalThis !== 'undefined' ? globalThis : this);
