# Office & Creative Suite

Vibe-coder's OS Raspberry Edition 1.3.1 adds a native productivity stack while keeping the Vibe Windows-inspired shell separate from the Linux foundation.

| User need | Native application |
|---|---|
| Word / documents | LibreOffice Writer |
| Excel / spreadsheets | LibreOffice Calc |
| PowerPoint / presentations | LibreOffice Impress |
| PDF viewer | Evince |
| Paint-style drawing | KolourPaint |
| Advanced photo editing | GIMP |
| Vector graphics | Inkscape |
| Mail / calendar | Thunderbird |
| Printing | CUPS + system-config-printer |

LibreOffice is installed as the Debian Trixie ARM64 suite package, which includes Writer, Calc, Impress, Draw, Base and Math. The individual components are therefore real native applications, not HTML imitations.

## Raspberry Pi 3 B+ note

The Pi 3 B+ has limited RAM compared with modern desktop hardware. The suite is therefore native and functional, but heavy applications such as GIMP, Inkscape and LibreOffice should be expected to take longer to start and may benefit from closing unused applications.
