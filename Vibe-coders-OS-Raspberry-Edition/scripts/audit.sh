#!/bin/bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
echo '[1/6] Project structure'
./scripts/check-project.sh
echo '[2/6] Static validation'
./tests/validate.sh
echo '[3/6] Python compile'
python3 -m py_compile layer/vibe-os/opt/vibe-os/backend/*.py
find . -type d -name __pycache__ -prune -exec rm -rf {} +
echo '[4/6] JSON/YAML lexical validation'
python3 - <<'PY'
import json
from pathlib import Path
json.loads(Path('layer/vibe-os/opt/vibe-os/config.json').read_text())
for p in [Path('config/rpi3bplus.yaml'), Path('layer/vibe-os/vibe-os.yaml')]:
    text=p.read_text(); assert '\t' not in text; assert text.strip()
print('Config files: OK')
PY
echo '[5/6] Shell scripts'
bash -n build/*.sh scripts/*.sh tests/*.sh
echo '[6/6] Archive hygiene'
if find . -type d -name __pycache__ -o -name '*.pyc' | grep -q .; then echo 'Generated Python artifacts found'; exit 1; fi
printf 'FULL STATIC AUDIT: PASSED\n'
