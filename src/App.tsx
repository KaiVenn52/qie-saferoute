import { useMemo, useState } from 'react'
import {
  ArrowUpRight,
  Braces,
  Check,
  CheckCircle2,
  CircleAlert,
  Clipboard,
  Copy,
  Link2,
  LockKeyhole,
  Route,
  ShieldCheck,
  Wallet,
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { createWalletClient, custom, getAddress, numberToHex } from 'viem'
import { analyzeAddress, type AddressAnalysis } from './lib/address'
import {
  encodeProof,
  decodeProof,
  proofDomain,
  proofMessage,
  proofTypes,
  QIE_TESTNET_CHAIN_ID,
  type RouteProof,
  verifyRouteProof,
} from './lib/proof'
import './App.css'

const DEMO_ADDRESS = '0x577617999f8696149e8b6e176ab8404df62bae6d'
const qieTestnet = {
  id: QIE_TESTNET_CHAIN_ID,
  name: 'QIE Testnet',
  nativeCurrency: { name: 'QIE', symbol: 'QIE', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc1testnet.qie.digital/'] } },
} as const

function shorten(value: string, head = 10, tail = 8) {
  return `${value.slice(0, head)}…${value.slice(-tail)}`
}

async function copyText(value: string) {
  await navigator.clipboard.writeText(value)
}

function App() {
  const [mode, setMode] = useState<'check' | 'verify'>('check')
  const [address, setAddress] = useState(DEMO_ADDRESS)
  const [analysis, setAnalysis] = useState<AddressAnalysis | null>(() => analyzeAddress(DEMO_ADDRESS))
  const [error, setError] = useState('')
  const [account, setAccount] = useState<`0x${string}` | null>(null)
  const [proof, setProof] = useState<RouteProof | null>(null)
  const [proofInput, setProofInput] = useState('')
  const [proofState, setProofState] = useState<'idle' | 'valid' | 'invalid'>('idle')
  const [busy, setBusy] = useState(false)

  const proofPayload = useMemo(() => (proof ? encodeProof(proof) : ''), [proof])

  function runCheck() {
    try {
      const next = analyzeAddress(address)
      setAnalysis(next)
      setError('')
      setProof(null)
    } catch (reason) {
      setAnalysis(null)
      setError(reason instanceof Error ? reason.message : 'Unable to check this address.')
    }
  }

  async function connectWallet() {
    if (!window.ethereum) {
      setError('No injected wallet found. Install QIE Wallet or MetaMask to create a proof.')
      return
    }
    setBusy(true)
    try {
      const accounts = (await window.ethereum.request({ method: 'eth_requestAccounts' })) as string[]
      const next = getAddress(accounts[0])
      setAccount(next)
      setAddress(next)
      setAnalysis(analyzeAddress(next))
      setError('')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Wallet connection was cancelled.')
    } finally {
      setBusy(false)
    }
  }

  async function createProof() {
    if (!window.ethereum || !account) return connectWallet()
    setBusy(true)
    try {
      const checked = analyzeAddress(account)
      const now = Math.floor(Date.now() / 1000)
      const unsigned = {
        evmAddress: checked.evmAddress,
        qieAddress: checked.qieAddress,
        issuedAt: now,
        expiresAt: now + 24 * 60 * 60,
        nonce: `0x${Array.from(
          crypto.getRandomValues(new Uint8Array(32)),
          (byte) => byte.toString(16).padStart(2, '0'),
        ).join('')}` as `0x${string}`,
      }
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: numberToHex(QIE_TESTNET_CHAIN_ID) }],
        })
      } catch (switchError) {
        const errorCode = typeof switchError === 'object' && switchError !== null && 'code' in switchError
          ? Number(switchError.code)
          : undefined
        if (errorCode !== 4902) throw switchError
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: numberToHex(QIE_TESTNET_CHAIN_ID),
            chainName: qieTestnet.name,
            nativeCurrency: qieTestnet.nativeCurrency,
            rpcUrls: qieTestnet.rpcUrls.default.http,
            blockExplorerUrls: ['https://testnet.qie.digital/'],
          }],
        })
      }
      const client = createWalletClient({ account, chain: qieTestnet, transport: custom(window.ethereum) })
      const signature = await client.signTypedData({
        account,
        domain: proofDomain,
        types: proofTypes,
        primaryType: 'RouteProof',
        message: proofMessage(unsigned),
      })
      const next: RouteProof = { version: 1, chainId: QIE_TESTNET_CHAIN_ID, ...unsigned, signature }
      setProof(next)
      setAnalysis(checked)
      setMode('check')
      setError('')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Proof creation was cancelled.')
    } finally {
      setBusy(false)
    }
  }

  async function verifyProof() {
    setBusy(true)
    try {
      const parsed = proofInput.trim().startsWith('{')
        ? JSON.parse(proofInput) as RouteProof
        : decodeProof(proofInput)
      const valid = await verifyRouteProof(parsed)
      setProofState(valid ? 'valid' : 'invalid')
      setAnalysis(valid ? analyzeAddress(parsed.evmAddress) : null)
      setProof(valid ? parsed : null)
      setError(valid ? '' : 'This proof is invalid, expired, or its addresses do not match.')
    } catch {
      setProofState('invalid')
      setError('Paste a complete SafeRoute proof JSON.')
    } finally {
      setBusy(false)
    }
  }

  const expires = proof ? new Date(proof.expiresAt * 1000) : null

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="QIE SafeRoute home">
          <span className="brand-mark"><Route size={20} /></span>
          <span>QIE SafeRoute</span>
        </a>
        <span className="network-pill"><i /> QIE Testnet · 1983</span>
        <nav aria-label="Primary navigation">
          <a className="active" href="#verify">Verify</a>
          <button onClick={createProof}>Create proof</button>
          <a href="#sdk">SDK</a>
        </nav>
        <button className="wallet-button" onClick={connectWallet} disabled={busy}>
          <Wallet size={17} /> {account ? shorten(account, 6, 4) : 'Connect wallet'}
        </button>
      </header>

      <main id="top">
        <section className="hero-copy">
          <div className="eyebrow"><ShieldCheck size={15} /> Payment preflight for QIE</div>
          <h1>Verify the route.<br /><em>Then pay.</em></h1>
          <p>Resolve QIE’s two address formats and verify wallet control before funds move. No custody, no transaction button, no guesswork.</p>
          <div className="truth-note"><CircleAlert size={16} /><span>SafeRoute proves address control—not identity, reputation, or transaction safety.</span></div>
        </section>

        <section className="workspace" id="verify">
          <div className="check-card">
            <div className="tabs" role="tablist">
              <button className={mode === 'check' ? 'selected' : ''} onClick={() => setMode('check')}>Check address</button>
              <button className={mode === 'verify' ? 'selected' : ''} onClick={() => setMode('verify')}>Verify proof</button>
            </div>

            {mode === 'check' ? (
              <>
                <label htmlFor="recipient">Recipient address <span>EVM or QIE</span></label>
                <div className="input-wrap">
                  <input id="recipient" value={address} onChange={(event) => setAddress(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && runCheck()} spellCheck={false} />
                  <Clipboard size={17} aria-hidden="true" />
                </div>
                <p className="hint">Paste a 0x address or a qie1 bech32 address.</p>
                <button className="primary-action" onClick={runCheck}><ShieldCheck size={19} /> Run safety check</button>
              </>
            ) : (
              <>
                <label htmlFor="proof">Signed proof <span>JSON</span></label>
                <textarea id="proof" value={proofInput} onChange={(event) => setProofInput(event.target.value)} maxLength={16_384} placeholder={'{"version":1,"chainId":1983,…}'} />
                <p className="hint">Verification runs locally. The proof is not uploaded.</p>
                <button className="primary-action" onClick={verifyProof} disabled={busy}><ShieldCheck size={19} /> Verify signature</button>
                {proofState === 'valid' && <p className="inline-success"><Check size={15} /> Signature and address pair are valid.</p>}
              </>
            )}

            {error && <p className="error-message"><CircleAlert size={15} /> {error}</p>}
            <div className="check-list">
              <div><span><ShieldCheck /></span><b>Format validation</b><small>Checksum and encoding</small></div>
              <div><span><Link2 /></span><b>Dual-address resolution</b><small>Maps 0x ↔ qie1 locally</small></div>
              <div><span><LockKeyhole /></span><b>Control proof</b><small>EIP-712 wallet signature</small></div>
            </div>
          </div>

          <div className={`result-card ${analysis ? 'has-result' : ''}`} aria-live="polite">
            {analysis ? (
              <>
                <div className="result-head">
                  <span className="success-icon"><Check size={24} /></span>
                  <div><h2>Address route resolved</h2><p>Both formats represent the same 20-byte QIE account.</p></div>
                </div>
                <dl>
                  <div><dt>EVM address</dt><dd title={analysis.evmAddress}>{shorten(analysis.evmAddress, 14, 10)} <button onClick={() => copyText(analysis.evmAddress)} aria-label="Copy EVM address"><Copy /></button></dd></div>
                  <div><dt>QIE address</dt><dd title={analysis.qieAddress}>{shorten(analysis.qieAddress, 14, 10)} <button onClick={() => copyText(analysis.qieAddress)} aria-label="Copy QIE address"><Copy /></button></dd></div>
                  <div><dt>Encoding</dt><dd><span className="valid"><CheckCircle2 /> Valid bech32 + 20 bytes</span></dd></div>
                  <div><dt>Network</dt><dd><span className="mini-pill"><i /> QIE Testnet · 1983</span></dd></div>
                  <div><dt>Control proof</dt><dd>{proof ? <span className="valid"><CheckCircle2 /> Signature valid</span> : <span className="muted">Not attached</span>}</dd></div>
                  <div><dt>Proof expires</dt><dd>{expires ? expires.toLocaleString() : '—'}</dd></div>
                </dl>
                <div className="proof-zone">
                  <div>
                    <span className="section-label">Proof card</span>
                    <strong>{proof ? shorten(proof.nonce, 12, 8) : 'Unsigned route'}</strong>
                    <p>{proof ? 'Anyone can verify this offline.' : 'Connect the recipient wallet to prove control.'}</p>
                  </div>
                  <div className="qr-wrap">
                    <QRCodeSVG value={proofPayload || analysis.qieAddress} size={88} bgColor="#fbfaf6" fgColor="#143f32" />
                  </div>
                </div>
                {proof ? (
                  <button className="secondary-action" onClick={() => copyText(JSON.stringify(proof))}><ArrowUpRight size={18} /> Copy proof JSON</button>
                ) : (
                  <button className="secondary-action" onClick={createProof}><Wallet size={18} /> Create signed proof</button>
                )}
              </>
            ) : (
              <div className="empty-result"><Route size={34} /><h2>No route checked yet</h2><p>Paste an address to resolve both QIE representations.</p></div>
            )}
          </div>
        </section>

        <section className="developer-strip" id="sdk">
          <div className="sdk-intro"><span><Braces /></span><div><h3>Integration API</h3><p>One preflight call before every QIE payment.</p></div></div>
          <pre><code><b>import</b> {'{ analyzeAddress }'} <b>from</b> <i>'./lib/address'</i>;{`\n\n`}<b>const</b> route = analyzeAddress(recipient);{`\n`}assert(route.qieAddress);</code></pre>
          <div className="security-note"><ShieldCheck /><div><strong>No custody · No private keys</strong><p>Read-only checks. Testnet first.</p></div></div>
        </section>

        <section className="market-note">
          <span>Built for</span><strong>Wallet send screens</strong><strong>Exchange deposit flows</strong><strong>Merchant checkout SDKs</strong>
        </section>
      </main>
      <footer><span>QIE SafeRoute MVP</span><span>Proof, not promises.</span></footer>
    </div>
  )
}

export default App
