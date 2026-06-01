# Verifiable Handoff Attach Points

## Product line

The work stays private. The handoff is verifiable.

## Goal

Stealth is the confidential coding agent/runtime.

Artifact Two is the verifiable handoff / receipt layer.

The first integration should not change core runtime logic. It should identify where Stealth already produces the evidence needed for a receipt bundle.

## Current Stealth surfaces

### 1. Permission / scope surface

Observed areas:

- app permission UX
- permission context/state
- core permission / policy logic
- sandbox / workspace / approval flows

Receipt relevance:

This surface can provide evidence for:

- what the agent was allowed to do
- what files/workspace were in scope
- what tools or commands were approved
- whether the agent stayed inside boundaries

### 2. Agent / task orchestration surface

Observed areas:

- session timeline
- tool rows / tool calls
- command workflows
- agent task/session flows
- `.opencode/command/*`
- `AGENTS.md`

Receipt relevance:

This surface can provide evidence for:

- task identity
- agent/session identity
- ordered tool calls
- command execution records
- task lifecycle events

### 3. Patch / diff / artifact / test surface

Observed areas:

- diff/edit/apply_patch flows
- session timeline output
- e2e test fixtures
- mock endpoints for session/diff flow
- build/test/lint commands

Receipt relevance:

This surface can provide evidence for:

- patch summary
- changed files
- test commands run
- test results
- generated artifacts or outputs

### 4. Handoff / receipt surface

Observed state:

- Stealth has handoff/session UX concepts.
- Existing "receipt" mentions are mostly billing-related.
- No explicit Artifact Two / ReceiptOS-style verifier contour is present yet.

Receipt relevance:

This is the missing layer.

The first integration point should be a small adapter that turns existing session evidence into a receipt bundle draft.

## Proposed first integration boundary

Stealth does the work.

Artifact Two verifies the handoff.

Minimal flow:

1. Scoped coding task is created.
2. Agent works locally/confidentially.
3. Stealth records permission, tool, patch, test, and artifact evidence.
4. A receipt bundle is generated from that evidence.
5. Artifact Two verifies the receipt bundle.
6. User receives a human-friendly result:

- OK
- NEEDS_REVIEW
- SCOPE_EXCEEDED
- TEST_FAILED
- UNVERIFIABLE

## Non-goals for first pass

Do not:

- refactor Stealth runtime
- replace existing permission logic
- change agent orchestration
- implement cryptography inside Stealth core
- expose private repo/context publicly

## First safe build step

Add a small receipt adapter later that emits a local JSON bundle from a completed session.

Suggested future shape:

```text
stealth session evidence
→ receipt bundle draft
→ artifact-two verifier
→ OK / reason_code
→ human-friendly handoff result
```

## Key framing

AI coding you can verify before you merge.

The work stays private. The handoff is verifiable.
