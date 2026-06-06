# Receipt Merkle Anchor Model

## Purpose

This document defines the next anchoring model after the current single receipt-root flow.

## 1. Current model

Today the minimal anchoring path is:

```text
single receipt evidence
-> canonical receipt hash/root
-> on-chain anchor
```

That means one canonical receipt JSON produces one deterministic `receiptHash` / `receiptRoot`, and that single root is anchored on-chain.

## 2. Next model

The next step is batching many receipt/evidence items into one higher-level root:

```text
many receipt/evidence items
-> receipt hashes as leaves
-> Merkle tree
-> sessionRoot / workflowRoot
-> on-chain anchor
```

In this model:
- each receipt/evidence item becomes a deterministic leaf hash
- those leaf hashes are arranged into a Merkle tree
- the Merkle tree produces a `sessionRoot` or `workflowRoot`
- only that top-level root is anchored on-chain

## 3. What goes on-chain

Only the commitment/root layer should go on-chain, for example:
- `sessionRoot` or `workflowRoot`
- publisher address
- `metadataURI`
- event emitted by the anchor contract

This keeps the on-chain footprint small.

## 4. What stays off-chain

The following stays off-chain:
- full receipt evidence JSON
- session manifest
- leaf receipts
- Merkle proofs
- verifier inputs

That preserves privacy and keeps rich evidence outside the chain.

## 5. Verification flow

Later verification should work like this:

1. load receipt JSON
2. canonicalize it deterministically
3. compute `receiptHash`
4. verify the Merkle proof for that receipt hash against `sessionRoot` / `workflowRoot`
5. compare `sessionRoot` / `workflowRoot` with the on-chain anchored root

So the chain anchors the top-level workflow commitment, while the proof path stays off-chain.

## 6. Why this matters

This batching model matters because:
- one on-chain anchor can commit to many actions
- it is cheaper than anchoring every receipt separately
- it supports full workflow/session verification
- it keeps private evidence off-chain

It is the natural next step once single receipt-root anchoring works.

## 7. Boundaries

This is a design document only.

It does **not** introduce:
- app UI changes
- contract changes
- deployment
- NFT logic
- payment/settlement
- PQ/ML-DSA

It only defines the intended batching model after the current single-root approach.
