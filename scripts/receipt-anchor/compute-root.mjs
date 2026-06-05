import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import path from 'node:path'

function canonicalize(value) {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value)
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalize(item)).join(',')}]`
  }

  const keys = Object.keys(value).sort()
  return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`).join(',')}}`
}

function sha256Hex(text) {
  return createHash('sha256').update(text, 'utf8').digest('hex')
}

async function main() {
  const input = process.argv[2]
  if (!input) {
    console.error('Usage: node script/receipt-anchor/compute-root.mjs <receipt-json-path>')
    process.exit(1)
  }

  const raw = await readFile(input, 'utf8')
  const receipt = JSON.parse(raw)
  const canonicalReceipt = canonicalize(receipt)
  const receiptRoot = `0x${sha256Hex(canonicalReceipt)}`

  const result = {
    receiptRoot,
    algorithm: 'sha256',
    source: path.normalize(input),
    canonicalization: 'JSON with recursively sorted object keys, compact separators, array order preserved',
  }

  console.log(JSON.stringify(result, null, 2))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
