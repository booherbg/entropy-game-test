;(function (root) {
  'use strict';
  const B = root.B = root.B || {};
  B.TAU = Math.PI * 2;

  // The world grid (cells). Low-res on purpose — scaled up crisp (nearest-neighbour) at render.
  B.W = 96;
  B.H = 64;

  // The shared pixel-art palette. 8 saturated-but-organic indices. Colour = energy = life.
  // index 8 (== PAL.length) is the EMPTY sentinel used by the decode-grid so empty matches empty.
  B.PAL = ['#e0604c', '#f0b870', '#ecd24a', '#9fd98f', '#5fc0a8', '#6fb0f0', '#9a7bd0', '#e08ac0'];
  B.EMPTY = 8;

  // palette as [r,g,b] for the renderers (parsed once)
  B.PAL_RGB = B.PAL.map(function (h) {
    const n = parseInt(h.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  });
  B.PAL_RGB[B.EMPTY] = [12, 14, 18]; // empty reads as dark loam

  // decode-grid size (N×N). 6 balances legibility vs expressiveness (spec §9 open question — start 6).
  B.N = 6;

  if (typeof module !== 'undefined' && module.exports) module.exports = B;
})(typeof globalThis !== 'undefined' ? globalThis : this);
