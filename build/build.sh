#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ "$(id -u)" -eq 0 ]; then
  echo "Do not run this script as root. rpi-image-gen manages its own build isolation." >&2
  exit 1
fi

for cmd in git sudo; do
  command -v "$cmd" >/dev/null 2>&1 || { echo "Missing required host command: $cmd" >&2; exit 1; }
done

RPI_IMAGE_GEN_VERSION="${RPI_IMAGE_GEN_VERSION:-v2.7.0}"
if [ ! -d rpi-image-gen ]; then
  git clone --depth 1 --branch "$RPI_IMAGE_GEN_VERSION" https://github.com/raspberrypi/rpi-image-gen.git
fi

RIG="$ROOT/rpi-image-gen/rpi-image-gen"
[ -x "$RIG" ] || { echo "rpi-image-gen executable missing: $RIG" >&2; exit 1; }

sudo "$ROOT/rpi-image-gen/install_deps.sh"

# Static validation before touching the image builder.
./scripts/check-project.sh

# Validate the custom layer and resolve the complete configuration first.
"$RIG" metadata --lint "$ROOT/layer/vibe-os/vibe-os.yaml"
"$RIG" config "$ROOT/config/rpi3bplus.yaml" --path "$ROOT/config:$ROOT/layer:$ROOT" --write-to "$ROOT/build/resolved-rpi3bplus.env"

# Never put a password in source control. Supply VIBE_PASSWORD in the environment,
# or enter one interactively. rpi-image-gen enforces a strong password policy.
if [ -z "${VIBE_PASSWORD:-}" ]; then
  if [ -t 0 ]; then
    read -r -s -p "Set the Vibe user password (8+ chars, upper/lower/digit/special): " VIBE_PASSWORD
    echo
    export VIBE_PASSWORD
  else
    echo "VIBE_PASSWORD is required when no interactive terminal is available." >&2
    exit 1
  fi
fi

if [ "${#VIBE_PASSWORD}" -lt 8 ] || [[ ! "$VIBE_PASSWORD" =~ [a-z] ]] || [[ ! "$VIBE_PASSWORD" =~ [A-Z] ]] || [[ ! "$VIBE_PASSWORD" =~ [0-9] ]] || [[ ! "$VIBE_PASSWORD" =~ [@\$!%\*\?\&] ]] || [[ "$VIBE_PASSWORD" =~ [^A-Za-z0-9@\$!%\*\?\&] ]]; then
  echo "Password does not satisfy rpi-image-gen's required complexity policy." >&2
  exit 1
fi

mkdir -p release
rm -f release/Vibe-coders-OS-Raspberry-Edition-rpi3bplus.img release/Vibe-coders-OS-Raspberry-Edition-rpi3bplus.img.zst

"$RIG" build \
  -S "$ROOT" \
  -c "$ROOT/config/rpi3bplus.yaml" \
  -- IGconf_device_user1pass="$VIBE_PASSWORD"

# rpi-image-gen output paths include the resolved build/version directory.
mapfile -t IMGS < <(find "$ROOT/rpi-image-gen/work" -type f \( -name '*.img' -o -name '*.img.zst' \) -printf '%T@ %p\n' | sort -n | cut -d' ' -f2-)
[ "${#IMGS[@]}" -gt 0 ] || { echo "No disk image was produced." >&2; exit 1; }
SRC="${IMGS[${#IMGS[@]}-1]}"

case "$SRC" in
  *.img.zst)
    command -v zstd >/dev/null 2>&1 || { echo "zstd is required to unpack the generated image." >&2; exit 1; }
    zstd -d -f "$SRC" -o release/Vibe-coders-OS-Raspberry-Edition-rpi3bplus.img ;;
  *.img)
    cp --reflink=auto "$SRC" release/Vibe-coders-OS-Raspberry-Edition-rpi3bplus.img ;;
esac

sha256sum release/Vibe-coders-OS-Raspberry-Edition-rpi3bplus.img > release/Vibe-coders-OS-Raspberry-Edition-rpi3bplus.img.sha256
cat > release/Vibe-coders-OS-Raspberry-Edition-rpi3bplus-manifest.txt <<MANIFEST
Vibe-coder's OS — Raspberry Edition
Target: Raspberry Pi 3 Model B+
Architecture: ARM64
Base: Raspberry Pi OS / Debian Trixie ecosystem
Desktop: Wayland + labwc + Vibe-coder's OS shell
Boot media: microSD and compatible USB mass-storage boot
Image: Vibe-coders-OS-Raspberry-Edition-rpi3bplus.img
SHA256: $(cut -d' ' -f1 release/Vibe-coders-OS-Raspberry-Edition-rpi3bplus.img.sha256)
MANIFEST

echo "Build complete: release/Vibe-coders-OS-Raspberry-Edition-rpi3bplus.img"
