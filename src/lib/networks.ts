export const QIE_MAINNET_CHAIN_ID = 1990
export const QIE_TESTNET_CHAIN_ID = 1983

export type QieChainId = typeof QIE_MAINNET_CHAIN_ID | typeof QIE_TESTNET_CHAIN_ID

export const QIE_NETWORKS = {
  [QIE_MAINNET_CHAIN_ID]: {
    id: QIE_MAINNET_CHAIN_ID,
    name: 'QIE Mainnet',
    nativeCurrency: { name: 'QIEV3', symbol: 'QIEV3', decimals: 18 },
    rpcUrl: 'https://rpc1mainnet.qie.digital/',
    explorerUrl: 'https://mainnet.qie.digital/',
  },
  [QIE_TESTNET_CHAIN_ID]: {
    id: QIE_TESTNET_CHAIN_ID,
    name: 'QIE Testnet',
    nativeCurrency: { name: 'QIE', symbol: 'QIE', decimals: 18 },
    rpcUrl: 'https://rpc1testnet.qie.digital/',
    explorerUrl: 'https://testnet.qie.digital/',
  },
} as const

export function isQieChainId(value: number): value is QieChainId {
  return value === QIE_MAINNET_CHAIN_ID || value === QIE_TESTNET_CHAIN_ID
}
