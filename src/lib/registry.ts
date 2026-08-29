import { hashPaymentIntent, type UnsignedPaymentIntent } from './paymentIntent.js'
import type { QieChainId } from './networks.js'

export const paymentIntentRegistryAbi = [
  {
    type: 'function',
    name: 'anchor',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'intentHash', type: 'bytes32' },
      { name: 'expiresAt', type: 'uint64' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'revoke',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'intentHash', type: 'bytes32' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'isActive',
    stateMutability: 'view',
    inputs: [
      { name: 'signer', type: 'address' },
      { name: 'intentHash', type: 'bytes32' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const

export function paymentIntentRegistryKey(
  intent: UnsignedPaymentIntent & { chainId: QieChainId },
): `0x${string}` {
  return hashPaymentIntent(intent)
}

export function paymentIntentAnchorArguments(
  intent: UnsignedPaymentIntent & { chainId: QieChainId },
) {
  return [paymentIntentRegistryKey(intent), BigInt(intent.expiresAt)] as const
}
