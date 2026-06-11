#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs"

function readJson(file) {
  return JSON.parse(readFileSync(file, "utf8").replace(/^\uFEFF/, ""))
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

function normalizeProofEntry(value, index) {
  return normalizeRoot(value, `merkle_proof[${index}]`)
}

function normalizeLeafIndex(value) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error("invalid merkle_leaf_index: must be a non-negative integer")
  }

  return value
}

function exportPayload(evidence) {
  if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)) {
    throw new Error("evidence must be a JSON object")
  }

  if (!evidence.anchor || typeof evidence.anchor !== "object" || Array.isArray(evidence.anchor)) {
    throw new Error("missing anchor object")
  }

  const anchor = evidence.anchor

  if (anchor.merkle_proof_status !== "attached") {
    throw new Error(`invalid merkle_proof_status: expected \"attached\", got ${JSON.stringify(anchor.merkle_proof_status)}`)
  }

  if (!Array.isArray(anchor.merkle_proof)) {
    throw new Error("merkle_proof must be an array")
  }

  return {
    schema: "stealth.receipt_anchor.onchain_payload.v1",
    receipt_root: normalizeRoot(anchor.receipt_root, "receipt_root"),
    merkle_root: normalizeRoot(anchor.merkle_root, "merkle_root"),
    merkle_leaf_index: normalizeLeafIndex(anchor.merkle_leaf_index),
    merkle_proof: anchor.merkle_proof.map(normalizeProofEntry),
    merkle_proof_status: "attached",
    anchor_target: "onchain",
    hash: "sha256(left || right)",
  }
}

const inputFile = process.argv[2]
const outputFile = process.argv[3]

if (!inputFile) {
  console.error("Usage: node scripts/receipt-anchor/export-onchain-anchor-payload.mjs <attached-evidence.json> [output.json]")
  process.exit(2)
}

try {
  const payload = exportPayload(readJson(inputFile))
  const output = `${JSON.stringify(payload, null, 2)}\n`

  if (outputFile) {
    writeFileSync(outputFile, output, "utf8")
    console.log(JSON.stringify({ ok: true, output: outputFile, receipt_root: payload.receipt_root }, null, 2))
  } else {
    process.stdout.write(output)
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}
