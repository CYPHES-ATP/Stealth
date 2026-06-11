#!/usr/bin/env node
import { readFileSync } from "node:fs"
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

function stripTopLevelAnchor(evidence) {
  const { anchor: _anchor, ...withoutAnchor } = evidence
  return withoutAnchor
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

function verifyReceiptRoot(evidence) {
  const receiptRoot = normalizeRoot(evidence.anchor?.receipt_root, "anchor.receipt_root")
  const recomputedRoot = `0x${sha256Hex(canonicalize(stripTopLevelAnchor(evidence)))}`
  const ok = receiptRoot === recomputedRoot.toLowerCase()

  return {
    ok,
    receipt_root: receiptRoot,
    recomputed_root: recomputedRoot,
  }
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
    receipt_root: receiptRoot,
    merkle_leaf_index: anchor.merkle_leaf_index,
    merkle_root: merkleRoot,
    recomputed_root: computed,
  }
}

const file = process.argv[2]

if (!file) {
  console.error("Usage: node scripts/receipt-anchor/verify-attached-anchor-chain.mjs <attached-evidence.json>")
  process.exit(2)
}

try {
  const evidence = JSON.parse(readFileSync(file, "utf8").replace(/^\uFEFF/, ""))

  if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)) {
    throw new Error("Invalid evidence: expected JSON object")
  }

  if (!evidence.anchor || typeof evidence.anchor !== "object" || Array.isArray(evidence.anchor)) {
    throw new Error("Invalid evidence: missing anchor object")
  }

  const receipt = verifyReceiptRoot(evidence)
  const merkle = verifyMerkleProof(evidence.anchor)
  const merkleProofStatus = evidence.anchor.merkle_proof_status ?? null
  const statusOk = merkleProofStatus === "attached"
  const ok = receipt.ok && merkle.ok && statusOk

  console.log(JSON.stringify({
    ok,
    checks: {
      receipt_root: receipt.ok,
      merkle_proof: merkle.ok,
      merkle_proof_status_attached: statusOk,
    },
    receipt_root: receipt.receipt_root,
    recomputed_receipt_root: receipt.recomputed_root,
    merkle_root: merkle.merkle_root,
    recomputed_merkle_root: merkle.recomputed_root,
    merkle_leaf_index: merkle.merkle_leaf_index,
    merkle_proof_status: merkleProofStatus,
  }, null, 2))

  process.exit(ok ? 0 : 1)
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}