import { privateKeyToAccount } from 'viem/accounts'
import { describe, expect, it } from 'vitest'
import { evmToQie } from './address'
import {
  decodeProof,
  encodeProof,
  proofDomain,
  proofMessage,
  proofTypes,
  QIE_TESTNET_CHAIN_ID,
  type RouteProof,
  verifyRouteProof,
} from './proof'

const account = privateKeyToAccount('0x0000000000000000000000000000000000000000000000000000000000000001')

async function makeProof(): Promise<RouteProof> {
  const now = Math.floor(Date.now() / 1000)
  const unsigned = {
    evmAddress: account.address,
    qieAddress: evmToQie(account.address),
    issuedAt: now,
    expiresAt: now + 3600,
    nonce: `0x${'ab'.repeat(32)}` as `0x${string}`,
  }
  const signature = await account.signTypedData({
    domain: proofDomain,
    types: proofTypes,
    primaryType: 'RouteProof',
    message: proofMessage(unsigned),
  })
  return { version: 1, chainId: QIE_TESTNET_CHAIN_ID, ...unsigned, signature }
}

describe('SafeRoute proof', () => {
  it('verifies a proof signed by its EVM account', async () => {
    expect(await verifyRouteProof(await makeProof())).toBe(true)
  })

  it('rejects an expired proof', async () => {
    const proof = await makeProof()
    expect(await verifyRouteProof({ ...proof, expiresAt: 1 })).toBe(false)
  })

  it('rejects a signed proof whose QIE representation does not match', async () => {
    const proof = await makeProof()
    const otherAccount = privateKeyToAccount('0x0000000000000000000000000000000000000000000000000000000000000002')
    const mismatched = { ...proof, qieAddress: evmToQie(otherAccount.address) }
    mismatched.signature = await account.signTypedData({
      domain: proofDomain,
      types: proofTypes,
      primaryType: 'RouteProof',
      message: proofMessage(mismatched),
    })
    expect(await verifyRouteProof(mismatched)).toBe(false)
  })

  it('rejects proofs with excessive lifetime or malformed nonce', async () => {
    const proof = await makeProof()
    expect(await verifyRouteProof({ ...proof, expiresAt: proof.issuedAt + 8 * 24 * 60 * 60 })).toBe(false)
    expect(await verifyRouteProof({ ...proof, nonce: '0x1234' })).toBe(false)
  })

  it('round-trips a URL-safe proof payload', async () => {
    const proof = await makeProof()
    expect(decodeProof(encodeProof(proof))).toEqual(proof)
  })
})
