;(function (root) {
  'use strict';
  const E = root.E = root.E || {};

  // The economy of flow — the "push against." A flourishing world pays you flow (a dividend on its
  // diversity and order); springs and seeds cost flow. So stewardship is finite and consequential: a
  // rich world funds its own growth, a neglected one starves you of the means to fix it (a soft death
  // spiral). The tension is the world's own thermodynamics, given a budget.
  E.makeEconomy = function () {
    let flow = 200; // starting budget — enough for the first spring or two
    const COST = { spring: 120, primer: 8, hunter: 40 };

    function income(sim) {
      const s = E.score ? E.score(sim) : { diversity: 0, order: 0 };
      flow += 0.025 * s.diversity + 0.004 * s.order; // a living world pays a dividend
      if (flow > 9999) flow = 9999;
    }
    function can(what) { return flow >= (COST[what] || 0); }
    function spend(what) { if (!can(what)) return false; flow -= (COST[what] || 0); return true; }
    return { COST, income, can, spend, flow: () => flow, set: (v) => { flow = v; } };
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = E;
})(typeof globalThis !== 'undefined' ? globalThis : this);
