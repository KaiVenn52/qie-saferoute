import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { keccak256, stringToHex, zeroAddress } from 'viem'
import { network } from 'hardhat'
import { evmToQie } from '../src/lib/address.js'
import { hashPaymentIntent } from '../src/lib/paymentIntent.js'

describe('PaymentIntentRegistry', async () => {
  const { viem } = await network.create()
  const publicClient = await viem.getPublicClient()
  const [signer, outsider] = await viem.getWalletClients()

  it('anchors and revokes an intent for its signer', async () => {
    const registry = await viem.deployContract('PaymentIntentRegistry')
    const block = await publicClient.getBlock()
    const expiresAt = block.timestamp + 3600n
    const intentHash = hashPaymentIntent({
      chainId: 1983,
      recipientEvm: signer.account.address,
      recipientQie: evmToQie(signer.account.address),
      asset: zeroAddress,
      assetSymbol: 'QIE',
      amount: '12500000000000000000',
      decimals: 18,
      reference: 'ORDER-2048',
      audience: outsider.account.address,
      destinationType: 'merchant_checkout',
      purpose: 'Coffee equipment order',
      issuedAt: Number(block.timestamp),
      expiresAt: Number(expiresAt),
      nonce: `0x${'ab'.repeat(32)}`,
    })

    await registry.write.anchor([intentHash, expiresAt], { account: signer.account })
    assert.equal(await registry.read.isActive([signer.account.address, intentHash]), true)

    await registry.write.revoke([intentHash], { account: signer.account })
    assert.equal(await registry.read.isActive([signer.account.address, intentHash]), false)
  })

  it('isolates anchors by signer', async () => {
    const registry = await viem.deployContract('PaymentIntentRegistry')
    const intentHash = keccak256(stringToHex('ORDER-4096'))
    const block = await publicClient.getBlock()

    await registry.write.anchor([intentHash, block.timestamp + 1800n], { account: signer.account })
    assert.equal(await registry.read.isActive([outsider.account.address, intentHash]), false)
  })

  it('rejects empty hashes and excessive lifetimes', async () => {
    const registry = await viem.deployContract('PaymentIntentRegistry')
    const block = await publicClient.getBlock()
    const zeroHash = `0x${'00'.repeat(32)}` as const
    const intentHash = keccak256(stringToHex('ORDER-8192'))

    await assert.rejects(registry.write.anchor([zeroHash, block.timestamp + 60n], { account: signer.account }))
    await assert.rejects(registry.write.anchor([intentHash, block.timestamp + 8n * 24n * 60n * 60n], { account: signer.account }))
  })

  it('refreshes the expiry of a live anchor', async () => {
    const registry = await viem.deployContract('PaymentIntentRegistry')
    const block = await publicClient.getBlock()
    const intentHash = keccak256(stringToHex('ORDER-16384'))

    await registry.write.anchor([intentHash, block.timestamp + 1800n], { account: signer.account })
    await registry.write.anchor([intentHash, block.timestamp + 3600n], { account: signer.account })

    assert.equal(await registry.read.isActive([signer.account.address, intentHash]), true)
    const [expiresAt, revoked] = await registry.read.anchors([signer.account.address, intentHash])
    assert.equal(expiresAt, block.timestamp + 3600n)
    assert.equal(revoked, false)
  })

  it('keeps a revoked anchor revoked and cannot be reactivated', async () => {
    const registry = await viem.deployContract('PaymentIntentRegistry')
    const block = await publicClient.getBlock()
    const intentHash = keccak256(stringToHex('ORDER-32768'))

    await registry.write.anchor([intentHash, block.timestamp + 1800n], { account: signer.account })
    await registry.write.revoke([intentHash], { account: signer.account })
    assert.equal(await registry.read.isActive([signer.account.address, intentHash]), false)

    // Re-anchoring the same digest must not clear the revocation bit.
    await assert.rejects(
      registry.write.anchor([intentHash, block.timestamp + 3600n], { account: signer.account }),
    )
    assert.equal(await registry.read.isActive([signer.account.address, intentHash]), false)
    const [, revoked] = await registry.read.anchors([signer.account.address, intentHash])
    assert.equal(revoked, true)

    // A fresh nonce yields a different digest, which is the supported way to restart.
    const freshHash = keccak256(stringToHex('ORDER-32769'))
    await registry.write.anchor([freshHash, block.timestamp + 1800n], { account: signer.account })
    assert.equal(await registry.read.isActive([signer.account.address, freshHash]), true)
  })
})
