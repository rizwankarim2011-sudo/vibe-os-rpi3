# Upstreams and compatibility

- Raspberry Pi OS: Debian Trixie-based Raspberry Pi OS ecosystem.
- rpi-image-gen: pinned by default to v2.7.0; override with `RPI_IMAGE_GEN_VERSION` only when deliberately upgrading.
- Target board: Raspberry Pi 3 Model B+ (BCM2837B0, ARMv8 64-bit, 1GB RAM).
- Display/session: Wayland + labwc. Raspberry Pi documents Wayland as the recommended path on current Raspberry Pi OS.
- Networking: NetworkManager.
- Audio: PipeWire + WirePlumber.
- Browser shell: Debian Trixie arm64 Chromium.

This project does not redistribute Raspberry Pi OS proprietary material; the build pulls packages and official image-generation components from their normal upstream sources.
