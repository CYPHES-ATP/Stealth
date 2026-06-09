# Handoff Evidence Schema v1

This document pins the Stealth handoff evidence v1 JSON format.

Schema file:

`schemas/handoff-evidence.v1.schema.json`

The schema describes the output shape for:

`GET /session/:sessionID/handoff`

The current schema version is:

`stealth.session.evidence.v1`

## Changes from v0

Version 1 adds:

- an authorization snapshot
- a deterministic hash of the captured permission ruleset
- execution records linked to tool call IDs
- execution start and completion timestamps
- explicit fields for future scope and authorization verification

## Authorization snapshot

The `authorization` object captures the permission state available when the handoff evidence is generated.

The current implementation derives `allowed_actions` from the session permission ruleset and commits to that snapshot using `authorization_state_hash`.

The current implementation does not yet persist a historical permission decision for each tool call. Therefore:

- `authorized_at_execution` is currently `null`
- per-execution `scope_match` is currently `null`
- delegation and validity-window fields are currently `null`

`null` means that the claim is not yet independently proven. It does not mean that authorization failed.

## Security invariant

A receipt should prove not only what an agent did, but that the agent was authorized to perform that exact action at execution time.

Version 1 establishes the evidence foundation for that invariant without claiming more than the current runtime can prove.

## Compatibility

The v0 schema and fixtures remain available for historical compatibility.

Version 1 does not introduce a separate Permission Registry.
