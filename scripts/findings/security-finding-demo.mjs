#!/usr/bin/env node
import { readFileSync } from "node:fs"
import { basename } from "node:path"

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

function evaluateFinding(finding) {
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

  if (isValidRoot(finding?.evidence_root) && isValidRoot(finding?.expected_evidence_root) && finding.evidence_root !== finding.expected_evidence_root) {
    reason_codes.push("evidence_root_mismatch")
  }

  if (
    isNonEmptyString(finding?.expected_session_id) &&
    isNonEmptyString(finding?.session_id) &&
    finding.session_id !== finding.expected_session_id
  ) {
    reason_codes.push("context_mismatch")
  }

  return {
    accepted: reason_codes.length === 0,
    reason_codes,
    verifier: "stealth.finding_quality.v1",
  }
}

function runFixtures(files) {
  const results = files.map((file) => {
    const finding = readJson(file)
    const verdict = evaluateFinding(finding)
    return {
      name: finding.name ?? basename(file),
      accepted: verdict.accepted,
      reason_codes: verdict.reason_codes,
      verifier: verdict.verifier,
    }
  })

  return {
    schema: "stealth.security_finding_demo.v1",
    ok: results.every((result) => {
      if (result.name.includes("valid")) return result.accepted
      return !result.accepted
    }),
    results,
  }
}

const files = process.argv.slice(2)

if (files.length === 0) {
  console.error("Usage: node scripts/findings/security-finding-demo.mjs <finding.json> [finding.json ...]")
  process.exit(2)
}

try {
  const output = runFixtures(files)
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`)
  process.exit(output.ok ? 0 : 1)
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}
