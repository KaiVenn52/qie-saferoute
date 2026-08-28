import { verifyTypedData } from 'viem'
import { evmToQie } from './address.js'
import { QIE_TESTNET_CHAIN_ID } from './networks.js'

export { QIE_TESTNET_CHAIN_ID } from './networks'
const MAX_PROOF_BYTES = 16_384
const MAX_PROOF_LIFETIME_SECONDS = 7 * 24 * 60 * 60

export type RouteProof = {
  version: 1
  chainId: typeof QIE_TESTNET_CHAIN_ID
  evmAddress: `0x${string}`
  qieAddress: string
  issuedAt: number
  expiresAt: number
  nonce: `0x${string}`
  signature: `0x${string}`
}

export const proofDomain = {
  name: 'QIE SafeRoute',
  version: '1',
  chainId: QIE_TESTNET_CHAIN_ID,
} as const

export const proofTypes = {
  RouteProof: [
    { name: 'evmAddress', type: 'address' },
    { name: 'qieAddress', type: 'string' },
    { name: 'issuedAt', type: 'uint64' },
    { name: 'expiresAt', type: 'uint64' },
    { name: 'nonce', type: 'bytes32' },
  ],
} as const

export function proofMessage(proof: Omit<RouteProof, 'version' | 'chainId' | 'signature'>) {
  return {
    evmAddress: proof.evmAddress,
    qieAddress: proof.qieAddress,
    issuedAt: BigInt(proof.issuedAt),
    expiresAt: BigInt(proof.expiresAt),
    nonce: proof.nonce,
  }
}

export async function verifyRouteProof(proof: RouteProof): Promise<boolean> {
  try {
    const now = Math.floor(Date.now() / 1000)
    if (proof.version !== 1 || proof.chainId !== QIE_TESTNET_CHAIN_ID) return false
    if (!Number.isSafeInteger(proof.issuedAt) || !Number.isSafeInteger(proof.expiresAt)) return false
    if (proof.issuedAt > now + 300 || proof.expiresAt <= now) return false
    if (proof.expiresAt - proof.issuedAt > MAX_PROOF_LIFETIME_SECONDS) return false
    if (!/^0x[0-9a-fA-F]{64}$/.test(proof.nonce)) return false
    if (!/^0x[0-9a-fA-F]{130}$/.test(proof.signature)) return false
    if (evmToQie(proof.evmAddress) !== proof.qieAddress) return false

    return verifyTypedData({
      address: proof.evmAddress,
      domain: proofDomain,
      types: proofTypes,
      primaryType: 'RouteProof',
      message: proofMessage(proof),
      signature: proof.signature,
    })
  } catch {
    return false
  }
}

export function encodeProof(proof: RouteProof): string {
  return btoa(JSON.stringify(proof))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '')
}

export function decodeProof(value: string): RouteProof {
  if (value.length > MAX_PROOF_BYTES) throw new Error('Proof payload is too large.')
  const normalized = value.trim().replaceAll('-', '+').replaceAll('_', '/')
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
  return JSON.parse(atob(padded)) as RouteProof
}
