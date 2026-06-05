import { readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import solc from 'solc'

const CONTRACT_PATH = path.resolve('contracts/ReceiptAnchor.sol')
const OUTPUT_PATH = path.resolve('examples/receipt-anchor/ReceiptAnchor.artifact.json')

async function main() {
  const source = await readFile(CONTRACT_PATH, 'utf8')
  const input = {
    language: 'Solidity',
    sources: {
      'ReceiptAnchor.sol': {
        content: source,
      },
    },
    settings: {
      outputSelection: {
        '*': {
          '*': ['abi', 'evm.bytecode.object'],
        },
      },
    },
  }

  const output = JSON.parse(solc.compile(JSON.stringify(input)))
  if (output.errors) {
    const fatal = output.errors.filter((entry) => entry.severity === 'error')
    if (fatal.length > 0) {
      for (const entry of fatal) {
        console.error(entry.formattedMessage)
      }
      process.exit(1)
    }
  }

  const contract = output.contracts?.['ReceiptAnchor.sol']?.ReceiptAnchor
  if (!contract?.abi || !contract?.evm?.bytecode?.object) {
    console.error('Failed to compile ReceiptAnchor.sol')
    process.exit(1)
  }

  const artifact = {
    contractName: 'ReceiptAnchor',
    sourceName: 'contracts/ReceiptAnchor.sol',
    abi: contract.abi,
    bytecode: `0x${contract.evm.bytecode.object}`,
  }

  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true })
  await writeFile(OUTPUT_PATH, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8')

  console.log(
    JSON.stringify(
      {
        ok: true,
        artifact: path.normalize(OUTPUT_PATH),
        abiItems: artifact.abi.length,
        bytecodeBytes: (artifact.bytecode.length - 2) / 2,
      },
      null,
      2,
    ),
  )
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
