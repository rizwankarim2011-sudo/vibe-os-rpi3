# Actual `.img` build through GitHub Actions

The repository's GitHub Actions workflow now performs the real `rpi-image-gen` build instead of merely checking for an image.

## Before the first run

1. Open the repository on GitHub.
2. Go to **Settings → Secrets and variables → Actions**.
3. Create a repository secret named `VIBE_PASSWORD`.
4. Use a strong password accepted by the build policy: at least 8 characters containing upper/lowercase letters, a digit and one of `@$!%*?&`.
5. Do not commit the password to the repository.

## Start the build

1. Open **Actions**.
2. Select **Build Vibe-coder's OS Raspberry Edition**.
3. Press **Run workflow**.
4. Choose `arm64` first. This uses the native `ubuntu-24.04-arm` GitHub runner, which matches the recommended native ARM64 build path for `rpi-image-gen`.
5. If the ARM64 runner is unavailable for the repository, rerun with `qemu`. The QEMU path uses the official `-f` fallback mode.

## What the workflow now does

- checks out the complete OS source
- installs the pinned `rpi-image-gen v2.8.0` toolchain
- runs the full project audit
- validates the custom layer/configuration
- builds the actual Raspberry Pi 3B+ ARM64 disk image
- refuses to succeed if no non-empty image is produced
- verifies SHA256 for the raw image
- compresses the raw image with Zstandard
- verifies the compressed artifact with `zstd -t`
- records the partition table
- uploads the actual `.img.zst` plus checksums, manifest, partition report and build log

The raw `.img` is intentionally not uploaded as the primary CI artifact because the configured 16 GiB image can exceed GitHub artifact-size constraints. The `.img.zst` artifact contains the complete disk image; decompress it before flashing.

## After a successful run

Download the artifact named:

`Vibe-coders-OS-Raspberry-Edition-1.3.1-rpi3bplus`

Then decompress the `.img.zst` file to obtain:

`Vibe-coders-OS-Raspberry-Edition-rpi3bplus.img`

Verify it with the supplied `.img.sha256` before flashing.

## Important

A green workflow is no longer considered sufficient. The workflow explicitly tests for the image, checksum files, compressed image, valid Zstandard stream and partition report. If any of those are missing, the workflow fails.
