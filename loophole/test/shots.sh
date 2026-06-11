#!/bin/bash
# capture game-state screenshots via headless chrome
# usage: bash test/shots.sh [shot...]   (default: a standard set)
cd "$(dirname "$0")/.."
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PROF="$HOME/.cache/loophole-chrome-prof"
mkdir -p shots
SHOTS=("$@")
if [ ${#SHOTS[@]} -eq 0 ]; then SHOTS=(title early mid late offer echo help end awaken); fi
for s in "${SHOTS[@]}"; do
  budget=4000
  if [ "$s" = "awaken" ]; then budget=16000; fi
  if [ "$s" = "end" ]; then budget=6000; fi
  "$CHROME" --headless=new --disable-gpu --user-data-dir="$PROF" \
    --hide-scrollbars --window-size=1380,900 --virtual-time-budget=$budget \
    --screenshot="$PWD/shots/$s.png" "file://$PWD/index.html?shot=$s" >/dev/null 2>&1 &
  CPID=$!
  for i in $(seq 1 40); do
    sleep 0.5
    [ -f "shots/$s.png" ] && sleep 1 && break
  done
  kill $CPID 2>/dev/null
  wait $CPID 2>/dev/null
  echo "shot: $s $([ -f shots/$s.png ] && echo ok || echo MISSING)"
done
