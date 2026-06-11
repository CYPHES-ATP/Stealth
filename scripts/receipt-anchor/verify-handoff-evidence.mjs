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

function stripTopLevelAnchor(evidence) {
  const { anchor: _anchor, ...withoutAnchor } = evidence
  return withoutAnchor
}

const file = process.argv[2]

if (!file) {
  console.error("Usage: node scripts/receipt-anchor/verify-handoff-evidence.mjs <handoff-evidence.json>")
  process.exit(2)
}

const raw = readFileSync(file, "utf8").replace(/^\uFEFF/, "")
const evidence = JSON.parse(raw)

if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)) {
  console.error("Invalid evidence: expected JSON object")
  process.exit(2)
}

const receiptRoot = evidence.anchor?.receipt_root

if (typeof receiptRoot !== "string") {
  console.error("Invalid evidence: missing anchor.receipt_root")
  process.exit(2)
}

const recomputedRoot = `0x${sha256Hex(canonicalize(stripTopLevelAnchor(evidence)))}`
const ok = receiptRoot.toLowerCase() === recomputedRoot.toLowerCase()

console.log(JSON.stringify({
  ok,
  receipt_root: receiptRoot,
  recomputed_root: recomputedRoot,
}, null, 2))

process.exit(ok ? 0 : 1)
