;(function (root) {
  'use strict';
  const E = root.E = root.E || {};
  const KEY = 'eddy.save.v1';
  // Thin persistence interface over localStorage. A backend can replace these three
  // methods later (cloud saves, shared worlds) without the sim knowing.
  E.Persist = {
    save(sim) {
      if (typeof localStorage === 'undefined') return false;
      try { localStorage.setItem(KEY, JSON.stringify(sim.serialize())); return true; }
      catch (e) { return false; }
    },
    load() {
      if (typeof localStorage === 'undefined') return null;
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      try { return E.makeSim(0, JSON.parse(raw)); } catch (e) { return null; }
    },
    clear() { if (typeof localStorage !== 'undefined') localStorage.removeItem(KEY); },
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = E;
})(typeof globalThis !== 'undefined' ? globalThis : this);
