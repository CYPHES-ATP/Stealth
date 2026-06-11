#!/usr/bin/env node
import { createHash } from "node:crypto"

function canonicalize(value) {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value)
  }

  if (Array.isArray(value)) {
    return `[${value.map(canonicalize).join(",")}]`
  }

  const keys = Object.keys(value)
    .filter((key) => value[key] !== undefined)
    .sort()

  return `{${keys
    .map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`)
    .join(",")}}`
}

function sha256Hex(value) {
  return createHash("sha256").update(value).digest("hex")
}

function sha256Buffer(buffer) {
  return createHash("sha256").update(buffer).digest("hex")
}

function normalizeRoot(value, label) {
  if (typeof value !== "string") {
    throw new Error(`${label} must be a string`)
  }

  const root = value.toLowerCase()
  if (!/^0x[0-9a-f]{64}$/.test(root)) {
    throw new Error(`invalid ${label}: ${value}`)
  }

  return root
}

function hexToBuffer(value) {
  return Buffer.from(value.slice(2), "hex")
}

function hashPair(left, right) {
  return `0x${sha256Buffer(Buffer.concat([hexToBuffer(left), hexToBuffer(right)]))}`
}

function stripTopLevelAnchor(evidence) {
  const { anchor: _anchor, ...withoutAnchor } = evidence
  return withoutAnchor
}

function computeReceiptRoot(evidenceWithoutAnchor) {
  return `0x${sha256Hex(canonicalize(evidenceWithoutAnchor))}`
}

function buildMerkleLevels(receiptRoots) {
  const leaves = receiptRoots.map((root) => normalizeRoot(root, "receipt_root"))
  const levels = [leaves]

  while (levels.at(-1).length > 1) {
    const level = levels.at(-1)
    const nextLevel = []

    for (let index = 0; index < level.length; index += 2) {
      const left = level[index]
      const right = level[index + 1] ?? left
      nextLevel.push(hashPair(left, right))
    }

    levels.push(nextLevel)
  }

  return levels
}

function buildProof(levels, leafIndex) {
  const proof = []
  let index = leafIndex

  for (let levelIndex = 0; levelIndex < levels.length - 1; levelIndex += 1) {
    const level = levels[levelIndex]
    const siblingIndex = index % 2 === 0 ? index + 1 : index - 1
    proof.push(level[siblingIndex] ?? level[index])
    index = Math.floor(index / 2)
  }

  return proof
}

function verifyMerkleProof(anchor) {
  const receiptRoot = normalizeRoot(anchor.receipt_root, "anchor.receipt_root")
  const merkleRoot = normalizeRoot(anchor.merkle_root, "anchor.merkle_root")

  if (!Number.isInteger(anchor.merkle_leaf_index) || anchor.merkle_leaf_index < 0) {
    throw new Error("anchor.merkle_leaf_index must be a non-negative integer")
  }

  if (!Array.isArray(anchor.merkle_proof)) {
    throw new Error("anchor.merkle_proof must be an array")
  }

  let computed = receiptRoot
  let index = anchor.merkle_leaf_index

  for (const siblingValue of anchor.merkle_proof) {
    const sibling = normalizeRoot(siblingValue, "anchor.merkle_proof sibling")
    computed = index % 2 === 0 ? hashPair(computed, sibling) : hashPair(sibling, computed)
    index = Math.floor(index / 2)
  }

  return {
    ok: computed === merkleRoot,
    recomputed_root: computed,
  }
}

const baseEvidence = {
  schema: "stealth.session.evidence.v1",
  kind: "local-anchor-chain-e2e-demo",
  metadata: {
    message_count: 1,
  },
  result: {
    status: "demo-only",
  },
}

const receiptRoot = computeReceiptRoot(baseEvidence)

const receiptRoots = [
  receiptRoot,
  "0x0000000000000000000000000000000000000000000000000000000000000002",
]

const merkleLevels = buildMerkleLevels(receiptRoots)
const merkleRoot = merkleLevels.at(-1)[0]
const merkleLeafIndex = 0
const merkleProof = buildProof(merkleLevels, merkleLeafIndex)

const attachedEvidence = {
  ...baseEvidence,
  anchor: {
    receipt_root: receiptRoot,
    merkle_proof_status: "attached",
    merkle_root: merkleRoot,
    merkle_leaf_index: merkleLeafIndex,
    merkle_proof: merkleProof,
  },
}

const recomputedReceiptRoot = computeReceiptRoot(stripTopLevelAnchor(attachedEvidence))
const receiptRootOk = recomputedReceiptRoot === receiptRoot
const merkle = verifyMerkleProof(attachedEvidence.anchor)
const statusOk = attachedEvidence.anchor.merkle_proof_status === "attached"
const ok = receiptRootOk && merkle.ok && statusOk

console.log(JSON.stringify({
  ok,
  flow: [
    "base_evidence",
    "receipt_root",
    "merkle_batch",
    "attached_anchor",
    "verified_chain",
  ],
  checks: {
    receipt_root: receiptRootOk,
    merkle_proof: merkle.ok,
    merkle_proof_status_attached: statusOk,
  },
  receipt_root: receiptRoot,
  recomputed_receipt_root: recomputedReceiptRoot,
  merkle_root: merkleRoot,
  recomputed_merkle_root: merkle.recomputed_root,
  merkle_leaf_index: merkleLeafIndex,
  merkle_proof: merkleProof,
  attached_evidence: attachedEvidence,
}, null, 2))

process.exit(ok ? 0 : 1)