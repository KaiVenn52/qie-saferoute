import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { keccak256, stringToHex } from 'viem'
import { network } from 'hardhat'

describe('PaymentIntentRegistry', async () => {
  const { viem } = await network.create()
  const publicClient = await viem.getPublicClient()
  const [signer, outsider] = await viem.getWalletClients()

  it('anchors and revokes an intent for its signer', async () => {
    const registry = await viem.deployContract('PaymentIntentRegistry')
    const intentHash = keccak256(stringToHex('ORDER-2048'))
    const block = await publicClient.getBlock()
    const expiresAt = block.timestamp + 3600n

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
})
