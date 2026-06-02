# Verifiable Handoff Demo v0

## Goal

Show the smallest possible Stealth handoff flow:

```text
session evidence
→ receipt bundle
→ verifier result
→ OK or reason_code
```

## Negative fixtures

The demo also includes reject-path fixtures:

- `session-evidence.scope-exceeded.json` -> `SCOPE_EXCEEDED`
- `session-evidence.command-failed.json` -> `COMMAND_FAILED`
- `session-evidence.invalid-evidence.json` -> `INVALID_EVIDENCE`

Run them with explicit expected reason codes:

- `bun run tools/verified-handoff-demo.ts examples/verified-handoff/session-evidence.scope-exceeded.json --expect=SCOPE_EXCEEDED`
- `bun run tools/verified-handoff-demo.ts examples/verified-handoff/session-evidence.command-failed.json --expect=COMMAND_FAILED`
- `bun run tools/verified-handoff-demo.ts examples/verified-handoff/session-evidence.invalid-evidence.json --expect=INVALID_EVIDENCE`
