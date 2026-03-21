#!/usr/bin/env bash

set -e

OUT="bundle.js"

echo "Building $OUT..."

rm -f "$OUT"

append() {
  for f in "$@"; do
    echo "" >> "$OUT"
    echo "/* ===== $f ===== */" >> "$OUT"
    cat "$f" >> "$OUT"
    echo "" >> "$OUT"
  done
}


append \
mode-back.js \mode-cabin.js \mode-hallway3.js \mode-left.js \zmode-left2.js \ mode-left3.js \ mode-right.js \ mode-right2.js \ mode1.js \ mode2.js \ mode3.js \ mode4.js \ mode5.js \ mode6.js \ mode7.js \ mode8.js \ mode9.js \ modes_core.js \ 
brain-monitor.js \

# Engines last
append \
engine.js \
engine2.js \
engine3.js \ 


echo "Bundle created: $OUT"
