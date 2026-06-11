#!/usr/bin/env node
import { readFileSync } from "node:fs"
import { createHash } from "node:crypto"

function sha256Hex(buffer) {
  return createHash("sha256").update(buffer).digest("hex")
}

function normalizeRoot(value) {
  if (typeof value !== "string") {
    throw new Error("receipt root must be a string")
  }

  const root = value.toLowerCase()
  if (!/^0x[0-9a-f]{64}$/.test(root)) {
    throw new Error(`invalid receipt root: ${value}`)
  }

  return root
}

function hexToBuffer(value) {
  return Buffer.from(value.slice(2), "hex")
}

function hashPair(left, right) {
  return `0x${sha256Hex(Buffer.concat([hexToBuffer(left), hexToBuffer(right)]))}`
}

function nextLevel(level) {
  const next = []

  for (let i = 0; i < level.length; i += 2) {
    const left = level[i]
    const right = level[i + 1] ?? left
    next.push(hashPair(left, right))
  }

  return next
}

function buildTree(leaves) {
  const levels = [leaves]

  while (levels[levels.length - 1].length > 1) {
    levels.push(nextLevel(levels[levels.length - 1]))
  }

  return levels
}

function buildProof(levels, leafIndex) {
  const proof = []
  let index = leafIndex

  for (let depth = 0; depth < levels.length - 1; depth++) {
    const level = levels[depth]
    const siblingIndex = index % 2 === 0 ? index + 1 : index - 1
    const sibling = level[siblingIndex] ?? level[index]

    proof.push(sibling)
    index = Math.floor(index / 2)
  }

  return proof
}

function readRoots(file) {
  const raw = readFileSync(file, "utf8").replace(/^\uFEFF/, "")
  const parsed = JSON.parse(raw)

  if (Array.isArray(parsed)) {
    return parsed.map(normalizeRoot)
  }

  if (parsed && typeof parsed === "object" && Array.isArray(parsed.receipt_roots)) {
    return parsed.receipt_roots.map(normalizeRoot)
  }

  throw new Error("input must be an array of receipt roots or { receipt_roots: [...] }")
}

const file = process.argv[2]

if (!file) {
  console.error("Usage: node scripts/receipt-anchor/build-merkle-batch.mjs <receipt-roots.json>")
  process.exit(2)
}

try {
  const receiptRoots = readRoots(file)

  if (receiptRoots.length === 0) {
    throw new Error("at least one receipt root is required")
  }

  const levels = buildTree(receiptRoots)
  const merkleRoot = levels[levels.length - 1][0]

  const output = {
    schema: "stealth.receipt_anchor.merkle_batch.v1",
    hash: "sha256(left || right)",
    odd_leaf: "duplicate-last",
    merkle_root: merkleRoot,
    leaf_count: receiptRoots.length,
    leaves: receiptRoots.map((receiptRoot, index) => ({
      receipt_root: receiptRoot,
      merkle_leaf_index: index,
      merkle_proof: buildProof(levels, index),
    })),
  }

  console.log(JSON.stringify(output, null, 2))
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}
