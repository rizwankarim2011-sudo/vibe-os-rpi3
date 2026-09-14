# Raspberry Pi 3 Model B+ profile

## Target

- Raspberry Pi 3 Model B+
- ARMv8 / AArch64
- 1 GB RAM
- microSD boot/storage
- USB 2.0 host ports and compatible USB mass-storage boot
- onboard dual-band Wi-Fi and Bluetooth
- HDMI
- GPIO / I2C / SPI / UART
- CSI camera and DSI display interfaces

## Image profile

- Raspberry Pi OS / Debian Trixie ecosystem
- `rpi3` device layer
- ARM64
- Raspberry Pi OS-style MBR image
- ext4 root filesystem
- 512 MiB boot partition
- 12 GiB root partition before any future expand-to-fit policy
- Wayland + labwc
- NetworkManager / BlueZ
- PipeWire / WirePlumber
- libcamera tooling
- GPIOZero

The current Raspberry Pi documentation lists 64-bit Raspberry Pi OS as compatible with the 3B+, and Raspberry Pi documents USB mass-storage boot as supported out of the box on the 3B+.
