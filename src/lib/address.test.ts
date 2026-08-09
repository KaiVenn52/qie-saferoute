import { bech32 } from 'bech32'
import { describe, expect, it } from 'vitest'
import { analyzeAddress, evmToQie, qieToEvm } from './address'

const GENESIS_QIE = 'qie12amp0xvls6tpf85tdctk4wzqfhmzhtnd2xkqdm'
const GENESIS_EVM = '0x577617999f8696149e8b6e176ab8404df62bae6d'

describe('QIE address resolution', () => {
  it('decodes a public QIE genesis account into its EVM representation', () => {
    expect(qieToEvm(GENESIS_QIE).toLowerCase()).toBe(GENESIS_EVM)
  })

  it('round-trips EVM and QIE formats without changing account bytes', () => {
    expect(evmToQie(GENESIS_EVM)).toBe(GENESIS_QIE)
    expect(qieToEvm(evmToQie(GENESIS_EVM)).toLowerCase()).toBe(GENESIS_EVM)
  })

  it('rejects the wrong bech32 prefix and malformed lengths', () => {
    const decoded = bech32.decode(GENESIS_QIE)
    const wrongPrefix = bech32.encode('cosmos', decoded.words)
    expect(() => qieToEvm(wrongPrefix)).toThrow('prefix')
    expect(() => analyzeAddress('0x1234')).toThrow('valid')
  })
})
