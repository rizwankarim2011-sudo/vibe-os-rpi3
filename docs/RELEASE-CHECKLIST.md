# Release checklist

## Static
- [ ] `./scripts/check-project.sh`
- [ ] `./tests/validate.sh`
- [ ] rpi-image-gen layer lint passes
- [ ] rpi-image-gen config resolution passes
- [ ] image SHA256 recorded

## First boot on Pi 3 B+
- [ ] boots from microSD
- [ ] boots from compatible USB mass storage
- [ ] login/session starts
- [ ] Wayland/labwc starts
- [ ] Vibe shell starts
- [ ] backend health is online
- [ ] desktop loads without console errors

## Hardware
- [ ] HDMI display
- [ ] USB keyboard
- [ ] USB mouse
- [ ] Ethernet
- [ ] 2.4 GHz Wi-Fi
- [ ] 5 GHz Wi-Fi
- [ ] Bluetooth
- [ ] USB storage
- [ ] audio output
- [ ] camera/CSI if attached
- [ ] DSI display if attached
- [ ] GPIO access for supported applications

## OS functions
- [ ] Explorer read/create/rename/delete
- [ ] Notepad read/write
- [ ] Terminal safe commands
- [ ] System Monitor
- [ ] Settings
- [ ] lock/unlock
- [ ] logout
- [ ] reboot
- [ ] shutdown
- [ ] apt update/install
- [ ] SSH if intentionally enabled
- [ ] time zone and locale
- [ ] suspend/idle behavior
- [ ] recovery after Chromium crash

## Performance
- [ ] idle RAM checked
- [ ] CPU load checked
- [ ] Chromium stability checked
- [ ] thermal behavior checked
- [ ] storage I/O checked
- [ ] Wi-Fi throughput checked
