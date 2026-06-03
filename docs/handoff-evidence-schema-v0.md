# Handoff Evidence Schema v0

This document pins the initial Stealth handoff evidence JSON format.

Schema file:

`schemas/handoff-evidence.v0.schema.json`

The schema describes the output shape for:

`GET /session/:sessionID/handoff`

The same evidence shape is intended to be consumed by:

- the verifier
- future receipt / handoff views
- future receipt explorer
- later signed receipt / crypto verification layers

The current schema version is:

`stealth.session.evidence.v0`

The v0 evidence object captures:

- session id
- project directory
- task title / prompt
- agent runtime
- permission scope
- command summaries
- changed files
- diff hash
- metadata about message and diff counts

This is intentionally schema-only. It does not add UI, signing, crypto, or explorer behavior.
