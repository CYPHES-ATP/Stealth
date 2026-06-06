# Receipt Merkle E2E Demo

## Goal

Show the smallest local proof-of-mechanics for batching many receipt/evidence items into one session/workflow Merkle root.

## Flow

```text
receipt JSON items
-> canonicalize each deterministically
-> compute receiptHash leaves
-> build Merkle tree
-> derive sessionRoot / workflowRoot
-> generate proof for one receipt
-> verify proof back to the same root
```

## Example inputs

- `examples/receipt-anchor/sample-receipt.json`
- `examples/receipt-anchor/sample-receipt-2.json`
- `examples/receipt-anchor/session-manifest.json`

## Step 1: compute the Merkle root

```bash
node scripts/receipt-anchor/compute-merkle-root.mjs
```

This writes:

```text
examples/receipt-anchor/session-merkle-root.json
```

## Step 2: verify a proof locally

```bash
node scripts/receipt-anchor/verify-merkle-proof.mjs
```

This proves:
- receipt JSON -> canonical hash
- receipt hash + Merkle proof -> sessionRoot / workflowRoot
- computed root matches expected root

## Why this matters

- one root can commit to many actions
- cheaper than anchoring every receipt separately
- supports session/workflow verification
- keeps full evidence and proofs off-chain by default

## Boundaries

This is local-only proof of mechanics.
It does **not** introduce:
- app UI changes
- contract changes
- deployment
- NFT logic
- payment/settlement
- PQ/ML-DSA
