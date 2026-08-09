import { bech32 } from 'bech32'
import { getAddress, isAddress } from 'viem'

export const QIE_PREFIX = 'qie'

export type AddressAnalysis = {
  inputType: 'EVM' | 'QIE'
  evmAddress: `0x${string}`
  qieAddress: string
  checksumValid: boolean
}

export function evmToQie(address: string): string {
  if (!isAddress(address)) throw new Error('Enter a valid 20-byte EVM address.')
  const normalized = getAddress(address)
  const bytes = Uint8Array.from(
    normalized.slice(2).match(/.{2}/g)?.map((byte) => Number.parseInt(byte, 16)) ?? [],
  )
  return bech32.encode(QIE_PREFIX, bech32.toWords(bytes))
}

export function qieToEvm(address: string): `0x${string}` {
  let decoded: ReturnType<typeof bech32.decode>
  try {
    decoded = bech32.decode(address.toLowerCase())
  } catch {
    throw new Error('Enter a valid QIE bech32 address.')
  }
  if (decoded.prefix !== QIE_PREFIX) throw new Error('The address prefix must be qie.')
  const bytes = Uint8Array.from(bech32.fromWords(decoded.words))
  if (bytes.length !== 20) throw new Error('A QIE account address must contain 20 bytes.')
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  return getAddress(`0x${hex}`)
}

export function analyzeAddress(input: string): AddressAnalysis {
  const value = input.trim()
  if (value.toLowerCase().startsWith(`${QIE_PREFIX}1`)) {
    const evmAddress = qieToEvm(value)
    return { inputType: 'QIE', evmAddress, qieAddress: evmToQie(evmAddress), checksumValid: true }
  }

  if (!isAddress(value)) throw new Error('Enter a valid EVM (0x…) or QIE (qie1…) address.')
  const evmAddress = getAddress(value)
  const hasMixedCase = /[a-f]/.test(value.slice(2)) && /[A-F]/.test(value.slice(2))
  return {
    inputType: 'EVM',
    evmAddress,
    qieAddress: evmToQie(evmAddress),
    checksumValid: !hasMixedCase || value === evmAddress,
  }
}
