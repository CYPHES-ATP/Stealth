import { readFileSync } from "node:fs"
import { createHash } from "node:crypto"

type Evidence = {
  schema?: string
  task?: {
    id?: string
    title?: string
    scope?: {
      allowed_files?: string[]
      allowed_commands?: string[]
      network_allowed?: boolean
    }
  }
  agent?: {
    id?: string
    runtime?: string
  }
  changes?: {
    files_changed?: string[]
    diff_sha256?: string
  }
  commands?: Array<{
    command?: string
    exit_code?: number
  }>
  artifacts?: Array<{
    name?: string
    sha256?: string
  }>
}

type ReasonCode =
  | "OK"
  | "INVALID_EVIDENCE"
  | "SCOPE_EXCEEDED"
  | "COMMAND_FAILED"
  | "UNVERIFIABLE"

function sha256Json(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex")
}

function verifyEvidence(evidence: Evidence): {
  status: "OK" | "REJECT"
  reason_code: ReasonCode
  summary: string
  receipt: Record<string, unknown>
} {
  const allowedFiles = evidence.task?.scope?.allowed_files ?? []
  const changedFiles = evidence.changes?.files_changed ?? []
  const allowedCommands = evidence.task?.scope?.allowed_commands ?? []
  const commands = evidence.commands ?? []

  if (!evidence.task?.id || !evidence.agent?.id || !evidence.changes?.diff_sha256) {
    return {
      status: "REJECT",
      reason_code: "INVALID_EVIDENCE",
      summary: "Missing task, agent, or diff commitment evidence.",
      receipt: {},
    }
  }

  const outOfScopeFile = changedFiles.find((file) => !allowedFiles.includes(file))
  if (outOfScopeFile) {
    return {
      status: "REJECT",
      reason_code: "SCOPE_EXCEEDED",
      summary: `Changed file outside allowed scope: ${outOfScopeFile}`,
      receipt: {},
    }
  }

  const disallowedCommand = commands.find((item) => !allowedCommands.includes(item.command ?? ""))
  if (disallowedCommand) {
    return {
      status: "REJECT",
      reason_code: "SCOPE_EXCEEDED",
      summary: `Command outside allowed scope: ${disallowedCommand.command}`,
      receipt: {},
    }
  }

  const failedCommand = commands.find((item) => item.exit_code !== 0)
  if (failedCommand) {
    return {
      status: "REJECT",
      reason_code: "COMMAND_FAILED",
      summary: `Command failed: ${failedCommand.command}`,
      receipt: {},
    }
  }

  const receipt = {
    schema: "stealth.handoff.receipt.v0",
    task_id: evidence.task.id,
    agent_id: evidence.agent.id,
    runtime: evidence.agent.runtime,
    changed_files: changedFiles,
    diff_sha256: evidence.changes.diff_sha256,
    evidence_sha256: sha256Json(evidence),
    outcome: "OK",
    reason_code: "OK",
  }

  return {
    status: "OK",
    reason_code: "OK",
    summary: "The agent stayed within scope, commands succeeded, and the handoff evidence verifies.",
    receipt,
  }
}

const evidencePath = process.argv[2] ?? "examples/verified-handoff/session-evidence.sample.json"
const evidence = JSON.parse(readFileSync(evidencePath, "utf8")) as Evidence
const result = verifyEvidence(evidence)

console.log(JSON.stringify(result, null, 2))

if (result.status !== "OK") {
  process.exit(1)
}
