import { readFile } from 'node:fs/promises'
import { network } from 'hardhat'
import { formatEther, getAddress, isAddress, type Address, type Hex } from 'viem'

type RegistryArtifact = {
  abi: readonly unknown[]
  bytecode: Hex
}

const NETWORKS = {
  1983: { name: 'QIE Testnet', explorer: 'https://testnet.qie.digital' },
  1990: { name: 'QIE Mainnet', explorer: 'https://mainnet.qie.digital' },
  31337: { name: 'Hardhat local', explorer: '' },
} as const

async function main() {
  const { viem } = await network.create()
  const publicClient = await viem.getPublicClient()
  const [walletDeployer] = await viem.getWalletClients()
  const publicDeployer = process.env.QIE_DEPLOYER_ADDRESS
  let deployerAddress: Address | undefined = walletDeployer?.account.address
  if (!deployerAddress && publicDeployer) {
    if (!isAddress(publicDeployer)) throw new Error('QIE_DEPLOYER_ADDRESS is not a valid EVM address.')
    deployerAddress = getAddress(publicDeployer)
  }
  if (!deployerAddress) {
    throw new Error('Set QIE_DEPLOYER_ADDRESS for a read-only estimate, or configure QIE_DEPLOYER_PRIVATE_KEY for an approved broadcast.')
  }

  const chainId = await publicClient.getChainId()
  const metadata = NETWORKS[chainId as keyof typeof NETWORKS]
  if (!metadata) throw new Error(`Unsupported deployment chain ${chainId}.`)

  const artifactUrl = new URL(
    '../artifacts/contracts/PaymentIntentRegistry.sol/PaymentIntentRegistry.json',
    import.meta.url,
  )
  const artifact = JSON.parse(await readFile(artifactUrl, 'utf8')) as RegistryArtifact
  const [balance, gasPrice, estimatedGas] = await Promise.all([
    publicClient.getBalance({ address: deployerAddress }),
    publicClient.getGasPrice(),
    publicClient.estimateGas({ account: deployerAddress, data: artifact.bytecode }),
  ])
  const estimatedFee = estimatedGas * gasPrice

  console.log(`Network: ${metadata.name} (${chainId})`)
  console.log(`Deployer: ${deployerAddress}`)
  console.log(`Balance: ${formatEther(balance)} native QIE`)
  console.log(`Estimated gas: ${estimatedGas}`)
  console.log(`Gas price: ${gasPrice} wei`)
  console.log(`Estimated deployment fee: ${formatEther(estimatedFee)} native QIE`)

  if (process.env.QIE_BROADCAST !== 'yes') {
    console.log('Dry run only. No transaction was broadcast.')
    return
  }
  if (!walletDeployer) {
    throw new Error('Broadcast requested, but QIE_DEPLOYER_PRIVATE_KEY is not configured.')
  }
  if (chainId === 1990 && process.env.QIE_MAINNET_CONFIRM !== 'QIE_MAINNET_1990') {
    throw new Error('Mainnet broadcast requires QIE_MAINNET_CONFIRM=QIE_MAINNET_1990.')
  }
  if (balance < estimatedFee * 2n) {
    throw new Error('Deployer balance is below the 2x deployment-fee safety buffer.')
  }

  const { contract, deploymentTransaction } = await viem.sendDeploymentTransaction(
    'PaymentIntentRegistry',
  )
  const receipt = await publicClient.waitForTransactionReceipt({
    hash: deploymentTransaction.hash,
    confirmations: 1,
  })
  if (receipt.status !== 'success') throw new Error('Deployment transaction reverted.')

  console.log(`Contract: ${contract.address}`)
  console.log(`Transaction: ${deploymentTransaction.hash}`)
  if (metadata.explorer) {
    console.log(`Explorer: ${metadata.explorer}/address/${contract.address}`)
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
