#!/bin/bash
set -euo pipefail
# Pi 3 B+ USB mass-storage boot uses the same Raspberry Pi OS-style image layout.
# Build the canonical image once, then write that image to a compatible USB drive.
exec "$(dirname "$0")/build.sh"
