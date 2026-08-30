/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_QIE_TESTNET_REGISTRY_ADDRESS?: string
  readonly VITE_QIE_MAINNET_REGISTRY_ADDRESS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface Window {
  ethereum?: {
    request(args: { method: string; params?: unknown[] | object }): Promise<unknown>
  }
}
