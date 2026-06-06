import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import path from 'node:path'

function canonicalize(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map((item) => canonicalize(item)).join(',')}]`
  const keys = Object.keys(value).sort()
  return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`).join(',')}}`
}

function sha256Hex(text) {
  return createHash('sha256').update(text, 'utf8').digest('hex')
}

function hashPair(leftHex, rightHex) {
  return sha256Hex(Buffer.from(leftHex + rightHex, 'hex'))
}

function buildMerkleLevels(leaves) {
  const levels = [leaves]
  let current = leaves
  while (current.length > 1) {
    const next = []
    for (let i = 0; i < current.length; i += 2) {
      const left = current[i]
      const right = current[i + 1] ?? current[i]
      next.push(hashPair(left, right))
    }
    levels.push(next)
    current = next
  }
  return levels
}

function buildProof(levels, index) {
  const proof = []
  let currentIndex = index
  for (let levelIndex = 0; levelIndex < levels.length - 1; levelIndex++) {
    const level = levels[levelIndex]
    const siblingIndex = currentIndex % 2 === 0 ? currentIndex + 1 : currentIndex - 1
    const sibling = level[siblingIndex] ?? level[currentIndex]
    proof.push({
      position: currentIndex % 2 === 0 ? 'right' : 'left',
      hash: `0x${sibling}`,
    })
    currentIndex = Math.floor(currentIndex / 2)
  }
  return proof
}

async function main() {
  const manifestPath = process.argv[2] ?? 'examples/receipt-anchor/session-manifest.json'
  const outPath = process.argv[3] ?? 'examples/receipt-anchor/session-merkle-root.json'
  const raw = await readFile(manifestPath, 'utf8')
  const manifest = JSON.parse(raw)
  const receiptFiles = manifest.receipts
  if (!Array.isArray(receiptFiles) || receiptFiles.length === 0) {
    console.error('Manifest must contain a non-empty receipts array')
    process.exit(1)
  }

  const leafRecords = []
  for (const receiptFile of receiptFiles) {
    const receiptRaw = await readFile(path.resolve(receiptFile), 'utf8')
    const receipt = JSON.parse(receiptRaw)
    const canonical = canonicalize(receipt)
    const receiptHash = sha256Hex(canonical)
    leafRecords.push({
      source: path.normalize(receiptFile),
      receiptHash: `0x${receiptHash}`,
    })
  }

  const leafHashes = leafRecords.map((item) => item.receiptHash.slice(2))
  const levels = buildMerkleLevels(leafHashes)
  const sessionRoot = `0x${levels[levels.length - 1][0]}`
  const proofIndex = typeof manifest.proofIndex === 'number' ? manifest.proofIndex : 0

  const output = {
    schema: 'stealth.receipt.merkle.root.v0',
    manifest: path.normalize(manifestPath),
    leafCount: leafRecords.length,
    leaves: leafRecords,
    sessionRoot,
    proof: {
      index: proofIndex,
      leaf: leafRecords[proofIndex],
      siblings: buildProof(levels, proofIndex),
    },
    notes: {
      computed_offchain: true,
      onchain_model: 'sessionRoot/workflowRoot only',
      verification_model: 'recompute receiptHash, verify Merkle proof, compare with anchored sessionRoot',
    },
  }

  await mkdir(path.dirname(outPath), { recursive: true })
  await writeFile(outPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8')
  console.log(JSON.stringify(output, null, 2))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
