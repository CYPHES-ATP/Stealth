# Receipt Testnet Anchor (Sepolia)

## Purpose

This document describes the smallest intended live anchoring path for Stealth receipt commitments on **Ethereum Sepolia**.

## Scope

Sepolia only.

The model remains:
- full receipt evidence stays off-chain
- only `receiptRoot` / `receiptHash` goes on-chain
- later verification recomputes the root locally and compares it with the anchored on-chain value

## Required environment variables

Any live testnet deployment/anchor flow requires:

- `SEPOLIA_RPC_URL`
- `SEPOLIA_PRIVATE_KEY`

PowerShell example:

```powershell
$env:SEPOLIA_RPC_URL="<your-sepolia-rpc-url>"
$env:SEPOLIA_PRIVATE_KEY="<your-private-key>"
```

Never commit private keys.
Never hardcode them in scripts or docs examples.
Never paste private keys into chat or logs.
Use a throwaway testnet wallet only.

## Commands

### Step 1: compute the root locally

```bash
node scripts/receipt-anchor/compute-root.mjs examples/receipt-anchor/sample-receipt.json
```

### Step 2: verify local recomputation

```bash
node scripts/receipt-anchor/verify-root.mjs examples/receipt-anchor/sample-receipt.json examples/receipt-anchor/sample-root.json
```

### Step 3: compile `ReceiptAnchor`

```bash
node scripts/receipt-anchor/compile-anchor.mjs
```

This writes:

```text
examples/receipt-anchor/ReceiptAnchor.artifact.json
```

### Step 4: deploy `ReceiptAnchor` to Sepolia

```bash
node scripts/receipt-anchor/deploy-anchor.mjs
```

If env vars are missing, the script exits safely.
If the connected chain is not Sepolia (`11155111`), the script exits safely.

### Step 5: anchor the root

```bash
node scripts/receipt-anchor/anchor-root.mjs <contractAddress> <receiptRoot> <metadataURI>
```

Example:

```bash
node scripts/receipt-anchor/anchor-root.mjs 0xYourContractAddress 0xa6eab9383ecdb7bf0aaa0469b383213bd7d58f808c79f82226f2869545c81d88 ipfs://receipt-anchor-demo/sample-receipt.json
```

The script prints:
- `txHash`
- `receiptRoot`
- `metadataURI`
- `contractAddress`
- parsed `ReceiptAnchored` event info when available

### Step 6: verify later by recomputation

After anchoring, verify by:
1. loading the receipt JSON locally
2. recomputing `receiptRoot`
3. comparing that root against the on-chain event/root

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

## Safety notes

- Sepolia only
- use a throwaway testnet wallet
- no private keys in code
- no default RPC URL
- no hardcoded wallet secrets
- never commit private keys
- never paste private keys into chat/logs
- no on-chain full receipt data

## Demo result

A successful Sepolia demo result is recorded here:
- `docs/receipt_anchor_sepolia_demo_result.md`

## Current local reference

The local off-chain E2E demo remains the reference flow:
- compute root locally
- verify root locally
- then deploy/anchor only when explicit Sepolia credentials are provided
