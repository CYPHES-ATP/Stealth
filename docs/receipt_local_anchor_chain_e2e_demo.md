# Local Anchor Chain E2E Demo

This document records the local/off-chain anchor chain demo for handoff evidence receipts.

The demo shows the full local proof path:

```
base evidence -> receipt_root -> Merkle batch -> attached anchor -> verified chain
```

No runtime, UI, route, or on-chain behavior is changed by this demo.

## Script

```
node scripts/receipt-anchor/local-anchor-chain-e2e-demo.mjs
```

## What the demo proves

The demo creates a local evidence object, computes its receipt root, includes that root in a Merkle batch, attaches the Merkle proof to the evidence anchor, and verifies the complete chain.

The final verifier checks:

- the evidence JSON without top-level `anchor` recomputes to `anchor.receipt_root`
- `anchor.receipt_root` plus `anchor.merkle_proof` recomputes to `anchor.merkle_root`
- `anchor.merkle_proof_status` is `attached`

## Expected result

The script should return:

```
{
  "ok": true,
  "checks": {
    "receipt_root": true,
    "merkle_proof": true,
    "merkle_proof_status_attached": true
  }
}
```

The output also includes:

- `receipt_root`
- `recomputed_receipt_root`
- `merkle_root`
- `recomputed_merkle_root`
- `merkle_leaf_index`
- `merkle_proof`
- `attached_evidence`

## Trust model

This is still a local/off-chain proof chain.

It proves that:

1. the evidence content matches its receipt root
2. the receipt root is included in the Merkle batch
3. the attached Merkle proof leads to the Merkle root

It does not yet prove that the Merkle root was anchored on-chain.

The next layer is an on-chain anchor that records the Merkle root.
