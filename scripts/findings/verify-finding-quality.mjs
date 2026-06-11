#!/usr/bin/env node
import { readFileSync } from "node:fs"

const WEAK_PATTERNS = [
  /ai found a bug/i,
  /possible issue/i,
  /might be vulnerable/i,
  /maybe vulnerable/i,
  /potential bug/i,
]

function readJson(file) {
  return JSON.parse(readFileSync(file, "utf8").replace(/^\uFEFF/, ""))
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0
}

function isValidRoot(value) {
  return typeof value === "string" && /^0x[0-9a-fA-F]{64}$/.test(value)
}

function hasAffectedScope(value) {
  return Array.isArray(value) ? value.length > 0 : isNonEmptyString(value)
}

function isWeakClaimText(value) {
  if (!isNonEmptyString(value)) return true
  return WEAK_PATTERNS.some((pattern) => pattern.test(value))
}

function verifyFindingQuality(finding) {
  const reason_codes = []

  if (!isValidRoot(finding?.evidence_root)) {
    reason_codes.push("missing_evidence_root")
  }

  if (!hasAffectedScope(finding?.affected_scope)) {
    reason_codes.push("missing_affected_scope")
  }

  if (!isNonEmptyString(finding?.reproducible_condition)) {
    reason_codes.push("missing_reproducible_condition")
  }

  if (!isNonEmptyString(finding?.severity_rationale)) {
    reason_codes.push("missing_severity_rationale")
  }

  if (isWeakClaimText(finding?.claim ?? finding?.title ?? finding?.description)) {
    reason_codes.push("weak_claim_language")
  }

  return {
    accepted: reason_codes.length === 0,
    reason_codes,
    verifier: "stealth.finding_quality.v1",
  }
}

const inputFile = process.argv[2]

if (!inputFile) {
  console.error("Usage: node scripts/findings/verify-finding-quality.mjs <finding.json>")
  process.exit(2)
}

try {
  const result = verifyFindingQuality(readJson(inputFile))
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
  process.exit(result.accepted ? 0 : 1)
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}
