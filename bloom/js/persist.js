;(function (root) {
  'use strict';
  const B = root.B = root.B || {};
  const KEY = 'bloom.save.v1';
  const CODEX_KEY = 'bloom.codex.v1';   // the relic kinds discovered across ALL gardens (the collection meta)

  B.Persist = {
    save: function (sim, meta) {
      try {
        const data = { sim: sim.serialize(), meta: meta || {}, at: 0 };
        localStorage.setItem(KEY, JSON.stringify(data));
        return true;
      } catch (e) { return false; }
    },
    load: function () {
      try {
        const raw = localStorage.getItem(KEY); if (!raw) return null;
        const data = JSON.parse(raw);
        return { sim: B.loadSim(data.sim), meta: data.meta || {} };
      } catch (e) { return null; }
    },
    clear: function () { try { localStorage.removeItem(KEY); } catch (e) {} },
    // a shareable seed lives in the URL hash (#seed=12345)
    seedFromHash: function () {
      const m = (location.hash || '').match(/seed=(\d+)/);
      return m ? (parseInt(m[1], 10) >>> 0) : null;
    },
    setHashSeed: function (seed) { try { history.replaceState(null, '', '#seed=' + (seed >>> 0)); } catch (e) {} },
    // the codex — relic kinds seen across every garden you've ever grown (persists independent of the save)
    codexGet: function () { try { return JSON.parse(localStorage.getItem(CODEX_KEY)) || { seen: [] }; } catch (e) { return { seen: [] }; } },
    codexAdd: function (ids) { try { const c = this.codexGet(), set = new Set(c.seen || []); (ids || []).forEach(i => set.add(i)); c.seen = Array.from(set); localStorage.setItem(CODEX_KEY, JSON.stringify(c)); return c; } catch (e) { return { seen: [] }; } },
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = B;
})(typeof globalThis !== 'undefined' ? globalThis : this);
