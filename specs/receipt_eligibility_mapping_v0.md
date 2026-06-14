# Receipt Eligibility Mapping v0

Status: Draft v0
Project: Stealth / ReceiptOS
Scope: ReceiptOS-side field map for recomputable receipt eligibility.

## 1. Purpose

This document defines the ReceiptOS-side mapping for receipt eligibility.

The goal is to make the boundary explicit:

```text
the receipt gates; it does not score
```

ReceiptOS must not become a trusted signer of eligibility.
ReceiptOS should be a recomputable verification view over independently checkable facts.

A reputation consumer must be able to verify receipt eligibility without trusting whoever produced the receipt.

## 2. Core rule

```text
recomputable, not trusted-signed
```

ReceiptOS does not say:

```text
this action deserves reputation
```

ReceiptOS says:

```text
this action has a recomputable eligibility proof
```

The scoring or reputation layer may consume that eligibility proof later.

## 3. Position in the stack

The receipt layer sits at the execution / verdict seam.

High-level pathway:

```text
OCP / 8281 input committed
-> WYRIWE / 8299 model received input
-> 8274 verify
-> 8263 verdict committed before outcome
-> ReceiptOS eligibility receipt
-> settled outcome
-> 8275 reputation
```

ReceiptOS is scoped to the receipt-side field map around:

```text
verdict committed before outcome
```

## 4. Layer separation

The mapping must keep three paths separate.

### 4.1 Per-action attestation path

WYRIWE / 8299 binds the per-action model/input/output attestation.

Example fields:

```text
agentId
modelHash
inputHash
outputHash
timestamp
```

This is the action-level attestation path.

### 4.2 Receipt eligibility path

ReceiptOS binds the execution evidence and proof material that makes a scored action eligible to be consumed later.

Example fields:

```text
session_id
receipt_root
merkle_root
merkle_proof
anchor_result
tx_hash
contract
network
settled_outcome_ref
```

This is the eligibility gate.

### 4.3 Per-period settlement path

Settler / 8275 binds the period-level settlement and compensation root.

Example fields:

```text
snapshotRoot
periodId
nodeAddress
settlementRoot
```

This is the infrastructure / compensation path.

## 5. ReceiptOS responsibility

ReceiptOS should define the receipt-side evidence object that lets a consumer recompute eligibility.

ReceiptOS is responsible for:

* defining the receipt schema
* deriving `receipt_root`
* attaching local or external proof material
* binding the receipt to a Merkle root
* importing anchor results
* exporting final anchored receipt JSON
* making eligibility independently checkable

ReceiptOS is not responsible for:

* scoring the action
* assigning reputation
* calculating compensation
* deciding validator routing
* issuing trusted eligibility signatures

## 6. Receipt-side field map

A receipt eligibility object should expose enough information for a third party to recompute the eligibility predicate.

Minimum receipt-side fields:

```json
{
  "schema": "stealth.session.evidence.v1",
  "session_id": "...",
  "agent": {
    "id": "...",
    "runtime": "..."
  },
  "task": {
    "title": "...",
    "prompt": "..."
  },
  "authorization": {
    "agent_operator": "...",
    "target": "...",
    "allowed_actions": [],
    "authorization_state_hash": "..."
  },
  "execution": [],
  "changes": {
    "files_changed": [],
    "diff_sha256": "..."
  },
  "anchor": {
    "receipt_root": "0x...",
    "merkle_root": "0x...",
    "merkle_leaf_index": 0,
    "merkle_proof": [],
    "merkle_proof_status": "attached",
    "onchain_anchor_status": "anchored",
    "network": "sepolia",
    "contract": "0x...",
    "tx_hash": "0x...",
    "verifier_status": "not verified"
  }
}
```

## 7. Recompute path

A verifier should be able to recompute receipt eligibility from the receipt fields and public or independently checkable proof references.

Receipt recompute path:

```text
session/action evidence
-> canonical receipt body
-> receipt_root
-> Merkle root / proof
-> anchor result
-> final anchored receipt JSON
-> eligibility predicate
```

Eligibility predicate:

```text
attestation + commitment proof + settled outcome -> receipt eligibility
```

The receipt must remain a recomputable view over those facts.

## 8. Canonical receipt root

ReceiptOS v0 derives `receipt_root` by:

1. removing the top-level `anchor` object
2. canonicalizing the remaining JSON with recursively sorted object keys
3. preserving array order
4. computing SHA-256
5. comparing the result to `anchor.receipt_root`

This keeps the receipt root independently recomputable.

## 9. Merkle proof and anchor binding

ReceiptOS v0 currently supports a one-leaf Merkle proof:

```json
{
  "merkle_root": "<receipt_root>",
  "merkle_leaf_index": 0,
  "merkle_proof": []
}
```

For the v0 one-leaf mode:

```text
receipt_root == merkle_root
```

An imported anchor result must match the current `anchor.merkle_root`.

The anchor result may update only the effective local receipt evidence overlay:

```json
{
  "onchain_anchor_status": "anchored",
  "network": "sepolia",
  "contract": "<contractAddress>",
  "tx_hash": "<txHash>"
}
```

It must not change the receipt root, Merkle root, proof, or verifier status.

## 10. Interface contract

The interface contract for downstream reputation systems is:

```text
A reputation consumer must verify receipt eligibility without trusting the receipt producer.
```

Therefore:

* the receipt must be recomputable
* eligibility must be checkable from the mapped fields
* the receipt producer must not be a trusted eligibility issuer
* reputation must not depend on a private backend assertion
* scoring must consume verified eligibility, not replace it

## 11. Reputation boundary

ReceiptOS does not score.

ReceiptOS makes an action eligible to be scored.

Protocol rule:

```text
proof first, scoring second
```

A reputation system may later consume verified receipts, but ReceiptOS v0 only defines the proof and eligibility layer.

## 12. Compensation boundary

ReceiptOS does not define compensation economics.

Compensation belongs to the per-period settlement path.

This keeps the axes separate:

```text
per-action reputation eligibility != per-period node compensation
```

The receipt layer should not collapse those commitments into one hash or one trusted claim.

## 13. Non-goals

Receipt Eligibility Mapping v0 does not define:

* reputation scoring formulas
* validator reward logic
* node compensation economics
* settlement-period accounting
* automatic resource allocation
* trusted receipt issuer signatures
* production finality rules
* official WYRIWE / Settler standard semantics

This is a ReceiptOS-side draft mapping.

## 14. Open questions

* Which exact WYRIWE / 8299 fields should be referenced by the receipt?
* Which 8263 commitment proof fields are required for the verdict gate?
* Which settled outcome reference should the receipt bind to?
* Which receipt fields should a reputation-input consumer read?
* Which fields must remain outside ReceiptOS to avoid coupling reputation and compensation?
* How should multi-leaf receipt batches extend the v0 one-leaf proof model?
* Which public data sources should be considered sufficient for independent recomputation?

## 15. Summary

ReceiptOS is the receipt-side eligibility seam.

It does not replace attestation, settlement, or reputation.

It makes the transition explicit:

```text
this action was processed
-> this action has independently verifiable evidence
-> this action is eligible to be consumed by reputation logic
```

The receipt gates.
It does not score.
