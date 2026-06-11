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

function buildDryRun(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("payload must be a JSON object")
  }

  if (payload.schema !== "stealth.receipt_anchor.submit_input.v1") {
    throw new Error(`invalid schema: expected \"stealth.receipt_anchor.submit_input.v1\", got ${JSON.stringify(payload.schema)}`)
  }

  if (payload.submit_status !== "ready") {
    throw new Error(`invalid submit_status: expected \"ready\", got ${JSON.stringify(payload.submit_status)}`)
  }

  if (payload.anchor_type !== "merkle_root") {
    throw new Error(`invalid anchor_type: expected \"merkle_root\", got ${JSON.stringify(payload.anchor_type)}`)
  }

  if (payload.hash !== "sha256(left || right)") {
    throw new Error(`invalid hash: expected \"sha256(left || right)\", got ${JSON.stringify(payload.hash)}`)
  }

  if (!Array.isArray(payload.merkle_proof)) {
    throw new Error("merkle_proof must be an array")
  }

  const proof = payload.merkle_proof.map(normalizeProofEntry)

  return {
    schema: "stealth.receipt_anchor.submit_dry_run.v1",
    mode: "dry_run",
    would_submit: true,
    anchor_type: "merkle_root",
    merkle_root: normalizeRoot(payload.merkle_root, "merkle_root"),
    receipt_root: normalizeRoot(payload.receipt_root, "receipt_root"),
    merkle_leaf_index: normalizeLeafIndex(payload.merkle_leaf_index),
    proof_length: proof.length,
    hash: "sha256(left || right)",
    note: "dry run only; no transaction sent",
  }
}

const inputFile = process.argv[2]
const outputFile = process.argv[3]

if (!inputFile) {
  console.error("Usage: node scripts/receipt-anchor/onchain-anchor-submit-dry-run.mjs <submit-input.json> [output.json]")
  process.exit(2)
}

try {
  const dryRun = buildDryRun(readJson(inputFile))
  const output = `${JSON.stringify(dryRun, null, 2)}\n`

  if (outputFile) {
    writeFileSync(outputFile, output, "utf8")
    console.log(JSON.stringify({ ok: true, output: outputFile, receipt_root: dryRun.receipt_root }, null, 2))
  } else {
    process.stdout.write(output)
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}
