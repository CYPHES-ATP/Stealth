# Receipt On-Chain Commitment v0

## Goal

Demonstrate the smallest useful on-chain anchoring model for Stealth receipts:

- full receipt evidence stays off-chain
- only a deterministic receipt root/hash goes on-chain
- later verification recomputes the root from receipt JSON and compares it with the on-chain commitment

This is a proof/demo path only.

## Why full evidence stays off-chain

Full receipt evidence can contain:
- prompts
- changed file paths
- command output
- authority/scope details
- verifier/trust metadata
- sensitive workflow context

Putting all of that on-chain would be expensive, noisy, and bad for privacy.

So the intended model is:

- **off-chain:** canonical receipt JSON / evidence bundle
- **on-chain:** only `receiptRoot` or `receiptHash`

## What goes on-chain

For v0, only:
- `receiptRoot` (`bytes32`)
- optional `metadataURI` (string)
- publisher address via `msg.sender`

The root should come from off-chain canonicalization + hashing of receipt evidence.

## Verification flow

Later verification should work like this:

1. load the off-chain receipt JSON
2. canonicalize it deterministically
3. recompute `receiptRoot`
4. look up the root on-chain
5. compare recomputed root with anchored root

If they match, the anchored record corresponds to that receipt evidence.

## Privacy boundary

This demo does **not** put the full receipt on-chain.
Only the commitment/root is published.

That means:
- on-chain viewers can see that a root was anchored
- off-chain holders can choose whether to reveal the matching receipt evidence
- sensitive execution context stays off-chain by default

## What this is not

This is **not**:
- settlement
- payment
- an NFT flow
- a full receipt verifier
- a trust system by itself

It is only a minimal commitment/anchoring demo.

## Minimal contract behavior

`ReceiptAnchor.sol` does two things:
- emits `ReceiptAnchored(bytes32 indexed receiptRoot, string metadataURI, address indexed publisher)`
- optionally prevents duplicate anchoring of the same root

This keeps the design small and testnet-friendly.

## Demo fixture flow

The example fixture path is:

```text
examples/receipt-anchor/sample-receipt.json
examples/receipt-anchor/sample-root.json
```

Intended flow:

```text
sample-receipt.json
-> canonicalize off-chain
-> compute receiptRoot
-> anchor receiptRoot on-chain
-> later recompute and compare
```

## Testnet later

A future testnet demo can:
- deploy `ReceiptAnchor`
- call `anchorReceipt(receiptRoot, metadataURI)`
- inspect the emitted event
- verify the root from the off-chain receipt fixture

No private key handling or deployment is included in this v0 repo change.
