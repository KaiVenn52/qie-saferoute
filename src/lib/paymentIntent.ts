import { getAddress, isAddress, verifyTypedData, zeroAddress } from 'viem'
import { evmToQie } from './address.js'
import { isQieChainId, type QieChainId } from './networks.js'

const MAX_PAYLOAD_BYTES = 24_576
const MAX_INTENT_LIFETIME_SECONDS = 7 * 24 * 60 * 60
const MAX_CLOCK_SKEW_SECONDS = 5 * 60
const MAX_REFERENCE_LENGTH = 96
const MAX_PURPOSE_LENGTH = 160

export const NATIVE_ASSET_ADDRESS = zeroAddress

export const paymentIntentTypes = {
  PaymentIntent: [
    { name: 'recipientEvm', type: 'address' },
    { name: 'recipientQie', type: 'string' },
    { name: 'asset', type: 'address' },
    { name: 'assetSymbol', type: 'string' },
    { name: 'amount', type: 'uint256' },
    { name: 'decimals', type: 'uint8' },
    { name: 'reference', type: 'string' },
    { name: 'audience', type: 'address' },
    { name: 'destinationType', type: 'string' },
    { name: 'purpose', type: 'string' },
    { name: 'issuedAt', type: 'uint64' },
    { name: 'expiresAt', type: 'uint64' },
    { name: 'nonce', type: 'bytes32' },
  ],
} as const

export const destinationTypes = ['merchant_checkout', 'wallet_send', 'exchange_deposit', 'bridge'] as const
export type DestinationType = (typeof destinationTypes)[number]

export type UnsignedPaymentIntent = {
  recipientEvm: `0x${string}`
  recipientQie: string
  asset: `0x${string}`
  assetSymbol: string
  amount: string
  decimals: number
  reference: string
  audience: `0x${string}`
  destinationType: DestinationType
  purpose: string
  issuedAt: number
  expiresAt: number
  nonce: `0x${string}`
}

export type PaymentIntentProof = UnsignedPaymentIntent & {
  version: 2
  chainId: QieChainId
  signature: `0x${string}`
}

export type PaymentIntentValidation = {
  valid: boolean
  reason?: string
}

export function paymentIntentDomain(chainId: QieChainId) {
  return { name: 'QIE SafeRoute', version: '2', chainId } as const
}

export function paymentIntentMessage(intent: UnsignedPaymentIntent) {
  return {
    ...intent,
    amount: BigInt(intent.amount),
    issuedAt: BigInt(intent.issuedAt),
    expiresAt: BigInt(intent.expiresAt),
  }
}

function validateShape(intent: PaymentIntentProof, now: number): PaymentIntentValidation {
  if (intent.version !== 2) return { valid: false, reason: 'Unsupported proof version.' }
  if (!isQieChainId(intent.chainId)) return { valid: false, reason: 'Unsupported QIE network.' }
  if (!isAddress(intent.recipientEvm)) return { valid: false, reason: 'Recipient EVM address is invalid.' }
  if (evmToQie(intent.recipientEvm) !== intent.recipientQie) {
    return { valid: false, reason: 'The EVM and qie1 recipient addresses do not match.' }
  }
  if (!isAddress(intent.asset) || !isAddress(intent.audience)) {
    return { valid: false, reason: 'Asset or audience address is invalid.' }
  }
  if (!/^\d+$/.test(intent.amount) || BigInt(intent.amount) <= 0n) {
    return { valid: false, reason: 'Amount must be a positive integer in base units.' }
  }
  if (!Number.isSafeInteger(intent.decimals) || intent.decimals < 0 || intent.decimals > 36) {
    return { valid: false, reason: 'Asset decimals are invalid.' }
  }
  if (!/^[A-Z0-9._-]{1,16}$/.test(intent.assetSymbol)) {
    return { valid: false, reason: 'Asset symbol is invalid.' }
  }
  if (!intent.reference.trim() || intent.reference.length > MAX_REFERENCE_LENGTH) {
    return { valid: false, reason: 'Payment reference is missing or too long.' }
  }
  if (!intent.purpose.trim() || intent.purpose.length > MAX_PURPOSE_LENGTH) {
    return { valid: false, reason: 'Payment purpose is missing or too long.' }
  }
  if (!destinationTypes.includes(intent.destinationType)) {
    return { valid: false, reason: 'Destination type is unsupported.' }
  }
  if (!Number.isSafeInteger(intent.issuedAt) || !Number.isSafeInteger(intent.expiresAt)) {
    return { valid: false, reason: 'Intent timestamps are invalid.' }
  }
  if (intent.issuedAt > now + MAX_CLOCK_SKEW_SECONDS) {
    return { valid: false, reason: 'Intent was issued too far in the future.' }
  }
  if (intent.expiresAt <= now) return { valid: false, reason: 'Payment intent has expired.' }
  if (intent.expiresAt <= intent.issuedAt || intent.expiresAt - intent.issuedAt > MAX_INTENT_LIFETIME_SECONDS) {
    return { valid: false, reason: 'Payment intent lifetime is invalid.' }
  }
  if (!/^0x[0-9a-fA-F]{64}$/.test(intent.nonce)) return { valid: false, reason: 'Nonce is invalid.' }
  if (!/^0x[0-9a-fA-F]{130}$/.test(intent.signature)) return { valid: false, reason: 'Signature is invalid.' }
  return { valid: true }
}

export async function verifyPaymentIntent(
  intent: PaymentIntentProof,
  options: { now?: number; expectedAudience?: `0x${string}`; expectedReference?: string } = {},
): Promise<PaymentIntentValidation> {
  try {
    const shape = validateShape(intent, options.now ?? Math.floor(Date.now() / 1000))
    if (!shape.valid) return shape
    if (options.expectedAudience && getAddress(intent.audience) !== getAddress(options.expectedAudience)) {
      return { valid: false, reason: 'Payment intent was created for a different verifier.' }
    }
    if (options.expectedReference && intent.reference !== options.expectedReference) {
      return { valid: false, reason: 'Payment reference does not match.' }
    }
    const valid = await verifyTypedData({
      address: getAddress(intent.recipientEvm),
      domain: paymentIntentDomain(intent.chainId),
      types: paymentIntentTypes,
      primaryType: 'PaymentIntent',
      message: paymentIntentMessage(intent),
      signature: intent.signature,
    })
    return valid ? { valid: true } : { valid: false, reason: 'Signature does not match the recipient.' }
  } catch {
    return { valid: false, reason: 'Payment intent is malformed.' }
  }
}

export function encodePaymentIntent(intent: PaymentIntentProof): string {
  return btoa(JSON.stringify(intent)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}

export function decodePaymentIntent(value: string): PaymentIntentProof {
  if (value.length > MAX_PAYLOAD_BYTES) throw new Error('Payment intent payload is too large.')
  const normalized = value.trim().replaceAll('-', '+').replaceAll('_', '/')
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
  return JSON.parse(atob(padded)) as PaymentIntentProof
}

export function randomNonce(): `0x${string}` {
  return `0x${Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) => byte.toString(16).padStart(2, '0')).join('')}`
}
