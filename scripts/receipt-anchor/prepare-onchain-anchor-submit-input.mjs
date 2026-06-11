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

function prepareSubmitInput(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("payload must be a JSON object")
  }

  if (payload.schema !== "stealth.receipt_anchor.onchain_payload.v1") {
    throw new Error(`invalid schema: expected \"stealth.receipt_anchor.onchain_payload.v1\", got ${JSON.stringify(payload.schema)}`)
  }

  if (payload.anchor_target !== "onchain") {
    throw new Error(`invalid anchor_target: expected \"onchain\", got ${JSON.stringify(payload.anchor_target)}`)
  }

  if (payload.hash !== "sha256(left || right)") {
    throw new Error(`invalid hash: expected \"sha256(left || right)\", got ${JSON.stringify(payload.hash)}`)
  }

  if (payload.merkle_proof_status !== "attached") {
    throw new Error(`invalid merkle_proof_status: expected \"attached\", got ${JSON.stringify(payload.merkle_proof_status)}`)
  }

  if (!Array.isArray(payload.merkle_proof)) {
    throw new Error("merkle_proof must be an array")
  }

  return {
    schema: "stealth.receipt_anchor.submit_input.v1",
    anchor_type: "merkle_root",
    merkle_root: normalizeRoot(payload.merkle_root, "merkle_root"),
    receipt_root: normalizeRoot(payload.receipt_root, "receipt_root"),
    merkle_leaf_index: normalizeLeafIndex(payload.merkle_leaf_index),
    merkle_proof: payload.merkle_proof.map(normalizeProofEntry),
    hash: "sha256(left || right)",
    submit_status: "ready",
    note: "local payload prepared for onchain anchor submit",
  }
}

const inputFile = process.argv[2]
const outputFile = process.argv[3]

if (!inputFile) {
  console.error("Usage: node scripts/receipt-anchor/prepare-onchain-anchor-submit-input.mjs <onchain-payload.json> [output.json]")
  process.exit(2)
}

try {
  const submitInput = prepareSubmitInput(readJson(inputFile))
  const output = `${JSON.stringify(submitInput, null, 2)}\n`

  if (outputFile) {
    writeFileSync(outputFile, output, "utf8")
    console.log(JSON.stringify({ ok: true, output: outputFile, receipt_root: submitInput.receipt_root }, null, 2))
  } else {
    process.stdout.write(output)
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}
