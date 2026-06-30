# bloom

*a pixel-art garden where you coax a flowering mother tree and a colony of pollinators into a co-evolving
symbiosis — and watch natural selection sculpt a random, fumbling lock-and-key into an exquisitely-fit pair
before your eyes.*

A factory whose machines are alive. Determinism gives legibility; mutation gives wonder; the same system
gives both. Vanilla HTML/Canvas/JS, zero dependencies, saves to localStorage.

**▶ Play it live:** https://blainebooher.com/entropy-game-test/bloom/ (or https://booherbg.github.io/entropy-game-test/bloom/)
— the world breathes on its own; pause to make weighed moves. Add `?warp=2500` to skip ahead to a merged
garden, or `#seed=42` to grow a specific one (the same seed always grows the same garden).

- **Design:** `../docs/superpowers/specs/2026-06-30-bloom-plant-pollinator-prototype-design.md`
- **Live mechanisms reference:** `../docs/bloom-mechanisms.html`
- **Build plan:** `../docs/superpowers/plans/2026-06-30-bloom-prototype.md`

## Run the tests
```
node bloom/test/harness.js     # the deterministic assertion harness
node bloom/test/soul.js        # the soul test: the fumbling pair co-adapts into a matched lock-and-key
node bloom/test/shot.js 400 opening   # headless PNG of the world → bloom/shots/
```

## Play
Open `bloom/index.html` in a browser. The world breathes on its own; pause to make weighed moves.

*Lineage: LOOPHOLE → eddy → bloom. eddy's sim discipline (conserved field, seeded RNG, node-test harness)
is a reference, not a dependency.*
