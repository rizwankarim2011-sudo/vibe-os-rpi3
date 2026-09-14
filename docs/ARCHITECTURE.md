# Vibe-coder's OS — Raspberry Edition architecture

## Boot and session

Firmware/bootloader → Raspberry Pi Linux kernel → systemd → device/user session → Wayland/labwc → `/etc/xdg/labwc/autostart` → `vibe-shell` → Chromium kiosk → Vibe desktop.

## Core service

`vibe-os-backend.service` runs as the unprivileged `vibe` user and binds only to `127.0.0.1:8765`. The browser cannot use the API as an unrestricted PC file manager: the filesystem bridge resolves every path and rejects anything outside `/home/vibe/Workspace`.

## Hardware target

The Pi 3 B+ has a 64-bit BCM2837B0 Cortex-A53 at 1.4 GHz, 1 GB RAM, dual-band Wi-Fi, Bluetooth 4.2, four USB 2.0 ports, HDMI, CSI, DSI and microSD. The build therefore favors ARM64, Wayland/labwc, modest background services and a kiosk shell rather than a heavy desktop environment.

## Storage

The generated image uses the Raspberry Pi OS-style MBR + FAT boot + ext4 root layout. The same image is suitable for microSD and compatible USB mass-storage boot on a Pi 3 B+; the `flash-sd.sh` and `flash-usb.sh` scripts are deliberately separate to reduce accidental device selection.

## Security boundaries

- No default password is committed.
- The build prompts for the `vibe` user's password unless `VIBE_PASSWORD` is supplied.
- The backend is local-only.
- The backend service is sandboxed with systemd hardening where compatible.
- The web filesystem API is workspace-confined.
- The browser shell has no need for root privileges.
