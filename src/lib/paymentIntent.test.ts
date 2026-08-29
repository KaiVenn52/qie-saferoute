import { parseUnits, zeroAddress } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { describe, expect, it } from 'vitest'
import { evmToQie } from './address'
import { QIE_TESTNET_CHAIN_ID } from './networks'
import {
  decodePaymentIntent,
  encodePaymentIntent,
  hashPaymentIntent,
  paymentIntentDomain,
  paymentIntentMessage,
  paymentIntentTypes,
  type PaymentIntentProof,
  verifyPaymentIntent,
} from './paymentIntent'

const recipient = privateKeyToAccount('0x0000000000000000000000000000000000000000000000000000000000000001')
const merchant = privateKeyToAccount('0x0000000000000000000000000000000000000000000000000000000000000002')

async function makeIntent(): Promise<PaymentIntentProof> {
  const issuedAt = Math.floor(Date.now() / 1000)
  const unsigned = {
    recipientEvm: recipient.address,
    recipientQie: evmToQie(recipient.address),
    asset: zeroAddress,
    assetSymbol: 'QIE',
    amount: parseUnits('12.5', 18).toString(),
    decimals: 18,
    reference: 'ORDER-2048',
    audience: merchant.address,
    destinationType: 'merchant_checkout' as const,
    purpose: 'Coffee equipment order',
    issuedAt,
    expiresAt: issuedAt + 900,
    nonce: `0x${'ab'.repeat(32)}` as `0x${string}`,
  }
  const signature = await recipient.signTypedData({
    domain: paymentIntentDomain(QIE_TESTNET_CHAIN_ID),
    types: paymentIntentTypes,
    primaryType: 'PaymentIntent',
    message: paymentIntentMessage(unsigned),
  })
  return { version: 2, chainId: QIE_TESTNET_CHAIN_ID, ...unsigned, signature }
}

describe('QIE payment intent', () => {
  it('verifies a context-bound recipient signature', async () => {
    expect(await verifyPaymentIntent(await makeIntent(), {
      expectedAudience: merchant.address,
      expectedReference: 'ORDER-2048',
    })).toEqual({ valid: true })
  })

  it('rejects replay into another merchant or order', async () => {
    const intent = await makeIntent()
    const anotherMerchant = privateKeyToAccount('0x0000000000000000000000000000000000000000000000000000000000000003')
    expect((await verifyPaymentIntent(intent, { expectedAudience: anotherMerchant.address })).valid).toBe(false)
    expect((await verifyPaymentIntent(intent, { expectedReference: 'ORDER-9999' })).valid).toBe(false)
  })

  it('rejects edits to amount, asset, purpose, and route', async () => {
    const intent = await makeIntent()
    const edits: PaymentIntentProof[] = [
      { ...intent, amount: parseUnits('13', 18).toString() },
      { ...intent, assetSymbol: 'QUSDC' },
      { ...intent, purpose: 'Different order' },
      { ...intent, recipientQie: evmToQie(merchant.address) },
    ]
    for (const edited of edits) expect((await verifyPaymentIntent(edited)).valid).toBe(false)
  })

  it('rejects expired, oversized-lifetime, and malformed intents', async () => {
    const intent = await makeIntent()
    expect((await verifyPaymentIntent({ ...intent, expiresAt: 1 })).valid).toBe(false)
    expect((await verifyPaymentIntent({ ...intent, expiresAt: intent.issuedAt + 8 * 24 * 60 * 60 })).valid).toBe(false)
    expect((await verifyPaymentIntent({ ...intent, amount: '0' })).valid).toBe(false)
    expect((await verifyPaymentIntent({ ...intent, nonce: '0x12' })).valid).toBe(false)
  })

  it('round-trips a portable URL-safe payload', async () => {
    const intent = await makeIntent()
    expect(decodePaymentIntent(encodePaymentIntent(intent))).toEqual(intent)
  })

  it('round-trips Unicode references and purposes', async () => {
    const intent = { ...await makeIntent(), reference: '订单-2048', purpose: '咖啡设备订单' }
    const signature = await recipient.signTypedData({
      domain: paymentIntentDomain(intent.chainId),
      types: paymentIntentTypes,
      primaryType: 'PaymentIntent',
      message: paymentIntentMessage(intent),
    })
    const signed = { ...intent, signature }
    expect(decodePaymentIntent(encodePaymentIntent(signed))).toEqual(signed)
    expect((await verifyPaymentIntent(signed)).valid).toBe(true)
  })

  it('creates the canonical EIP-712 registry digest', async () => {
    const intent = await makeIntent()
    expect(hashPaymentIntent(intent)).toMatch(/^0x[0-9a-f]{64}$/)
    expect(hashPaymentIntent({ ...intent, amount: parseUnits('13', 18).toString() }))
      .not.toBe(hashPaymentIntent(intent))
  })
})
