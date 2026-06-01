# Stealth Desktop

The CYPHES Stealth desktop app, built with Electron and packaged as a macOS DMG.

## Development

```bash
bun install
OPENCODE_CHANNEL=prod bun --cwd packages/desktop dev
```

## Build

Run the `build` script to build the app's JS assets, then `package` to
bundle the assets as an application. The resulting app will be in `dist/`.

```bash
OPENCODE_CHANNEL=prod bun --cwd packages/desktop build
OPENCODE_CHANNEL=prod CSC_IDENTITY_AUTO_DISCOVERY=false bun --cwd packages/desktop package:mac -- --arm64
```
