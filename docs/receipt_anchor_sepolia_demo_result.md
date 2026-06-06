# Receipt Anchor Sepolia Demo Result

## Summary

This document records the successful Sepolia demo for anchoring a Stealth receipt commitment.

Model used:
- full receipt evidence stays off-chain
- only `receiptRoot` is published on-chain
- later verification happens by recomputing the root from the receipt JSON and comparing it with the anchored on-chain value

## Public demo data

### Contract
- `0x461e60fa7D2Bd9512DE1B043A3e8d206462D34f5`

### Anchor transaction
- `0xccdca87bcc0d930c9350da2158b9bc9eefc6aa22ea31452d195829b2772439f3`

### Anchored receipt root
- `0xa6eab9383ecdb7bf0aaa0469b383213bd7d58f808c79f82226f2869545c81d88`

## Etherscan links

- Contract:
  - https://sepolia.etherscan.io/address/0x461e60fa7D2Bd9512DE1B043A3e8d206462D34f5
- Transaction:
  - https://sepolia.etherscan.io/tx/0xccdca87bcc0d930c9350da2158b9bc9eefc6aa22ea31452d195829b2772439f3

## Verification model

Verification remains:

1. keep the full receipt evidence off-chain
2. canonicalize the receipt JSON locally
3. recompute the deterministic `receiptRoot`
4. compare that root with the on-chain anchored root / event

This means the chain stores the commitment, not the full workflow evidence.

## Notes

- no private keys are recorded here
- no RPC URLs are recorded here
- this is a Sepolia demo result only
- this is not mainnet
- this is not NFT / settlement / verifier replacement
