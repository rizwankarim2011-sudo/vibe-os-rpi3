# Vibe Pro Desktop — Windows 11-inspired shell layer

Vibe-coder's OS keeps its existing applications and Linux backend intact. The Windows 11-inspired behavior is isolated in `frontend/shell/` so the desktop shell can evolve without mixing shell code into every application.

## Included shell features

- centered/floating Vibe taskbar workflow
- Start/search workflow already provided by the core desktop
- Quick Settings and Notifications already provided by the core desktop
- Command Center already provided by the core desktop
- edge snap layouts
- double-click title-bar maximize
- four virtual desktops
- desktop context menu
- Super+L session lock request to the real Linux session
- Ctrl+Shift+Esc opens Vibe Task Manager
- Super+1..4 workspace switching
- Ctrl+Super+1..4 workspace switching
- modular CSS/JS with no Windows binaries or proprietary Windows components

## Design boundary

This is **Windows 11-inspired**, not Windows. The runtime remains Raspberry Pi Linux with Wayland/labwc, Chromium and Vibe applications. The shell does not bundle Microsoft software, Windows DLLs, or Windows system files.

## Native lock behavior

The lock button calls `/api/session` and asks systemd-logind to lock the active Linux session. Authentication after locking is therefore handled by the Linux login/session stack, not by a fake JavaScript password screen.
