# Stealth

Stealth is a confidential coding agent by CYPHES. 

## Download

The Apple Silicon test build is produced as:

```text
https://stealth.cyphes.com/Stealth.dmg
```

The Windows x64 test build is produced as:

```text
https://stealth.cyphes.com/Stealth.x64.exe
```

For local testing, open the DMG, drag `Stealth` into Applications, then launch it from Applications.

macOS may warn because this local build is not notarized yet. If Gatekeeper blocks the app during testing:

```bash
xattr -dr com.apple.quarantine /Applications/Stealth.app
open /Applications/Stealth.app
```

## What Changed

- Product label is `Stealth v1.0` in the desktop settings footer and app metadata.
- macOS bundle identity is `network.cyphes.stealth`.
- Artifact output is `Stealth-v1.0-${os}-${arch}.${ext}`.
- Native app icons, Dock icons, and renderer favicons are generated from `packages/desktop/icons/source/cyphes.png`.
- Theme startup is locked to AMOLED and dark mode; the General settings Appearance section is hidden.
- Auto-update is disabled for now so Stealth does not check upstream release feeds.

The internal package names, workspace imports, server environment variables, and lower-level runtime plumbing intentionally remain opencode-compatible to avoid changing app behavior during this rebrand pass.

## Install From Source

Requirements:

- macOS on Apple Silicon for the local DMG, or Windows x64 for a native Windows build
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

Build the Windows x64 installer from Windows:

```bash
OPENCODE_CHANNEL=prod bun --cwd packages/desktop build
OPENCODE_CHANNEL=prod bun --cwd packages/desktop package:win -- --x64 --publish never
```

Build the Windows x64 installer from macOS:

```bash
bun install --os=win32 --cpu=x64 --no-save --frozen-lockfile
OPENCODE_CHANNEL=prod ELECTRON_TARGET_PLATFORM=win32 ELECTRON_TARGET_ARCH=x64 bun --cwd packages/desktop build
OPENCODE_CHANNEL=prod bun --cwd packages/desktop package:win -- --x64 --publish never
```

The desktop build output is `packages/desktop/out/main/index.js`; do not expect a root-level `out/main/index.js`.

## Developer Guide

The desktop app lives in `packages/desktop`. The main renderer UI comes from `packages/app`, with shared design components in `packages/ui`.

Common files for Stealth branding work:

- `packages/desktop/electron-builder.config.ts` controls product name, app ID, protocols, and artifact names.
- `packages/desktop/src/main/index.ts` controls Electron app names, user data path, protocol registration, and startup.
- `packages/desktop/src/main/windows.ts` controls native window title, background, icon, and load-failure dialogs.
- `packages/desktop/icons/source/cyphes.png` is the source for generated native icons.
- `packages/desktop/icons/{dev,beta,prod}` contains native app icon assets.
- `packages/app/public/oc-theme-preload.js` forces AMOLED/dark before the app mounts.
- `packages/ui/src/theme/context.tsx` keeps the runtime theme locked to AMOLED/dark.
- `packages/app/src/components/settings-general.tsx` hides the Appearance section.
- `packages/app/src/index.css` contains the CYPHES visual theme override.
- `packages/ui/src/components/logo.tsx` contains the Stealth mark, splash, and wordmark.

Use this build command before opening a PR:

```bash
OPENCODE_CHANNEL=prod bun --cwd packages/desktop build
```

For a cross-built Windows package from macOS, use a target-specific desktop build first:

```bash
OPENCODE_CHANNEL=prod ELECTRON_TARGET_PLATFORM=win32 ELECTRON_TARGET_ARCH=x64 bun --cwd packages/desktop build
```

Use this packaging command before cutting a local macOS test DMG:

```bash
OPENCODE_CHANNEL=prod CSC_IDENTITY_AUTO_DISCOVERY=false bun --cwd packages/desktop package:mac -- --arm64
```
## ReceiptOS / Verified Work Receipts

Stealth includes a ReceiptOS-style evidence flow for verifiable AI/tool/action work receipts.

Current v0 receipt anchor flow:

```text
receipt -> receipt_root -> Merkle proof -> Sepolia anchor -> imported anchor result -> final receipt JSON
```

The Receipt Explorer supports:

* local receipt verification
* local one-leaf Merkle proof attachment
* Sepolia anchor payload preparation
* Sepolia anchor result import
* guided receipt anchor flow
* final anchored receipt JSON export

Protocol documentation:

* [Receipt Protocol Spec v0](./specs/receipt_protocol_spec_v0.md)
* [Receipt Eligibility Mapping v0](./specs/receipt_eligibility_mapping_v0.md)
* [Readable docs copy](./docs/receipt_protocol_spec_v0.md)

Demo release:

* [Stealth Receipt Anchor Demo v0.1.0](https://github.com/CYPHES-ATP/Stealth/releases/tag/v0.1.0-receipt-anchor-demo)

Protocol rule:

```text
proof first, scoring second
```

Receipt Protocol v0 proves the work path. Reputation, routing, scoring, compensation, and feedback loops are future layers that may consume verified receipts.

## Custom Providers

Stealth keeps the same provider configuration behavior as opencode. You can still connect Anthropic, OpenAI, Google, OpenRouter, local providers, and any OpenAI-compatible endpoint supported by the upstream runtime.

## Attribution

Stealth is based on the MIT-licensed opencode desktop GUI by Anomaly Innovations, Inc. CYPHES is maintained at [CYPHES-ATP/Stealth](https://github.com/CYPHES-ATP/Stealth).
