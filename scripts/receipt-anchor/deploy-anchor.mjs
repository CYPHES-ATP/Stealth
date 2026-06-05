import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { ContractFactory, JsonRpcProvider, Wallet } from 'ethers'

const ARTIFACT_PATH = path.resolve('examples/receipt-anchor/ReceiptAnchor.artifact.json')

async function main() {
  const rpcUrl = process.env.SEPOLIA_RPC_URL
  const privateKey = process.env.SEPOLIA_PRIVATE_KEY

  if (!rpcUrl || !privateKey) {
    console.error('Missing SEPOLIA_RPC_URL or SEPOLIA_PRIVATE_KEY')
    process.exit(1)
  }

  const artifact = JSON.parse(await readFile(ARTIFACT_PATH, 'utf8'))
  if (!artifact?.abi || !artifact?.bytecode) {
    console.error('Missing compiled artifact. Run node scripts/receipt-anchor/compile-anchor.mjs first.')
    process.exit(1)
  }

  const provider = new JsonRpcProvider(rpcUrl)
  const network = await provider.getNetwork()
  if (network.chainId !== 11155111n) {
    console.error(`Refusing to deploy: expected Sepolia (11155111), got ${network.chainId}`)
    process.exit(1)
  }

  const wallet = new Wallet(privateKey, provider)
  const factory = new ContractFactory(artifact.abi, artifact.bytecode, wallet)
  const contract = await factory.deploy()
  await contract.waitForDeployment()
  const deployTx = contract.deploymentTransaction()

  console.log(
    JSON.stringify(
      {
        network: 'sepolia',
        chainId: network.chainId.toString(),
        contractAddress: await contract.getAddress(),
        deployTxHash: deployTx?.hash ?? null,
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
