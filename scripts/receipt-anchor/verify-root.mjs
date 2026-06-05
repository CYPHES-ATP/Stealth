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
  const receiptPath = process.argv[2]
  const rootPath = process.argv[3]

  if (!receiptPath || !rootPath) {
    console.error('Usage: node script/receipt-anchor/verify-root.mjs <receipt-json-path> <root-json-path>')
    process.exit(1)
  }

  const receipt = JSON.parse(await readFile(receiptPath, 'utf8'))
  const expected = JSON.parse(await readFile(rootPath, 'utf8'))
  const canonicalReceipt = canonicalize(receipt)
  const actualRoot = `0x${sha256Hex(canonicalReceipt)}`
  const expectedRoot = typeof expected.receiptRoot === 'string' ? expected.receiptRoot.toLowerCase() : ''
  const valid = actualRoot.toLowerCase() === expectedRoot

  console.log(
    JSON.stringify(
      {
        valid,
        actualRoot,
        expectedRoot,
        receipt: path.normalize(receiptPath),
        rootFile: path.normalize(rootPath),
      },
      null,
      2,
    ),
  )

  if (!valid) {
    process.exit(1)
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
