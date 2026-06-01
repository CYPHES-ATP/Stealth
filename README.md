# Stealth

Stealth is the CYPHES-native macOS desktop build of the opencode GUI, rebranded for a high-contrast black, cyan, and signal-green interface. This repository tracks the v1.15.13 desktop GUI baseline and keeps the underlying agent/runtime behavior intact while replacing the user-facing product name, app metadata, icons, installer artifact names, menus, splash assets, and visual theme.

## Download

The Apple Silicon test build is produced as:

```text
packages/desktop/dist/stealth-desktop-mac-arm64.dmg
```

For local testing, open the DMG, drag `Stealth.app` into Applications, then launch it from Applications.

macOS may warn because this local build is not notarized yet. If Gatekeeper blocks the app during testing:

```bash
xattr -dr com.apple.quarantine /Applications/Stealth.app
open /Applications/Stealth.app
```

## What Changed

- Product name changed from OpenCode to Stealth across visible desktop UI, windows, menus, metadata, update labels, and installer output.
- macOS bundle identity changed to `network.cyphes.stealth`.
- Artifact output changed to `stealth-desktop-${os}-${arch}.${ext}`.
- Native icons, Dock icon, favicons, and social preview assets were rebuilt around the CYPHES black/cyan/green mark.
- Renderer theme now defaults to a dark CYPHES visual system using the branding tokens from `~/Desktop/CYPHES/index.html`.
- Auto-update is disabled for now so Stealth does not check upstream OpenCode release feeds.

The internal package names, workspace imports, server environment variables, and lower-level runtime plumbing intentionally remain opencode-compatible to avoid changing app behavior during this rebrand pass.

## Install From Source

Requirements:

- macOS on Apple Silicon
- Xcode Command Line Tools
- Bun `1.3.14`
- Node.js `22+`

Install dependencies:

```bash
bun install
```

Build the desktop renderer and sidecar:

```bash
OPENCODE_CHANNEL=prod bun --cwd packages/desktop build
```

Package the local macOS DMG:

```bash
OPENCODE_CHANNEL=prod CSC_IDENTITY_AUTO_DISCOVERY=false bun --cwd packages/desktop package:mac -- --arm64
```

The DMG will be written to `packages/desktop/dist/`.

## Developer Guide

The desktop app lives in `packages/desktop`. The main renderer UI comes from `packages/app`, with shared design components in `packages/ui`.

Common files for Stealth branding work:

- `packages/desktop/electron-builder.config.ts` controls product name, app ID, protocols, and artifact names.
- `packages/desktop/src/main/index.ts` controls Electron app names, user data path, protocol registration, and startup.
- `packages/desktop/src/main/windows.ts` controls native window title, background, icon, and load-failure dialogs.
- `packages/app/src/index.css` contains the CYPHES visual theme override.
- `packages/ui/src/components/logo.tsx` contains the Stealth mark, splash, and wordmark.
- `packages/desktop/icons/{dev,beta,prod}` contains native app icon assets.
- `packages/app/public` contains renderer favicon and social preview assets.

Use this build command before opening a PR:

```bash
OPENCODE_CHANNEL=prod bun --cwd packages/desktop build
```

Use this packaging command before cutting a local macOS test DMG:

```bash
OPENCODE_CHANNEL=prod CSC_IDENTITY_AUTO_DISCOVERY=false bun --cwd packages/desktop package:mac -- --arm64
```

## Custom Providers

Stealth keeps the same provider configuration behavior as opencode. You can still connect Anthropic, OpenAI, Google, OpenRouter, local providers, and any OpenAI-compatible endpoint supported by the upstream runtime.

## Themes

Stealth ships with a CYPHES-first dark theme. Existing theme files remain in the source tree for compatibility, but the app-level CSS override keeps the default desktop experience black/cyan/green.

## Attribution

Stealth is based on the MIT-licensed opencode v1.15.13 desktop GUI by Anomaly Innovations, Inc. The CYPHES rebrand is maintained at [CYPHES-ATP/Stealth](https://github.com/CYPHES-ATP/Stealth).
