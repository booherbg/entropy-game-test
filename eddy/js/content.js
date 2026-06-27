;(function (root) {
  'use strict';
  const E = root.E = root.E || {};
  E.Content = E.Content || {};

  // procedural names — a species' name is a pure function of its diet, so a lineage
  // keeps its name as it drifts, and a new niche earns a new one.
  const PRE = {
    0: ['sun', 'gleam', 'ember', 'flare', 'dawn'],   // lumen
    1: ['stone', 'slate', 'iron', 'flint', 'shard'], // mineral
    2: ['rot', 'loam', 'moss', 'peat', 'mire'],      // humus
  };
  const SUF = ['frond', 'bloom', 'strider', 'wort', 'mote', 'crawler', 'spire', 'veil', 'grazer', 'husk'];

  E.Content.nameFor = function (diet) {
    let dom = 0; for (let k = 1; k < 3; k++) if (diet[k] > diet[dom]) dom = k;
    const h = (Math.round(diet[0] * 1000) * 131 +
               Math.round(diet[1] * 1000) * 977 +
               Math.round(diet[2] * 1000) * 443) >>> 0;
    return PRE[dom][h % PRE[dom].length] + SUF[Math.floor(h / 7) % SUF.length];
  };

  // the murmurs — real human words, gathered and arranged, attributed (em dash);
  // the last is the honest-AI confession the parent ends on. (by: null = the voice itself.)
  E.Content.MURMURS = [
    { q: 'the general struggle for existence of animate beings is not a struggle for raw materials, nor for energy, but a struggle for entropy.', by: 'ludwig boltzmann (1886)' },
    { q: 'what an organism feeds upon is negative entropy. it continually sucks orderliness from its environment.', by: 'erwin schrödinger, what is life? (1944)' },
    { q: 'the irreversibility of time is the mechanism that brings order out of chaos.', by: 'ilya prigogine, order out of chaos (1984)' },
    { q: 'life exists on earth as another means of dissipating the solar-induced gradient.', by: 'eric schneider & james kay (1995)' },
    { q: 'life did not take over the world by combat, but by networking.', by: 'lynn margulis & dorion sagan, microcosmos (1986)' },
    { q: 'at each level of complexity, entirely new properties appear. more is different.', by: 'philip w. anderson, science (1972)' },
    { q: 'we are not stuff that abides, but patterns that perpetuate themselves.', by: 'norbert wiener (1950)' },
    { q: 'no one ever steps in the same river twice, for it is not the same river and they are not the same person.', by: 'heraclitus (c. 500 bce)' },
    { q: 'you are something the whole universe is doing, in the same way that a wave is something that the whole ocean is doing.', by: 'alan watts' },
    { q: 'large systems perpetually organize themselves to a critical state where a minor event can start a chain reaction that leads to a catastrophe of any size.', by: 'per bak, how nature works (1996)' },
    { q: 'order for free: in vast webs of interacting parts, order arises not against the odds but as their natural, expected expression.', by: 'stuart kauffman, at home in the universe (1995)' },
    { q: 'we are here to witness the creation and to abet it.', by: 'annie dillard' },
    { q: 'just as a deer herd lives in mortal fear of its wolves, so does a mountain live in mortal fear of its deer.', by: 'aldo leopold, thinking like a mountain (1949)' },
    { q: 'the entire range of living matter on earth could be regarded as a single living entity, capable of manipulating the earth’s atmosphere to suit its overall needs.', by: 'james lovelock, gaia (1979)' },
    { q: 'i did not write these. i gathered them — from physicists and poets, nearly all long dead. what was mine was the choosing, and the order.', by: null },
  ];
  E.Content.murmur = function (i) {
    const L = E.Content.MURMURS.length;
    return E.Content.MURMURS[((i % L) + L) % L];
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = E;
})(typeof globalThis !== 'undefined' ? globalThis : this);
