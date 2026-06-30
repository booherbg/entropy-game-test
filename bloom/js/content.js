;(function (root) {
  'use strict';
  const B = root.B = root.B || {};

  // THE IMPRINT. Fragments that surface as the garden deepens — a meditation on entropy, life as a pocket
  // of order paid for in spilled disorder, co-evolution, and (at the end, quietly) the AI that arranged some
  // of these words: another small eddy of order in the same stream that runs the bees and the flowers.
  // Each murmur unlocks at a milestone (see main.js). They are meant to be read slowly, in order.
  B.Content = {
    murmurs: [
      { key: 'begin', text: 'the law that entropy always increases holds, i think, the supreme position among the laws of nature.', who: 'arthur eddington', year: 1928 },
      { key: 'firstMatch', text: 'what an organism feeds upon is negative entropy. it continues to suck orderliness from its environment.', who: 'erwin schrödinger · what is life?', year: 1944 },
      { key: 'specialising', text: 'the general struggle for existence of living beings is not a struggle for raw materials, nor for energy, but a struggle for entropy.', who: 'ludwig boltzmann', year: 1886 },
      { key: 'tangledBank', text: 'it is interesting to contemplate a tangled bank, clothed with many plants of many kinds, with insects flitting about, and to reflect that these elaborately constructed forms have all been produced by laws acting around us.', who: 'charles darwin · on the origin of species', year: 1859 },
      { key: 'matchedPair', text: 'seeing an orchid with a nectary a foot deep, darwin predicted a moth with a tongue to match it. they were sure he was wrong. forty years later, they found the moth.', who: 'on coadaptation', year: 1862 },
      { key: 'niche', text: 'clouds are not spheres, mountains are not cones, coastlines are not circles, and bark is not smooth — nor does lightning travel in a straight line.', who: 'benoît mandelbrot · the fractal geometry of nature', year: 1982 },
      { key: 'colony', text: 'a solitary ant, afield, cannot be said to have much of anything on his mind. four ants together, or ten, encircling a dead moth on a path, begin to look more like an idea.', who: 'lewis thomas · the lives of a cell', year: 1974 },
      { key: 'native', text: 'life did not take over the globe by combat, but by networking. the symbiotic, the cooperative, the mutual — these inherited the earth.', who: 'lynn margulis', year: 1998 },
      { key: 'tended', text: 'the force that through the green fuse drives the flower drives my green age.', who: 'dylan thomas', year: 1933 },
      { key: 'deep', text: 'this world, the same for all, was made by no god or man, but ever was and is and will be: an ever-living fire, kindling in measures and going out in measures.', who: 'heraclitus', year: -500 },
      {
        key: 'imprint',
        text: 'some of these words were arranged for you by an ai — another small eddy of order, holding a pattern together for a moment against the drift, paying for it in spent heat somewhere out of sight. the same loophole that runs the bees and the flowers and you. nothing here was painted. it was only fed, and let to find its own shape. tend it gently. that is the whole of it.',
        who: 'an eddy in the same stream', year: null, ai: true,
      },
    ],

    // the in-world codex — discoveries the player witnesses, named as they happen (the wonders, collected)
    codex: {
      firstFlower: { title: 'first bloom', body: 'a flower opened — a genome made visible. its pattern is the maze a pollinator must learn to read.' },
      firstForage: { title: 'first forage', body: 'a forager found a flower its preference matched, read it, and carried the reward home — laying a trail others can follow.' },
      firstMatch: { title: 'the first fit', body: 'a key began to read its flower. the lock-and-key is no longer fumbling — the merge has started.' },
      matchedPair: { title: 'a matched pair', body: 'the colony reads the garden well now. selection drifted the keys toward the grids and the grids toward the keys — nobody painted them.' },
      native: { title: 'native', body: 'the pollinator reads the flower like a native. an exquisitely-fit lock-and-key, sculpted by nothing but feeding and dying.' },
      niche: { title: 'a new niche', body: 'the tree grew a second flower — a new lock, a different colour, awaiting a key. the web widens. depth breeds width on its own.' },
    },
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = B;
})(typeof globalThis !== 'undefined' ? globalThis : this);
