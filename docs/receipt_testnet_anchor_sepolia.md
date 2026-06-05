# Receipt Testnet Anchor (Sepolia)

## Purpose

This document describes the smallest intended live anchoring path for Stealth receipt commitments on **Ethereum Sepolia**.

It does **not** add a deployable script yet, because the repo currently does not contain a minimal Solidity compile/deploy toolchain.

## Scope

Sepolia only.

The model remains:
- full receipt evidence stays off-chain
- only `receiptRoot` / `receiptHash` goes on-chain
- later verification recomputes the root locally and compares it with the anchored on-chain value

## Required environment variables

Any future live testnet deployment/anchor flow should require:

- `SEPOLIA_RPC_URL`
- `SEPOLIA_PRIVATE_KEY`

Never commit private keys.
Never hardcode them in scripts or docs examples.

## Intended flow

### Step 1: keep receipt evidence off-chain
Use a local receipt JSON file such as:

```text
examples/receipt-anchor/sample-receipt.json
```

### Step 2: compute the root locally
Run:

```bash
node scripts/receipt-anchor/compute-root.mjs examples/receipt-anchor/sample-receipt.json
```

This produces the deterministic `receiptRoot`.

### Step 3: deploy `ReceiptAnchor` to Sepolia later
Contract:

```text
contracts/ReceiptAnchor.sol
```

Deployment should happen only after a minimal compile/deploy toolchain is added.

### Step 4: anchor the root
Future call shape:

```text
anchorReceipt(receiptRoot, metadataURI)
```

Only the root and optional metadata URI go on-chain.

### Step 5: verify later by recomputation
Run:

```bash
node scripts/receipt-anchor/verify-root.mjs examples/receipt-anchor/sample-receipt.json examples/receipt-anchor/sample-root.json
```

Then compare:
- recomputed local root
- anchored on-chain root/event

## Privacy boundary

The full receipt evidence remains off-chain.
Only the deterministic commitment/root is published on-chain.

## What this is not

This is not:
- mainnet deployment
- NFT minting
- settlement/payment
- a full verifier
- full receipt publication on-chain

## Current blocker for live Sepolia tx

The repo currently does **not** include a minimal Solidity compile/deploy toolchain such as:
- `ethers` + compiled artifact path
- `viem` + compiled artifact path
- `solc`
- Hardhat
- Foundry

Therefore the correct status right now is:

> Need minimal Solidity compile/deploy toolchain before live Sepolia tx.

## Recommended next step

Add the smallest possible toolchain only after approval, for example:
- a tiny `ethers` or `viem` script lane
- plus a minimal Solidity compile path

Until then, the local off-chain E2E demo remains the reference flow.
