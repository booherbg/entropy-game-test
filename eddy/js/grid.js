;(function (root) {
  'use strict';
  const E = root.E = root.E || {};
  E.W = 160; E.H = 100;
  E.LUM = 0; E.MIN = 1; E.HUM = 2; E.NEL = 3;
  E.idx = function (x, y) { return y * E.W + x; };
  // visit existing 4-neighbours of cell index i (no wrap; domain is closed → conserves mass)
  E.forNeighbors = function (i, fn) {
    const x = i % E.W, y = (i / E.W) | 0;
    if (x > 0) fn(i - 1); if (x < E.W - 1) fn(i + 1);
    if (y > 0) fn(i - E.W); if (y < E.H - 1) fn(i + E.W);
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = E;
})(typeof globalThis !== 'undefined' ? globalThis : this);
