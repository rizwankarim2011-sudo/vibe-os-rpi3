#!/bin/bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
fail=0
need=(
  "README.md" "build/build.sh" "build/build-windows.ps1" "config/rpi3bplus.yaml"
  "layer/vibe-os/vibe-os.yaml" "layer/vibe-os/usr/local/bin/vibe-shell"
  "layer/vibe-os/etc/xdg/labwc/autostart" "layer/vibe-os/systemd/vibe-os-backend.service"
  "layer/vibe-os/opt/vibe-os/backend/core.py" "layer/vibe-os/opt/vibe-os/backend/filesystem.py"
  "layer/vibe-os/opt/vibe-os/backend/system.py" "layer/vibe-os/opt/vibe-os/frontend/OS.html"
  "layer/vibe-os/opt/vibe-os/frontend/OS.css" "layer/vibe-os/opt/vibe-os/frontend/OS.js"
)
for f in "${need[@]}"; do [ -f "$ROOT/$f" ] || { echo "MISSING: $f"; fail=1; }; done
find "$ROOT" -type d -name __pycache__ -prune -exec rm -rf {} +
python3 -m py_compile "$ROOT"/layer/vibe-os/opt/vibe-os/backend/*.py
python3 - <<PY
import json
from pathlib import Path
json.loads(Path('$ROOT/layer/vibe-os/opt/vibe-os/config.json').read_text())
print('JSON: OK')
PY
if command -v node >/dev/null 2>&1; then node --check "$ROOT/layer/vibe-os/opt/vibe-os/frontend/OS.js"; echo 'JavaScript: OK'; fi
python3 - <<PY
from pathlib import Path
for p in [Path('$ROOT/config/rpi3bplus.yaml'),Path('$ROOT/layer/vibe-os/vibe-os.yaml')]:
    assert '\t' not in p.read_text(), f'Tabs in {p}'
print('YAML lexical checks: OK')
PY
bash -n "$ROOT/build/build.sh" "$ROOT/tests/validate.sh" "$ROOT/scripts/check-project.sh"
chmod +x "$ROOT/build/build.sh" "$ROOT/tests/validate.sh" "$ROOT/scripts/check-project.sh" "$ROOT/layer/vibe-os/usr/local/bin/vibe-shell" "$ROOT/layer/vibe-os/etc/xdg/labwc/autostart"
[ "$fail" -eq 0 ]
echo 'Project structure and static validation: PASSED'
