#!/usr/bin/env node
import { readFileSync } from "node:fs"
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

function verifyOne(input) {
  const receiptRoot = normalizeRoot(input.receipt_root, "receipt_root")
  const merkleRoot = normalizeRoot(input.merkle_root, "merkle_root")

  if (!Number.isInteger(input.merkle_leaf_index) || input.merkle_leaf_index < 0) {
    throw new Error("merkle_leaf_index must be a non-negative integer")
  }

  if (!Array.isArray(input.merkle_proof)) {
    throw new Error("merkle_proof must be an array")
  }

  let computed = receiptRoot
  let index = input.merkle_leaf_index

  for (const siblingValue of input.merkle_proof) {
    const sibling = normalizeRoot(siblingValue, "merkle_proof sibling")
    computed = index % 2 === 0 ? hashPair(computed, sibling) : hashPair(sibling, computed)
    index = Math.floor(index / 2)
  }

  const ok = computed === merkleRoot

  return {
    ok,
    receipt_root: receiptRoot,
    merkle_leaf_index: input.merkle_leaf_index,
    merkle_root: merkleRoot,
    recomputed_root: computed,
  }
}

function extractProofObject(parsed) {
  if (parsed?.anchor && typeof parsed.anchor === "object") {
    return parsed.anchor
  }

  return parsed
}

function verifyParsed(parsed) {
  if (parsed?.merkle_root && Array.isArray(parsed.leaves)) {
    const results = parsed.leaves.map((leaf) =>
      verifyOne({
        ...leaf,
        merkle_root: parsed.merkle_root,
      }),
    )

    return {
      ok: results.every((result) => result.ok),
      merkle_root: normalizeRoot(parsed.merkle_root, "merkle_root"),
      checked_count: results.length,
      results,
    }
  }

  return verifyOne(extractProofObject(parsed))
}

const file = process.argv[2]

if (!file) {
  console.error("Usage: node scripts/receipt-anchor/verify-merkle-proof.mjs <merkle-proof-or-batch.json>")
  process.exit(2)
}

try {
  const raw = readFileSync(file, "utf8").replace(/^\uFEFF/, "")
  const parsed = JSON.parse(raw)
  const result = verifyParsed(parsed)

  console.log(JSON.stringify(result, null, 2))
  process.exit(result.ok ? 0 : 1)
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}
