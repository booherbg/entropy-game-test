;(function (root) {
  'use strict';
  const B = root.B = root.B || {};
  const KEY = 'bloom.save.v1';

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
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = B;
})(typeof globalThis !== 'undefined' ? globalThis : this);
