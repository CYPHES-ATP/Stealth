#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs"
import { createHash } from "node:crypto"

function sha256Hex(buffer) {
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
  return `0x${sha256Hex(Buffer.concat([hexToBuffer(left), hexToBuffer(right)]))}`
}

function readJson(file) {
  return JSON.parse(readFileSync(file, "utf8").replace(/^\uFEFF/, ""))
}

function verifyProof(proof) {
  const receiptRoot = normalizeRoot(proof.receipt_root, "receipt_root")
  const merkleRoot = normalizeRoot(proof.merkle_root, "merkle_root")

  if (!Number.isInteger(proof.merkle_leaf_index) || proof.merkle_leaf_index < 0) {
    throw new Error("merkle_leaf_index must be a non-negative integer")
  }

  if (!Array.isArray(proof.merkle_proof)) {
    throw new Error("merkle_proof must be an array")
  }

  let computed = receiptRoot
  let index = proof.merkle_leaf_index

  for (const siblingValue of proof.merkle_proof) {
    const sibling = normalizeRoot(siblingValue, "merkle_proof sibling")
    computed = index % 2 === 0 ? hashPair(computed, sibling) : hashPair(sibling, computed)
    index = Math.floor(index / 2)
  }

  return {
    ok: computed === merkleRoot,
    receipt_root: receiptRoot,
    merkle_root: merkleRoot,
    merkle_leaf_index: proof.merkle_leaf_index,
    merkle_proof: proof.merkle_proof.map((item) => normalizeRoot(item, "merkle_proof sibling")),
    recomputed_root: computed,
  }
}

function extractProof(proofInput, receiptRoot) {
  if (proofInput?.merkle_root && Array.isArray(proofInput.leaves)) {
    const match = proofInput.leaves.find(
      (leaf) => normalizeRoot(leaf.receipt_root, "leaf.receipt_root") === receiptRoot,
    )

    if (!match) {
      throw new Error(`receipt_root not found in Merkle batch: ${receiptRoot}`)
    }

    return {
      receipt_root: match.receipt_root,
      merkle_leaf_index: match.merkle_leaf_index,
      merkle_proof: match.merkle_proof,
      merkle_root: proofInput.merkle_root,
    }
  }

  if (proofInput?.anchor && typeof proofInput.anchor === "object") {
    return proofInput.anchor
  }

  return proofInput
}

const evidenceFile = process.argv[2]
const proofFile = process.argv[3]
const outputFile = process.argv[4]

if (!evidenceFile || !proofFile) {
  console.error("Usage: node scripts/receipt-anchor/attach-merkle-proof.mjs <evidence.json> <merkle-batch-or-proof.json> [output.json]")
  process.exit(2)
}

try {
  const evidence = readJson(evidenceFile)

  if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)) {
    throw new Error("evidence must be a JSON object")
  }

  if (!evidence.anchor || typeof evidence.anchor !== "object" || Array.isArray(evidence.anchor)) {
    throw new Error("evidence must include anchor object")
  }

  const receiptRoot = normalizeRoot(evidence.anchor.receipt_root, "evidence.anchor.receipt_root")
  const proofInput = readJson(proofFile)
  const proof = extractProof(proofInput, receiptRoot)
  const verified = verifyProof(proof)

  if (verified.receipt_root !== receiptRoot) {
    throw new Error(`proof receipt_root mismatch: expected ${receiptRoot}, got ${verified.receipt_root}`)
  }

  if (!verified.ok) {
    throw new Error(`invalid Merkle proof: recomputed ${verified.recomputed_root}, expected ${verified.merkle_root}`)
  }

  const attached = {
    ...evidence,
    anchor: {
      ...evidence.anchor,
      merkle_proof_status: "attached",
      merkle_root: verified.merkle_root,
      merkle_leaf_index: verified.merkle_leaf_index,
      merkle_proof: verified.merkle_proof,
    },
  }

  const output = `${JSON.stringify(attached, null, 2)}\n`

  if (outputFile) {
    writeFileSync(outputFile, output, "utf8")
    console.log(JSON.stringify({
      ok: true,
      output: outputFile,
      receipt_root: receiptRoot,
      merkle_root: verified.merkle_root,
      merkle_leaf_index: verified.merkle_leaf_index,
      merkle_proof_status: "attached",
    }, null, 2))
  } else {
    process.stdout.write(output)
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}