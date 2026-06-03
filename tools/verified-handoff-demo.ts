import { readFileSync } from "node:fs"
import { createHash } from "node:crypto"

type Evidence = {
  schema?: string
  session_id?: string
  directory?: string
  task?: {
    id?: string
    title?: string
    prompt?: string
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
  scope?: {
    permission?: unknown
  }
  changes?: {
    files_changed?: string[]
    diff_sha256?: string | null
  }
  commands?: Array<{
    command?: string
    exit_code?: number
    stdout_summary?: string
  }>
  artifacts?: Array<{
    name?: string
    sha256?: string
  }>
  metadata?: {
    message_count?: number
    diff_count?: number
    generated_by?: string
  }
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

function isPinnedV0Evidence(evidence: Evidence): boolean {
  return (
    evidence.schema === "stealth.session.evidence.v0" &&
    (evidence.session_id !== undefined || evidence.directory !== undefined || evidence.metadata !== undefined)
  )
}

function validateEvidenceSchema(evidence: Evidence): string | undefined {
  if (!isPinnedV0Evidence(evidence)) return undefined

  if (!evidence.session_id) return "Missing session_id."
  if (!evidence.directory) return "Missing directory."
  if (!evidence.task || typeof evidence.task !== "object") return "Missing task object."
  if (!evidence.agent || evidence.agent.runtime !== "Stealth") return "Missing Stealth agent runtime."
  if (!evidence.scope || typeof evidence.scope !== "object") return "Missing scope object."
  if (!evidence.changes || !Array.isArray(evidence.changes.files_changed)) {
    return "Missing changes.files_changed."
  }
  if (
    evidence.changes.diff_sha256 !== null &&
    evidence.changes.diff_sha256 !== undefined &&
    !/^[a-f0-9]{64}$/.test(evidence.changes.diff_sha256)
  ) {
    return "Invalid changes.diff_sha256."
  }
  if (!Array.isArray(evidence.commands)) return "Missing commands array."
  for (const command of evidence.commands) {
    if (!command.command) return "Command entry missing command."
  }
  if (!evidence.metadata) return "Missing metadata."
  if (typeof evidence.metadata.message_count !== "number") return "Missing metadata.message_count."
  if (typeof evidence.metadata.diff_count !== "number") return "Missing metadata.diff_count."
  if (evidence.metadata.generated_by !== "stealth.handoff.evidence.builder.v0") {
    return "Invalid metadata.generated_by."
  }

  return undefined
}

function verifyEvidence(evidence: Evidence): {
  status: "OK" | "REJECT"
  reason_code: ReasonCode
  summary: string
  receipt: Record<string, unknown>
} {
  const schemaError = validateEvidenceSchema(evidence)
  if (schemaError) {
    return {
      status: "REJECT",
      reason_code: "INVALID_EVIDENCE",
      summary: schemaError,
      receipt: {},
    }
  }

  const allowedFiles = evidence.task?.scope?.allowed_files ?? []
  const changedFiles = evidence.changes?.files_changed ?? []
  const allowedCommands = evidence.task?.scope?.allowed_commands ?? []
  const commands = evidence.commands ?? []

  if (isPinnedV0Evidence(evidence)) {
    const failedCommand = commands.find((item) => item.exit_code !== undefined && item.exit_code !== 0)
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
      task_id: evidence.task?.id ?? evidence.session_id,
      agent_id: evidence.agent?.id ?? "stealth-session",
      runtime: evidence.agent?.runtime,
      changed_files: changedFiles,
      diff_sha256: evidence.changes?.diff_sha256,
      evidence_sha256: sha256Json(evidence),
      outcome: "OK",
      reason_code: "OK",
    }

    return {
      status: "OK",
      reason_code: "OK",
      summary: "The evidence matches the pinned v0 schema and verifies.",
      receipt,
    }
  }

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

const args = process.argv.slice(2);
const evidencePath =
  args.find((arg) => !arg.startsWith("--")) ??
  "examples/verified-handoff/session-evidence.sample.json";

const expectArg = args.find((arg) => arg.startsWith("--expect="));
const expectedReasonCode = expectArg?.slice("--expect=".length);

const evidence = JSON.parse(readFileSync(evidencePath, "utf8")) as Evidence;
const result = verifyEvidence(evidence);

console.log(JSON.stringify(result, null, 2));

if (expectedReasonCode) {
  if (result.reason_code !== expectedReasonCode) {
    console.error(
      `Expected reason_code ${expectedReasonCode}, got ${result.reason_code}`
    );
    process.exit(1);
  }

  process.exit(0);
}

if (result.status !== "OK") {
  process.exit(1);
}
