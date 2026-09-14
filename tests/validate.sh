#!/bin/bash
set -euo pipefail
R="$(cd "$(dirname "$0")/.." && pwd)"
python3 -m py_compile "$R/layer/vibe-os/opt/vibe-os/backend/"*.py
find "$R" -type d -name __pycache__ -prune -exec rm -rf {} +
python3 -c "import json; json.load(open('$R/layer/vibe-os/opt/vibe-os/config.json')); print('JSON OK')"
node --check "$R/layer/vibe-os/opt/vibe-os/frontend/OS.js"
node "$R/scripts/check-js-files.cjs"
bash -n "$R/build/build.sh" "$R/build/build-usb.sh" "$R/build/flash-sd.sh" "$R/build/flash-usb.sh" "$R/scripts/check-project.sh"
if find "$R" -type d -name __pycache__ -print -quit | grep -q .; then echo 'ERROR: __pycache__ present'; exit 1; fi
printf 'Validation passed.\n'
