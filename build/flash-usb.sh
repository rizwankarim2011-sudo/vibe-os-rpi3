#!/bin/bash
set -euo pipefail
IMG="${1:-release/Vibe-coders-OS-Raspberry-Edition-rpi3bplus.img}"
DEV="${2:-}"
[ -f "$IMG" ] || { echo "Image not found: $IMG" >&2; exit 1; }
[ -n "$DEV" ] || { echo "Usage: $0 IMAGE /dev/sdX" >&2; exit 1; }
echo "WARNING: this will erase $DEV"
read -r -p "Type ERASE-$DEV to continue: " confirm
[ "$confirm" = "ERASE-$DEV" ] || exit 1
sudo dd if="$IMG" of="$DEV" bs=4M status=progress conv=fsync
sync
