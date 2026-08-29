import hardhatNodeTestRunner from '@nomicfoundation/hardhat-node-test-runner'
import hardhatViem from '@nomicfoundation/hardhat-viem'
import { configVariable, defineConfig } from 'hardhat/config'

export default defineConfig({
  plugins: [hardhatViem, hardhatNodeTestRunner],
  solidity: {
    profiles: {
      default: { version: '0.8.24' },
      production: {
        version: '0.8.24',
        settings: { optimizer: { enabled: true, runs: 200 } },
      },
    },
  },
  networks: {
    hardhatMainnet: { type: 'edr-simulated', chainType: 'l1', chainId: 31337 },
    qieTestnet: {
      type: 'http',
      chainType: 'l1',
      chainId: 1983,
      url: 'https://rpc1testnet.qie.digital/',
      accounts: [configVariable('QIE_DEPLOYER_PRIVATE_KEY')],
    },
    qieMainnet: {
      type: 'http',
      chainType: 'l1',
      chainId: 1990,
      url: 'https://rpc1mainnet.qie.digital/',
      accounts: [configVariable('QIE_DEPLOYER_PRIVATE_KEY')],
    },
  },
})
