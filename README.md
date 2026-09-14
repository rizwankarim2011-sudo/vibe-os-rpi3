# Vibe-coder's OS — Raspberry Edition 1.3.2

A Raspberry Pi 3 Model B+ focused Linux distribution layer built on the official Raspberry Pi OS / Debian ecosystem, with the Vibe-coder's OS desktop as its shell.

## Target hardware

- Raspberry Pi 3 Model B+
- BCM2837B0, ARMv8 64-bit, 1 GB RAM
- microSD boot/storage
- compatible USB mass-storage boot using the same Raspberry Pi OS-style image
- HDMI, USB keyboard/mouse, Ethernet, dual-band Wi-Fi, Bluetooth, audio, GPIO and supported CSI/DSI hardware

## What is actually customized

- Vibe-coder's OS desktop/frontend
- Local Vibe OS core service
- Workspace-confined filesystem API
- Linux system monitor API
- Safe terminal API
- Wayland + labwc session integration
- Chromium kiosk desktop shell
- Vibe Pro Shell: Windows 11-inspired Start/taskbar workflow, snap layouts, virtual desktops, desktop context menu, native Linux session lock and productivity shortcuts
- systemd-managed backend with service hardening
- Pi 3 user account, groups, hostname, locale and timezone
- GPIOZero / RPi.GPIO and libcamera development/runtime support
- NetworkManager, BlueZ, PipeWire/WirePlumber, udisks2 and GVFS
- Developer toolchain and common archive/file utilities
- Reproducible image generation through Raspberry Pi's `rpi-image-gen`

## Build

Recommended host: **native 64-bit Debian Bookworm/Trixie or Raspberry Pi OS**. Raspberry Pi's current `rpi-image-gen` documentation identifies Debian Bookworm/Trixie arm64 as the supported native host path. The repository also includes a GitHub Actions workflow using `ubuntu-24.04-arm`, with an x86_64/QEMU fallback.

Local build:

```bash
./scripts/check-project.sh
./tests/validate.sh
./build/build.sh
```

The build asks for the `vibe` account password. You can also provide it without putting it in source control:

```bash
VIBE_PASSWORD='your-strong-password' ./build/build.sh
```

For the easiest actual `.img` build, use **Actions → Build Vibe-coder's OS Raspberry Edition → Run workflow**. Create the `VIBE_PASSWORD` repository secret first. See `docs/BUILD-CI.md` for the exact procedure.

The local build produces the raw image, SHA256 checksum, compressed `.img.zst` distribution artifact, partition report and manifest in `release/`.

## SD card

Use Raspberry Pi Imager or:

```bash
./build/flash-sd.sh release/Vibe-coders-OS-Raspberry-Edition-rpi3bplus.img /dev/mmcblk0
```

## USB mass-storage boot

The Pi 3 Model B+ can use compatible USB mass-storage boot. The same image layout is used; no fake `storage_type: usb` setting is invented because `rpi-image-gen` models this Pi 3 storage target as `sd` even when the image is later written to USB storage.

```bash
./build/flash-usb.sh release/Vibe-coders-OS-Raspberry-Edition-rpi3bplus.img /dev/sdX
```

**Double-check the target device before flashing. The flash scripts intentionally erase the selected device.**

## Verification status

This source package has been statically checked for file presence, Python syntax, JavaScript syntax, YAML parsing, JSON parsing, shell syntax and systemd unit syntax in the build environment.

A physical Pi 3 B+ has **not** been attached to this session, so SD/USB boot, HDMI, Wi-Fi, Bluetooth, audio, GPIO, camera, thermals and real hardware behavior still require a hardware test. Those checks are listed in `docs/RELEASE-CHECKLIST.md`.

## Upstream foundation

Raspberry Pi OS is Debian-based and currently follows Debian Trixie. Current Raspberry Pi documentation recommends Wayland/labwc, with NetworkManager as the default network controller. `rpi-image-gen` is Raspberry Pi's official customizable image-generation tool and is pinned to v2.8.0 by default for reproducibility.

## Office & Creative Suite

The 1.3.2 image layer adds native ARM64 desktop applications from Debian Trixie: LibreOffice (Writer, Calc, Impress, Draw, Base and Math), Evince for PDF/document viewing, KolourPaint for lightweight Paint-style editing, GIMP, Inkscape, Thunderbird, and CUPS printing tools. Debian publishes these packages for arm64 in Trixie.
