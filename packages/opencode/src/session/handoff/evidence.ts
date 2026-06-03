import { createHash } from "node:crypto"
import { Schema } from "effect"
import type { Snapshot } from "@/snapshot"
import type { MessageV2 } from "@/session/message-v2"
import type { Session } from "@/session/session"

export type HandoffEvidenceCommand = {
  command: string
  exit_code?: number
  stdout_summary?: string
}

export type HandoffEvidence = {
  schema: "stealth.session.evidence.v0"
  session_id: string
  directory: string
  task: {
    title?: string
    prompt?: string
  }
  agent: {
    id?: string
    runtime: "Stealth"
  }
  scope: {
    permission?: unknown
  }
  commands: HandoffEvidenceCommand[]
  changes: {
    files_changed: string[]
    diff_sha256: string | null
  }
  metadata: {
    message_count: number
    diff_count: number
    generated_by: "stealth.handoff.evidence.builder.v0"
  }
}

export const HandoffEvidenceSchema = Schema.Struct({
  schema: Schema.Literal("stealth.session.evidence.v0"),
  session_id: Schema.String,
  directory: Schema.String,
  task: Schema.Struct({
    title: Schema.optional(Schema.String),
    prompt: Schema.optional(Schema.String),
  }),
  agent: Schema.Struct({
    id: Schema.optional(Schema.String),
    runtime: Schema.Literal("Stealth"),
  }),
  scope: Schema.Struct({
    permission: Schema.optional(Schema.Unknown),
  }),
  commands: Schema.Array(
    Schema.Struct({
      command: Schema.String,
      exit_code: Schema.optional(Schema.Number),
      stdout_summary: Schema.optional(Schema.String),
    }),
  ),
  changes: Schema.Struct({
    files_changed: Schema.Array(Schema.String),
    diff_sha256: Schema.NullOr(Schema.String),
  }),
  metadata: Schema.Struct({
    message_count: Schema.Number,
    diff_count: Schema.Number,
    generated_by: Schema.Literal("stealth.handoff.evidence.builder.v0"),
  }),
})

function sha256(input: string) {
  return createHash("sha256").update(input).digest("hex")
}

function firstUserPrompt(messages: MessageV2.WithParts[]) {
  for (const message of messages) {
    if (message.info.role !== "user") continue
    for (const part of message.parts) {
      if (part.type === "text") return part.text
    }
  }
  return undefined
}

function extractCommands(messages: MessageV2.WithParts[]): HandoffEvidenceCommand[] {
  const commands: HandoffEvidenceCommand[] = []

  for (const message of messages) {
    for (const part of message.parts) {
      if (part.type !== "tool") continue

      const input = part.state.input
      const command =
        typeof input?.command === "string"
          ? input.command
          : typeof input?.cmd === "string"
            ? input.cmd
            : undefined

      if (!command) continue

      const metadata =
        "metadata" in part.state && part.state.metadata && typeof part.state.metadata === "object"
          ? part.state.metadata
          : undefined

      const output =
        "output" in part.state && typeof part.state.output === "string"
          ? part.state.output
          : undefined

      commands.push({
        command,
        exit_code:
          metadata && "exit_code" in metadata && typeof metadata.exit_code === "number"
            ? metadata.exit_code
            : undefined,
        stdout_summary: output ? output.slice(0, 240) : undefined,
      })
    }
  }

  return commands
}

export function buildHandoffEvidence(input: {
  session: Session.Info
  messages: MessageV2.WithParts[]
  diffs: Snapshot.FileDiff[]
}): HandoffEvidence {
  const filesChanged = [...new Set(input.diffs.map((diff) => diff.file).filter((file): file is string => !!file))]
  const diffPayload = JSON.stringify(input.diffs)

  return {
    schema: "stealth.session.evidence.v0",
    session_id: input.session.id,
    directory: input.session.directory,
    task: {
      title: input.session.title,
      prompt: firstUserPrompt(input.messages),
    },
    agent: {
      id: input.session.agent,
      runtime: "Stealth",
    },
    scope: {
      permission: input.session.permission,
    },
    commands: extractCommands(input.messages),
    changes: {
      files_changed: filesChanged,
      diff_sha256: input.diffs.length ? sha256(diffPayload) : null,
    },
    metadata: {
      message_count: input.messages.length,
      diff_count: input.diffs.length,
      generated_by: "stealth.handoff.evidence.builder.v0",
    },
  }
}
