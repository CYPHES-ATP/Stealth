import { For, Show, createMemo } from "solid-js"
import { Dialog } from "@opencode-ai/ui/dialog"
import { useDialog } from "@opencode-ai/ui/context/dialog"
import { showToast } from "@opencode-ai/ui/toast"
import { useLanguage } from "@/context/language"
import type { HandoffEvidence, HandoffReceiptSummary } from "@/pages/session/handoff"
import { copyText } from "@/utils/copy"

type AnchorProofEvidence = HandoffEvidence & {
  anchor?: {
    receipt_root?: string | null
    merkle_proof_status?: string | null
    onchain_anchor_status?: string | null
    network?: string | null
    contract?: string | null
    tx_hash?: string | null
    verifier_status?: string | null
    proof_json?: unknown
  }
  proof?: AnchorProofEvidence["anchor"]
}

function evidenceToJson(evidence: HandoffEvidence) {
  return JSON.stringify(evidence, null, 2)
}

export function DialogReceiptExplorer(props: {
  evidence: HandoffEvidence
  summary: HandoffReceiptSummary
}) {
  const dialog = useDialog()
  const language = useLanguage()

  const changedFiles = createMemo(() => {
    const evidenceFiles = props.evidence.changes?.files_changed
    return evidenceFiles && evidenceFiles.length > 0 ? evidenceFiles : props.summary.changedFiles
  })
  const resolvedDiffHash = createMemo(() => {
    const evidenceDiffHash = props.evidence.changes?.diff_sha256
    return evidenceDiffHash && evidenceDiffHash.length > 0 ? evidenceDiffHash : props.summary.diffSha256 ?? "none"
  })
  const anchorProof = createMemo(() => {
    const evidence = props.evidence as AnchorProofEvidence
    return evidence.anchor ?? evidence.proof
  })
  const receiptRoot = createMemo(() => anchorProof()?.receipt_root ?? resolvedDiffHash())
  const merkleProofStatus = createMemo(() => anchorProof()?.merkle_proof_status ?? "not attached")
  const onchainAnchorStatus = createMemo(() => anchorProof()?.onchain_anchor_status ?? "not attached")
  const anchorNetwork = createMemo(() => anchorProof()?.network ?? "unknown")
  const anchorContract = createMemo(() => anchorProof()?.contract ?? "not attached")
  const anchorTxHash = createMemo(() => anchorProof()?.tx_hash ?? "not attached")
  const anchorVerifierStatus = createMemo(() => anchorProof()?.verifier_status ?? props.summary.verifierStatus ?? "not verified")
  const anchorProofJson = createMemo(() =>
    JSON.stringify(
      {
        receipt_root: receiptRoot(),
        merkle_proof_status: merkleProofStatus(),
        onchain_anchor_status: onchainAnchorStatus(),
        network: anchorNetwork(),
        contract: anchorContract(),
        tx_hash: anchorTxHash(),
        verifier_status: anchorVerifierStatus(),
      },
      null,
      2,
    ),
  )
  const commands = createMemo(() => (props.evidence.commands ?? []).filter((item) => !!item.command))
  const evidenceJson = createMemo(() => evidenceToJson(props.evidence))
  const scopedLease = createMemo(() => props.evidence.scope?.lease)
  const permissionJson = createMemo(() => {
    const permission = props.evidence.scope?.permission
    if (permission === undefined || permission === null) return null
    try {
      return JSON.stringify(permission, null, 2)
    } catch {
      return String(permission)
    }
  })
  const scopeStatus = createMemo(() =>
    props.evidence.scope && props.evidence.scope.permission !== undefined && props.evidence.scope.permission !== null
      ? "within captured scope"
      : "scope not fully specified",
  )

  const copyAnchorProofJson = () => {
    void copyText(anchorProofJson())
      .then(() => {
        showToast({
          variant: "success",
          icon: "circle-check",
          title: language.t("session.share.copy.copied"),
          description: "Receipt anchor proof path copied to clipboard",
        })
      })
      .catch((error: unknown) => {
        showToast({
          title: language.t("common.requestFailed"),
          description: error instanceof Error ? error.message : String(error),
        })
      })
  }

  const copyJson = () => {
    void copyText(evidenceJson())
      .then(() => {
        showToast({
          variant: "success",
          icon: "circle-check",
          title: language.t("session.share.copy.copied"),
          description: "Receipt JSON copied to clipboard",
        })
      })
      .catch((error: unknown) => {
        showToast({
          title: language.t("common.requestFailed"),
          description: error instanceof Error ? error.message : String(error),
        })
      })
  }

  return (
    <Dialog
      title="Receipt details"
      size="x-large"
      class="w-[min(calc(100vw-40px),920px)] h-[min(calc(100vh-40px),760px)] min-h-0 overflow-hidden"
    >
      <div class="flex h-full min-h-0 flex-col gap-3 p-1">
        <div class="flex items-center justify-between gap-3 rounded-md border border-border-weak-base bg-surface-panel px-3 py-2">
          <div class="min-w-0">
            <div class="text-13-semibold text-text-base">Receipt Explorer</div>
            <div class="text-11-regular text-text-weak">
              Compatible with the ReceiptOS-PQ verifier flow.
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="rounded border border-border-weak-base px-2 py-1 text-11-regular text-text-weak hover:text-text-base"
              onClick={copyJson}
            >
              Copy JSON
            </button>
            <button
              type="button"
              class="rounded border border-border-weak-base px-2 py-1 text-11-regular text-text-weak hover:text-text-base"
              onClick={() => dialog.close()}
            >
              Close
            </button>
          </div>
        </div>

        <div class="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(320px,360px)]">
          <div class="min-h-0 space-y-3 overflow-auto pr-1">
            <div class="rounded-md border border-border-weak-base bg-background-base p-3">
              <div class="mb-2 text-12-semibold text-text-base">Receipt summary</div>
              <div class="grid grid-cols-2 gap-x-3 gap-y-2 text-11-regular text-text-weak">
                <span>session: {props.evidence.session_id ?? props.summary.sessionID}</span>
                <span>schema: {props.evidence.schema ?? props.summary.schema}</span>
                <span>agent: {props.evidence.agent?.id ?? "unknown"}</span>
                <span>runtime: {props.evidence.agent?.runtime ?? "unknown"}</span>
                <Show when={props.evidence.agent?.model}>
                  <span>model: {props.evidence.agent?.model}</span>
                </Show>
                <span>messages: {props.evidence.metadata?.message_count ?? 0}</span>
                <span>diffs: {props.evidence.metadata?.diff_count ?? 0}</span>
                <span>generator: {props.evidence.metadata?.generated_by ?? "unknown"}</span>
              </div>
            </div>

            <Show when={props.evidence.task?.title || props.evidence.task?.prompt}>
              <div class="rounded-md border border-border-weak-base bg-background-base p-3">
                <div class="mb-2 text-12-semibold text-text-base">Task</div>
                <Show when={props.evidence.task?.title}>
                  <div class="mb-2">
                    <div class="text-11-medium text-text-base">Title</div>
                    <div class="break-words text-11-regular text-text-weak">{props.evidence.task?.title}</div>
                  </div>
                </Show>
                <Show when={props.evidence.task?.prompt}>
                  <div>
                    <div class="text-11-medium text-text-base">Prompt</div>
                    <div class="max-h-32 overflow-auto whitespace-pre-wrap rounded border border-border-weak-base bg-surface-panel p-2 font-mono text-10-regular text-text-weak">
                      {props.evidence.task?.prompt}
                    </div>
                  </div>
                </Show>
              </div>
            </Show>

            <div class="rounded-md border border-border-weak-base bg-background-base p-3">
              <div class="mb-2 text-12-semibold text-text-base">Authority / Scope</div>
              <div class="mb-3 grid grid-cols-2 gap-x-3 gap-y-2 text-11-regular text-text-weak">
                <span>workspace: {props.evidence.directory ?? "unknown"}</span>
                <span>network: unknown</span>
                <span>command count: {commands().length}</span>
                <span>changed files: {changedFiles().length}</span>
              </div>

              <div class="mb-3">
                <div class="mb-1 flex items-center justify-between gap-2">
                  <div class="text-11-medium text-text-base">Scope status</div>
                  <span class="rounded-full border border-border-weak-base px-2 py-0.5 text-10-regular text-text-weak">
                    {scopeStatus()}
                  </span>
                </div>
                <div class="text-10-regular text-text-weak">
                  {scopeStatus() === "within captured scope"
                    ? "Scope data is present in captured evidence."
                    : "Scope evidence is missing or incomplete, so authority boundaries are not fully specified here."}
                </div>
              </div>

              <div class="mb-3">
                <div class="text-11-medium text-text-base">Scoped lease</div>
                <div class="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 rounded border border-border-weak-base bg-surface-panel p-2 text-10-regular text-text-weak">
                  <span>status: {scopedLease()?.status ?? "missing"}</span>
                  <span>mode: {scopedLease()?.mode ?? "unknown"}</span>
                  <span class="col-span-2 truncate">target: {scopedLease()?.target ?? props.evidence.directory ?? "unknown"}</span>
                  <span>allowed actions: {scopedLease()?.allowed_actions?.length ?? 0}</span>
                  <span>expires: {scopedLease()?.expires_at ?? "none"}</span>
                </div>
              </div>

              <div class="mb-3">
                <div class="text-11-medium text-text-base">Captured permissions</div>
                <div class="mt-1 max-h-32 overflow-auto rounded border border-border-weak-base bg-surface-panel p-2">
                  <Show
                    when={permissionJson()}
                    fallback={<div class="text-10-regular text-text-weak">No scope permission captured.</div>}
                  >
                    <pre class="whitespace-pre-wrap break-words font-mono text-10-regular text-text-weak">
                      {permissionJson()}
                    </pre>
                  </Show>
                </div>
              </div>

              <div>
                <div class="text-11-medium text-text-base">Changed files</div>
                <div class="mt-1 max-h-40 overflow-auto rounded border border-border-weak-base bg-surface-panel p-2">
                  <Show
                    when={changedFiles().length}
                    fallback={<div class="text-10-regular text-text-weak">No changed files captured.</div>}
                  >
                    <For each={changedFiles()}>
                      {(file) => <div class="truncate font-mono text-10-regular text-text-weak">{file}</div>}
                    </For>
                  </Show>
                </div>
              </div>
            </div>

            <div class="rounded-md border border-border-weak-base bg-background-base p-3">
              <div class="mb-2 text-12-semibold text-text-base">Changes</div>
              <div class="mb-3">
                <div class="text-11-medium text-text-base">Diff hash</div>
                <div class="mt-1 break-all rounded border border-border-weak-base bg-surface-panel p-2 font-mono text-10-regular text-text-weak">
                  {resolvedDiffHash()}
                </div>
              </div>
              <div>
                <div class="text-11-medium text-text-base">Changed files</div>
                <div class="mt-1 max-h-40 overflow-auto rounded border border-border-weak-base bg-surface-panel p-2">
                  <Show
                    when={changedFiles().length}
                    fallback={<div class="text-10-regular text-text-weak">No changed files captured.</div>}
                  >
                    <For each={changedFiles()}>
                      {(file) => <div class="truncate font-mono text-10-regular text-text-weak">{file}</div>}
                    </For>
                  </Show>
                </div>
              </div>
            </div>

            <div class="rounded-md border border-border-weak-base bg-background-base p-3">
              <div class="mb-2 flex items-center justify-between gap-2">
                <div class="text-12-semibold text-text-base">Receipt Anchor Proof Path</div>
                <button
                  type="button"
                  class="rounded border border-border-weak-base px-2 py-1 text-10-regular text-text-weak hover:text-text-base"
                  onClick={copyAnchorProofJson}
                >
                  Copy proof path
                </button>
              </div>
              <div class="mb-3 text-10-regular text-text-weak">
                Execution receipt &rarr; Merkle proof &rarr; on-chain anchor
              </div>
              <div class="grid grid-cols-2 gap-x-3 gap-y-2 text-11-regular text-text-weak">
                <span>receipt root</span>
                <span class="break-all font-mono">{receiptRoot()}</span>
                <span>Merkle proof</span>
                <span>{merkleProofStatus()}</span>
                <span>on-chain anchor</span>
                <span>{onchainAnchorStatus()}</span>
                <span>network</span>
                <span>{anchorNetwork()}</span>
                <span>contract</span>
                <span class="break-all font-mono">{anchorContract()}</span>
                <span>tx</span>
                <span class="break-all font-mono">{anchorTxHash()}</span>
                <span>verifier</span>
                <span>{anchorVerifierStatus()}</span>
              </div>

              <div class="mt-3">
                <div class="mb-1 text-11-medium text-text-base">Copy payload preview</div>
                <pre class="max-h-40 overflow-auto rounded border border-border-weak-base bg-surface-panel p-2 font-mono text-10-regular text-text-weak">
                  {anchorProofJson()}
                </pre>
              </div>
            </div>
            <div class="rounded-md border border-border-weak-base bg-background-base p-3">
              <div class="mb-2 text-12-semibold text-text-base">Command summary</div>
              <div class="max-h-56 space-y-2 overflow-auto rounded border border-border-weak-base bg-surface-panel p-2">
                <Show
                  when={commands().length}
                  fallback={<div class="text-10-regular text-text-weak">No command evidence captured.</div>}
                >
                  <For each={commands()}>
                    {(command, index) => (
                      <div class="space-y-1 text-10-regular text-text-weak">
                        <div class="font-mono break-all text-text-base">{index() + 1}. {command.command}</div>
                        <div>exit: {typeof command.exit_code === "number" ? command.exit_code : "n/a"}</div>
                        <Show when={command.stdout_summary}>
                          <div class="whitespace-pre-wrap break-words">{command.stdout_summary}</div>
                        </Show>
                      </div>
                    )}
                  </For>
                </Show>
              </div>
            </div>
          </div>

          <div class="min-h-0 overflow-hidden rounded-md border border-border-weak-base bg-background-base p-3">
            <div class="mb-2 flex items-center justify-between gap-2">
              <div class="text-12-semibold text-text-base">Full evidence JSON</div>
              <span class="rounded-full border border-border-weak-base px-2 py-0.5 text-10-regular text-text-weak">
                ReceiptOS-PQ-ready
              </span>
            </div>
            <pre class="h-full max-h-full overflow-auto rounded border border-border-weak-base bg-surface-panel p-2 text-10-regular text-text-weak">
              {evidenceJson()}
            </pre>
          </div>
        </div>
      </div>
    </Dialog>
  )
}
