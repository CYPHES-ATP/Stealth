# Receipt On-Chain E2E Demo

## Goal

Show the smallest end-to-end flow for anchoring a Stealth receipt commitment without putting the full receipt on-chain.

## Model

- full receipt evidence stays off-chain
- only `receiptRoot` / `receiptHash` goes on-chain
- later verification recomputes the root from the receipt JSON and compares it with the anchored value

## Step 1: generate or collect receipt JSON

Use a local receipt evidence file such as:

```text
examples/receipt-anchor/sample-receipt.json
```

This is an off-chain evidence bundle.

## Step 2: compute `receiptRoot`

Run:

```bash
node scripts/receipt-anchor/compute-root.mjs examples/receipt-anchor/sample-receipt.json
```

This:
- loads the receipt JSON
- canonicalizes it deterministically
- computes a SHA-256 root
- prints a small JSON result

## Step 3: deploy `ReceiptAnchor` to Ethereum testnet later

Contract:

```text
contracts/ReceiptAnchor.sol
```

A later testnet-only step can deploy the contract and keep the full receipt off-chain.

## Step 4: anchor the root

Call:

```text
anchorReceipt(receiptRoot, metadataURI)
```

Only the root and optional metadata URI are published on-chain.

## Step 5: verify by recomputation

Run:

```bash
node scripts/receipt-anchor/verify-root.mjs examples/receipt-anchor/sample-receipt.json examples/receipt-anchor/sample-root.json
```

This recomputes the root from the receipt JSON and compares it with the expected anchored root.

## Privacy boundary

The full receipt evidence remains off-chain.
Only the deterministic root is published on-chain.

That means:
- on-chain data stays small
- sensitive evidence is not exposed by default
- verification can still happen by recomputation

## What this demo does not do

- no mainnet deployment
- no private keys required
- no NFT flow
- no settlement/payment
- no full verifier implementation
