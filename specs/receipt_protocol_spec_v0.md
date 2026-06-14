# Receipt Protocol Spec v0
- **Status:** Draft v0
- **Project:** Stealth / ReceiptOS
- **Scope:** Local receipt verification, Merkle proof attachment, Sepolia anchor payload, and Sepolia anchor result import.

## 1. Goal

Receipt Protocol v0 defines a tamper-evident evidence flow for AI/tool/action sessions.

The goal is to prove what happened around an AI-assisted workflow:

```text
input -> policy -> authorization -> tool/action -> evidence -> result -> verifier -> state transition
```

This is not a trust claim that an AI behaved well.
It is an evidence trail that lets a verifier inspect what input, authorization, actions, file changes, receipt root, Merkle proof, and anchor result were used.

## 2. Core objects

### 2.1 Session evidence

A session evidence object uses schema:

```json
{
  "schema": "stealth.session.evidence.v1",
  "session_id": "...",
  "directory": "...",
  "task": {},
  "agent": {},
  "scope": {},
  "authorization": {},
  "execution": [],
  "commands": [],
  "changes": {},
  "anchor": {},
  "metadata": {}
}
```

### 2.2 Anchor object

The `anchor` object carries receipt verification and anchoring state:

```json
{
  "receipt_root": "0x...",
  "merkle_proof_status": "attached",
  "merkle_root": "0x...",
  "merkle_leaf_index": 0,
  "merkle_proof": [],
  "onchain_anchor_status": "anchored",
  "network": "sepolia",
  "contract": "0x...",
  "tx_hash": "0x...",
  "verifier_status": "not verified"
}
```

## 3. Receipt root

The receipt root is the canonical hash of the receipt evidence.

For v0 local verification:

1. Remove the top-level `anchor` field.
2. Canonicalize the remaining JSON with recursively sorted object keys.
3. Preserve array order.
4. Compute SHA-256.
5. Compare the computed root with `anchor.receipt_root`.

If the roots match, local receipt verification passes.

## 4. Local Merkle proof

Receipt Protocol v0 supports a one-leaf local Merkle proof.

For a one-leaf proof:

```json
{
  "merkle_proof_status": "attached",
  "merkle_root": "<receipt_root>",
  "merkle_leaf_index": 0,
  "merkle_proof": []
}
```

In v0, the Merkle root equals the receipt root.

This is local/off-chain proof material.
It is not itself an on-chain transaction.

## 5. Sepolia anchor payload

The Sepolia anchor payload is prepared from the effective receipt evidence after local Merkle proof attachment.

Payload schema:

```json
{
  "schema": "stealth.receipt_anchor.onchain_payload.v1",
  "receipt_root": "0x...",
  "merkle_root": "0x...",
  "merkle_leaf_index": 0,
  "merkle_proof": [],
  "merkle_proof_status": "attached",
  "anchor_target": "onchain",
  "network": "sepolia",
  "hash": "sha256(left || right)"
}
```

This payload is export material for an external submit flow.

The UI does not submit transactions, use private keys, call RPC, or deploy contracts.

## 6. Sepolia anchor result

After an external Sepolia transaction anchors the Merkle root, the result can be imported locally.

Accepted result shape:

```json
{
  "network": "sepolia",
  "chainId": 11155111,
  "contractAddress": "0x...",
  "txHash": "0x...",
  "receiptRoot": "0x...",
  "metadataURI": "ipfs://...",
  "event": {
    "name": "ReceiptAnchored",
    "receiptRoot": "0x...",
    "metadataURI": "ipfs://...",
    "publisher": "0x..."
  }
}
```

Validation rules:

* `network` must be `sepolia`
* `chainId` must be `11155111`
* `contractAddress` must be a valid `0x...` address
* `txHash` must be a valid `0x...` transaction hash
* top-level `receiptRoot` must exist
* top-level `receiptRoot` must match current `anchor.merkle_root`
* if `event.receiptRoot` exists, it must also match current `anchor.merkle_root`
* if `event.name` exists, it must be `ReceiptAnchored`

Important v0 semantic note:

Legacy `receiptRoot` from the anchor submit result is interpreted as the anchored Merkle root and must match `anchor.merkle_root`.

In v0 one-leaf mode, `receipt_root == merkle_root`, so legacy anchor contracts may expose the anchored value as `receiptRoot`.

## 7. Imported anchor overlay

On successful import, the UI updates only the effective local receipt evidence overlay:

```json
{
  "onchain_anchor_status": "anchored",
  "network": "sepolia",
  "contract": "<contractAddress>",
  "tx_hash": "<txHash>"
}
```

The import must not change:

* `anchor.verifier_status`
* `anchor.receipt_root`
* `anchor.merkle_root`
* `anchor.merkle_proof`
* `anchor.merkle_leaf_index`

`verifier_status` remains separate from on-chain anchor status.

## 8. Guided UI flow

Receipt Explorer v0 exposes the flow as:

```text
1. Verify receipt
2. Attach local Merkle proof
3. Prepare Sepolia payload
4. Copy Sepolia payload
5. Import Sepolia result
6. Copy final JSON
```

The import step requires a Merkle proof to be attached first.

If the user tries to import before attaching a Merkle proof, the UI should show:

```text
Step 2 required: attach local Merkle proof first.
```

## 9. Verified demo values

Demo Sepolia anchor:

```text
network: sepolia
contract: 0x461e60fa7D2Bd9512DE1B043A3e8d206462D34f5
tx_hash: 0x03828c9ba39f27a7f433a3e830160c7fa30c1993877ed6563e74705e300d082c
receipt_root / merkle_root: 0xb7ab6e747a888e341e3d6a3a1b22f28e0c6adbf454a57be30ca4336cb6954e16
```
## 10.  Receipt vs Reputation

Receipt Protocol v0 separates verification from reputation.

1. **Receipt verification**
   proves what was requested, authorized, executed, changed, anchored, and exported as evidence.

2. **Reputation update**
   may later use verified receipts as input for agent selection, validator routing, trust score updates, and future work allocation.

Protocol rule:

```text
proof first, scoring second
```

A receipt must be independently verifiable before it can affect reputation.

Receipt Protocol v0 does not define a reputation scoring rule. It only defines the evidence layer that future reputation systems may consume.
## 11 Future Extension: Receipt-Driven Feedback Loop

Verified work receipts may later become feedback signals for adaptive agent systems.

Receipt Protocol v0 does not define the scoring or routing algorithm. It only defines the independently verifiable evidence object that future systems may consume.

A future receipt-driven feedback loop may update:

* agent selection
* mission decomposition
* hypothesis priority
* validator routing
* resource allocation
* future search behavior

A concrete CYPHES-style loop could be:

```text
EXPLORE -> PROVE -> SCORE -> REINFORCE -> DECAY -> RE-ROUTE
```

In this model:

1. **Explore**
   agents attempt work, search paths, hypotheses, or tasks.

2. **Prove**
   the system emits a verifiable receipt for the work path.

3. **Score**
   only independently verified receipts become eligible for scoring.

4. **Reinforce**
   successful verified patterns can influence future routing and allocation.

5. **Decay**
   older receipts lose influence over time unless reinforced by newer verified work.

6. **Re-route**
   weak, stale, failed, or unverifiable work paths are deprioritized.

Protocol rule:

```text
receipts are proof inputs, not reputation outputs
```

The receipt layer makes work independently verifiable.
The feedback layer may later consume verified receipts to update adaptive behavior.

## 12. Non-goals for v0

Receipt Protocol v0 does not define:

* live transaction submission from UI
* private key handling in UI
* RPC calls from Receipt Explorer import flow
* production verifier finality rules
* multi-leaf Merkle trees
* cross-chain anchoring
* contract deployment flow
* reputation update logic
* trust score calculation
* agent routing or reinforcement policy
* compensation economics
* automatic resource allocation based on receipts
* receipt-driven feedback loop execution
These are future extensions.
