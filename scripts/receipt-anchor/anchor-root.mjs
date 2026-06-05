import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { Contract, JsonRpcProvider, Wallet } from 'ethers'

const ARTIFACT_PATH = path.resolve('examples/receipt-anchor/ReceiptAnchor.artifact.json')

async function main() {
  const rpcUrl = process.env.SEPOLIA_RPC_URL
  const privateKey = process.env.SEPOLIA_PRIVATE_KEY

  if (!rpcUrl || !privateKey) {
    console.error('Missing SEPOLIA_RPC_URL or SEPOLIA_PRIVATE_KEY')
    process.exit(1)
  }

  const contractAddress = process.argv[2]
  const receiptRoot = process.argv[3]
  const metadataURI = process.argv[4]

  if (!contractAddress || !receiptRoot || !metadataURI) {
    console.error('Usage: node scripts/receipt-anchor/anchor-root.mjs <contractAddress> <receiptRoot> <metadataURI>')
    process.exit(1)
  }

  const artifact = JSON.parse(await readFile(ARTIFACT_PATH, 'utf8'))
  if (!artifact?.abi) {
    console.error('Missing compiled artifact. Run node scripts/receipt-anchor/compile-anchor.mjs first.')
    process.exit(1)
  }

  const provider = new JsonRpcProvider(rpcUrl)
  const network = await provider.getNetwork()
  if (network.chainId !== 11155111n) {
    console.error(`Refusing to anchor: expected Sepolia (11155111), got ${network.chainId}`)
    process.exit(1)
  }

  const wallet = new Wallet(privateKey, provider)
  const contract = new Contract(contractAddress, artifact.abi, wallet)
  const tx = await contract.anchorReceipt(receiptRoot, metadataURI)
  const receipt = await tx.wait()
  const anchoredEvent = receipt?.logs
    ?.map((log) => {
      try {
        return contract.interface.parseLog(log)
      } catch {
        return null
      }
    })
    .find((parsed) => parsed?.name === 'ReceiptAnchored')

  console.log(
    JSON.stringify(
      {
        network: 'sepolia',
        chainId: network.chainId.toString(),
        contractAddress,
        txHash: tx.hash,
        receiptRoot,
        metadataURI,
        event: anchoredEvent
          ? {
              name: anchoredEvent.name,
              receiptRoot: anchoredEvent.args.receiptRoot,
              metadataURI: anchoredEvent.args.metadataURI,
              publisher: anchoredEvent.args.publisher,
            }
          : null,
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
