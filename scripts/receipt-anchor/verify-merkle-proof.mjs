import { readFile } from 'node:fs/promises'
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

async function main() {
  const receiptPath = process.argv[2] ?? 'examples/receipt-anchor/sample-receipt.json'
  const proofPath = process.argv[3] ?? 'examples/receipt-anchor/session-merkle-root.json'

  const receipt = JSON.parse(await readFile(receiptPath, 'utf8'))
  const proofDoc = JSON.parse(await readFile(proofPath, 'utf8'))

  const canonicalReceipt = canonicalize(receipt)
  const receiptHash = `0x${sha256Hex(canonicalReceipt)}`
  const proof = proofDoc.proof
  let current = receiptHash.slice(2)

  for (const sibling of proof.siblings) {
    const siblingHex = sibling.hash.slice(2)
    current = sibling.position === 'left' ? hashPair(siblingHex, current) : hashPair(current, siblingHex)
  }

  const sessionRoot = `0x${current}`
  const valid = receiptHash.toLowerCase() === proof.leaf.receiptHash.toLowerCase() && sessionRoot.toLowerCase() === proofDoc.sessionRoot.toLowerCase()

  const result = {
    valid,
    receipt: path.normalize(receiptPath),
    proofFile: path.normalize(proofPath),
    receiptHash,
    expectedLeaf: proof.leaf.receiptHash,
    computedSessionRoot: sessionRoot,
    expectedSessionRoot: proofDoc.sessionRoot,
  }

  console.log(JSON.stringify(result, null, 2))
  if (!valid) process.exit(1)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
