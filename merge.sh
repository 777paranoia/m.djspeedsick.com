#!/bin/bash
# merge.sh — Concatenate modes → modes.js, engines → app.js
# Run from your project root directory

set -e

echo "=== Building modes.js ==="
cat \
  modes/modes_core.js \
  modes/mode0.js \
  modes/mode1.js \
  modes/mode2.js \
  modes/mode3.js \
  modes/mode4.js \
  modes/mode5.js \
  modes/mode6.js \
  modes/mode7.js \
  modes/mode8.js \
  modes/mode9.js \
  modes/mode-right.js \
  modes/mode-back.js \
  modes/mode-left.js \
  modes/mode-left2.js \
  modes/mode-right2.js \
  modes/mode-left3.js \
  modes/mode-cabin.js \
  > modes.js

echo "modes.js: $(wc -l < modes.js) lines"

echo "=== Building app.js ==="
cat \
  engine.js \
  engine2.js \
  engine3.js \
  brain-monitor.js \
  > app.js

echo "app.js: $(wc -l < app.js) lines"

echo "=== Syntax check ==="
node -c modes.js && echo "modes.js OK" || echo "modes.js FAIL"
node -c app.js && echo "app.js OK" || echo "app.js FAIL"

echo ""
echo "Done. Replace your script tags with:"
echo '  <script src="modes.js"></script>'
echo '  <script src="app.js"></script>'
echo ""
echo "Old tags to remove:"
echo "  All modes/mode*.js and modes/modes_core.js"
echo "  engine.js, engine2.js, engine3.js, brain-monitor.js"

sed -i '' \
  '/modes\/modes_core\.js/d;
   /modes\/mode[0-9]\.js/d;
   /modes\/mode-.*\.js/d;
   /modes\/mode-cabin\.js/d;
   /engine\.js/d;
   /engine2\.js/d;
   /engine3\.js/d;
   /brain-monitor\.js/d;
   /mode-hallway3\.js/d' index-bundle.html

# Insert the two new tags where the old block was
sed -i '' 's|<script src="lodash.js"></script>|<script src="modes.js"></script>\
<script src="app.js"></script>\
<script src="lodash.js"></script>|' index-bundle.html