import { useMemo, useState } from 'react'
import {
  ArrowUpRight, Braces, Check, CheckCircle2, CircleAlert, Copy, FileCheck2,
  Link2, LockKeyhole, PackageCheck, Route, ShieldCheck, Store, Wallet,
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import {
  createWalletClient, custom, defineChain, formatUnits, getAddress, isAddress,
  numberToHex, parseUnits,
} from 'viem'
import { analyzeAddress, type AddressAnalysis } from './lib/address'
import {
  decodePaymentIntent, encodePaymentIntent, NATIVE_ASSET_ADDRESS,
  paymentIntentDomain, paymentIntentMessage, paymentIntentTypes, randomNonce,
  type DestinationType, type PaymentIntentProof, type UnsignedPaymentIntent,
  verifyPaymentIntent,
} from './lib/paymentIntent'
import { QIE_NETWORKS, QIE_TESTNET_CHAIN_ID, type QieChainId } from './lib/networks'
import './App.css'

const DEMO_ADDRESS = '0x577617999f8696149e8b6e176ab8404df62bae6d'
const DEMO_AUDIENCE = '0x9e6f067f4a1c5f2d1c3b119b59e9078f25cf5a07'

function shorten(value: string, head = 10, tail = 8) {
  return value.length > head + tail + 1 ? `${value.slice(0, head)}…${value.slice(-tail)}` : value
}

async function copyText(value: string) {
  await navigator.clipboard.writeText(value)
}

function destinationLabel(value: DestinationType) {
  return {
    merchant_checkout: 'Merchant checkout',
    wallet_send: 'Wallet send',
    exchange_deposit: 'Exchange deposit',
    bridge: 'Bridge transfer',
  }[value]
}

function App() {
  const [mode, setMode] = useState<'create' | 'verify'>('create')
  const [chainId, setChainId] = useState<QieChainId>(QIE_TESTNET_CHAIN_ID)
  const [recipient, setRecipient] = useState(DEMO_ADDRESS)
  const [amount, setAmount] = useState('12.50')
  const [assetSymbol, setAssetSymbol] = useState('QIE')
  const [assetAddress, setAssetAddress] = useState<string>(NATIVE_ASSET_ADDRESS)
  const [assetDecimals, setAssetDecimals] = useState('18')
  const [reference, setReference] = useState('ORDER-2048')
  const [audience, setAudience] = useState(DEMO_AUDIENCE)
  const [destinationType, setDestinationType] = useState<DestinationType>('merchant_checkout')
  const [purpose, setPurpose] = useState('Coffee equipment order')
  const [analysis, setAnalysis] = useState<AddressAnalysis | null>(() => analyzeAddress(DEMO_ADDRESS))
  const [draft, setDraft] = useState<UnsignedPaymentIntent | null>(null)
  const [intent, setIntent] = useState<PaymentIntentProof | null>(null)
  const [account, setAccount] = useState<`0x${string}` | null>(null)
  const [proofInput, setProofInput] = useState('')
  const [proofState, setProofState] = useState<'idle' | 'valid' | 'invalid'>('idle')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  const network = QIE_NETWORKS[chainId]
  const intentPayload = useMemo(() => (intent ? encodePaymentIntent(intent) : ''), [intent])
  const activeIntent = intent ?? draft

  function buildDraft(): UnsignedPaymentIntent {
    const checked = analyzeAddress(recipient)
    if (!amount.trim() || Number(amount) <= 0) throw new Error('Enter a payment amount greater than zero.')
    if (!/^[A-Z0-9._-]{1,16}$/.test(assetSymbol.trim().toUpperCase())) throw new Error('Enter a valid asset symbol.')
    if (!isAddress(assetAddress)) throw new Error('Enter a valid ERC-20 asset address or use the native asset.')
    const decimals = Number(assetDecimals)
    if (!Number.isSafeInteger(decimals) || decimals < 0 || decimals > 36) throw new Error('Asset decimals must be a whole number from 0 to 36.')
    if (!isAddress(audience)) throw new Error('Enter the wallet address of the intended verifier or merchant.')
    if (!reference.trim()) throw new Error('Add a unique order or payment reference.')
    if (!purpose.trim()) throw new Error('Describe what this payment is for.')
    const now = Math.floor(Date.now() / 1000)
    const next: UnsignedPaymentIntent = {
      recipientEvm: checked.evmAddress,
      recipientQie: checked.qieAddress,
      asset: getAddress(assetAddress),
      assetSymbol: assetSymbol.trim().toUpperCase(),
      amount: parseUnits(amount, decimals).toString(),
      decimals,
      reference: reference.trim(),
      audience: getAddress(audience),
      destinationType,
      purpose: purpose.trim(),
      issuedAt: now,
      expiresAt: now + 30 * 60,
      nonce: randomNonce(),
    }
    setAnalysis(checked)
    return next
  }

  function previewIntent() {
    try {
      const next = buildDraft()
      setDraft(next)
      setIntent(null)
      setProofState('idle')
      setError('')
      setNotice('All payment fields are bound into one 30-minute signing request.')
    } catch (reason) {
      setDraft(null)
      setIntent(null)
      setAnalysis(null)
      setNotice('')
      setError(reason instanceof Error ? reason.message : 'Unable to create this payment intent.')
    }
  }

  async function connectWallet(): Promise<`0x${string}` | null> {
    if (!window.ethereum) {
      setError('No injected wallet found. Install QIE Wallet or MetaMask to sign an intent.')
      return null
    }
    setBusy(true)
    try {
      const accounts = (await window.ethereum.request({ method: 'eth_requestAccounts' })) as string[]
      if (!accounts[0]) throw new Error('The wallet did not return an account.')
      const next = getAddress(accounts[0])
      setAccount(next)
      setRecipient(next)
      setAnalysis(analyzeAddress(next))
      setDraft(null)
      setIntent(null)
      setError('')
      return next
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Wallet connection was cancelled.')
      return null
    } finally {
      setBusy(false)
    }
  }

  async function signIntent() {
    if (!window.ethereum) return connectWallet()
    setBusy(true)
    try {
      const signer = account ?? await connectWallet()
      if (!signer) return
      const unsigned = buildDraft()
      if (unsigned.recipientEvm !== signer) throw new Error('The connected wallet must match the recipient address before it can sign.')
      const chain = defineChain({
        id: chainId,
        name: network.name,
        nativeCurrency: network.nativeCurrency,
        rpcUrls: { default: { http: [network.rpcUrl] } },
        blockExplorers: { default: { name: `${network.name} Explorer`, url: network.explorerUrl } },
      })
      try {
        await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: numberToHex(chainId) }] })
      } catch (switchError) {
        const code = typeof switchError === 'object' && switchError !== null && 'code' in switchError
          ? Number(switchError.code)
          : undefined
        if (code !== 4902) throw switchError
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: numberToHex(chainId), chainName: network.name,
            nativeCurrency: network.nativeCurrency, rpcUrls: [network.rpcUrl],
            blockExplorerUrls: [network.explorerUrl],
          }],
        })
      }
      const client = createWalletClient({ account: signer, chain, transport: custom(window.ethereum) })
      const signature = await client.signTypedData({
        account: signer,
        domain: paymentIntentDomain(chainId),
        types: paymentIntentTypes,
        primaryType: 'PaymentIntent',
        message: paymentIntentMessage(unsigned),
      })
      const next: PaymentIntentProof = { version: 2, chainId, ...unsigned, signature }
      setDraft(unsigned)
      setIntent(next)
      setAnalysis(analyzeAddress(signer))
      setNotice('Recipient signature verified locally. No payment or on-chain transaction was sent.')
      setError('')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Payment intent signing was cancelled.')
    } finally {
      setBusy(false)
    }
  }

  async function verifyIntent() {
    setBusy(true)
    try {
      const parsed = proofInput.trim().startsWith('{')
        ? JSON.parse(proofInput) as PaymentIntentProof
        : decodePaymentIntent(proofInput)
      const result = await verifyPaymentIntent(parsed)
      setProofState(result.valid ? 'valid' : 'invalid')
      setIntent(result.valid ? parsed : null)
      setDraft(result.valid ? parsed : null)
      setAnalysis(result.valid ? analyzeAddress(parsed.recipientEvm) : null)
      if (result.valid) setChainId(parsed.chainId)
      setNotice(result.valid ? 'Signature, route, amount, order and verifier context all match.' : '')
      setError(result.valid ? '' : result.reason ?? 'Payment intent is invalid.')
    } catch {
      setProofState('invalid')
      setIntent(null)
      setDraft(null)
      setAnalysis(null)
      setNotice('')
      setError('Paste a complete SafeRoute Payment Intent JSON or encoded payload.')
    } finally {
      setBusy(false)
    }
  }

  function selectNetwork(next: QieChainId) {
    setChainId(next)
    setAssetSymbol(QIE_NETWORKS[next].nativeCurrency.symbol)
    setIntent(null)
    setDraft(null)
    setNotice('')
  }

  const expires = activeIntent ? new Date(activeIntent.expiresAt * 1000) : null
  const displayAmount = activeIntent ? formatUnits(BigInt(activeIntent.amount), activeIntent.decimals) : amount

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="QIE SafeRoute home">
          <span className="brand-mark"><Route size={20} /></span><span>QIE SafeRoute</span>
        </a>
        <span className={`network-pill ${chainId === 1990 ? 'mainnet' : ''}`}><i /> {network.name} · {chainId}</span>
        <nav aria-label="Primary navigation"><a className="active" href="#preflight">Preflight</a><a href="#workflow">Workflow</a><a href="#sdk">SDK</a></nav>
        <button className="wallet-button" onClick={() => void connectWallet()} disabled={busy}><Wallet size={17} /> {account ? shorten(account, 6, 4) : 'Connect wallet'}</button>
      </header>

      <main id="top">
        <section className="hero-copy">
          <div className="eyebrow"><ShieldCheck size={15} /> Payment intent preflight for QIE</div>
          <h1>Match the intent.<br /><em>Then pay.</em></h1>
          <p>Bind the QIE route, amount, asset, order and intended verifier into one recipient-signed request before funds move.</p>
          <div className="truth-note"><CircleAlert size={16} /><span>SafeRoute verifies payment context and wallet control—not identity, reputation, delivery, or fund recovery.</span></div>
        </section>

        <section className="workspace" id="preflight">
          <div className="check-card intent-form">
            <div className="tabs" role="tablist" aria-label="Payment intent mode">
              <button className={mode === 'create' ? 'selected' : ''} onClick={() => setMode('create')}>Create intent</button>
              <button className={mode === 'verify' ? 'selected' : ''} onClick={() => setMode('verify')}>Verify intent</button>
            </div>
            {mode === 'create' ? (
              <>
                <div className="network-choice" aria-label="QIE network">
                  <button className={chainId === 1983 ? 'selected' : ''} onClick={() => selectNetwork(1983)}>Testnet · 1983</button>
                  <button className={chainId === 1990 ? 'selected' : ''} onClick={() => selectNetwork(1990)}>Mainnet · 1990</button>
                </div>
                <label htmlFor="recipient">Recipient address <span>EVM or QIE</span></label>
                <div className="input-wrap"><input id="recipient" value={recipient} onChange={(event) => setRecipient(event.target.value)} spellCheck={false} /><Wallet size={17} aria-hidden="true" /></div>
                <div className="field-grid amount-row">
                  <div><label htmlFor="amount">Amount <span>Human units</span></label><input id="amount" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} /></div>
                  <div><label htmlFor="asset">Asset <span>Signed</span></label><input id="asset" value={assetSymbol} maxLength={16} onChange={(event) => setAssetSymbol(event.target.value.toUpperCase())} /></div>
                </div>
                <details className="asset-details">
                  <summary>Asset contract and verifier</summary>
                  <label htmlFor="asset-address">Asset contract <span>Zero = native</span></label><input id="asset-address" value={assetAddress} onChange={(event) => setAssetAddress(event.target.value)} spellCheck={false} />
                  <label htmlFor="asset-decimals">Asset decimals <span>Usually 18</span></label><input id="asset-decimals" inputMode="numeric" value={assetDecimals} onChange={(event) => setAssetDecimals(event.target.value)} />
                  <label htmlFor="audience">Intended verifier <span>Merchant / app wallet</span></label><input id="audience" value={audience} onChange={(event) => setAudience(event.target.value)} spellCheck={false} />
                </details>
                <div className="field-grid">
                  <div><label htmlFor="reference">Reference <span>Replay boundary</span></label><input id="reference" value={reference} maxLength={96} onChange={(event) => setReference(event.target.value)} /></div>
                  <div><label htmlFor="destination">Flow <span>Signed</span></label><select id="destination" value={destinationType} onChange={(event) => setDestinationType(event.target.value as DestinationType)}><option value="merchant_checkout">Merchant checkout</option><option value="wallet_send">Wallet send</option><option value="exchange_deposit">Exchange deposit</option><option value="bridge">Bridge transfer</option></select></div>
                </div>
                <label htmlFor="purpose">Purpose <span>Visible before signing</span></label><input id="purpose" value={purpose} maxLength={160} onChange={(event) => setPurpose(event.target.value)} />
                <p className="hint">Preview is local. Signing creates no payment and spends no gas.</p>
                <button className="primary-action" onClick={previewIntent}><FileCheck2 size={19} /> Preview payment intent</button>
              </>
            ) : (
              <>
                <label htmlFor="proof">Signed payment intent <span>JSON or encoded</span></label>
                <textarea id="proof" value={proofInput} onChange={(event) => setProofInput(event.target.value)} maxLength={24_576} placeholder={'{"version":2,"chainId":1983,…}'} />
                <p className="hint">Verification runs locally. Nothing is uploaded or submitted.</p>
                <button className="primary-action" onClick={() => void verifyIntent()} disabled={busy}><ShieldCheck size={19} /> Verify complete intent</button>
                {proofState === 'valid' && <p className="inline-success"><Check size={15} /> Context-bound signature is valid.</p>}
              </>
            )}
            {notice && <p className="inline-success"><Check size={15} /> {notice}</p>}
            {error && <p className="error-message"><CircleAlert size={15} /> {error}</p>}
            <div className="check-list">
              <div><span><Link2 /></span><b>Route matched</b><small>0x ↔ qie1</small></div>
              <div><span><FileCheck2 /></span><b>Context bound</b><small>Amount + order + audience</small></div>
              <div><span><LockKeyhole /></span><b>Recipient signed</b><small>EIP-712, 30 minutes</small></div>
            </div>
          </div>

          <div className={`result-card ${activeIntent && analysis ? 'has-result' : ''}`} aria-live="polite">
            {activeIntent && analysis ? (
              <>
                <div className={`result-head ${intent ? '' : 'preview'}`}><span className="success-icon">{intent ? <Check size={24} /> : <FileCheck2 size={22} />}</span><div><h2>{intent ? 'Payment intent verified' : 'Intent ready to sign'}</h2><p>{intent ? 'Every displayed field is covered by the recipient signature.' : 'Review every field before asking the recipient to sign.'}</p></div></div>
                <dl>
                  <div><dt>Amount</dt><dd><strong>{displayAmount} {activeIntent.assetSymbol}</strong></dd></div>
                  <div><dt>Reference</dt><dd title={activeIntent.reference}>{shorten(activeIntent.reference, 18, 10)}</dd></div>
                  <div><dt>Purpose</dt><dd title={activeIntent.purpose}>{shorten(activeIntent.purpose, 22, 12)}</dd></div>
                  <div><dt>Recipient</dt><dd title={analysis.evmAddress}>{shorten(analysis.evmAddress, 14, 10)} <button onClick={() => void copyText(analysis.evmAddress)} aria-label="Copy recipient address"><Copy /></button></dd></div>
                  <div><dt>QIE route</dt><dd title={analysis.qieAddress}>{shorten(analysis.qieAddress, 14, 10)} <button onClick={() => void copyText(analysis.qieAddress)} aria-label="Copy QIE address"><Copy /></button></dd></div>
                  <div><dt>Intended verifier</dt><dd title={activeIntent.audience}>{shorten(activeIntent.audience, 14, 10)}</dd></div>
                  <div><dt>Flow</dt><dd>{destinationLabel(activeIntent.destinationType)}</dd></div>
                  <div><dt>Network</dt><dd><span className="mini-pill"><i /> {QIE_NETWORKS[chainId].name} · {chainId}</span></dd></div>
                  <div><dt>Signature</dt><dd>{intent ? <span className="valid"><CheckCircle2 /> Valid</span> : <span className="muted">Not signed</span>}</dd></div>
                  <div><dt>Expires</dt><dd>{expires?.toLocaleString()}</dd></div>
                </dl>
                <div className="proof-zone"><div><span className="section-label">Portable proof</span><strong>{shorten(activeIntent.nonce, 14, 10)}</strong><p>{intent ? 'JSON and QR can be verified offline.' : 'No transaction or signature has been sent.'}</p></div><div className="qr-wrap"><QRCodeSVG value={intentPayload || analysis.qieAddress} size={88} bgColor="#fbfaf6" fgColor="#143f32" /></div></div>
                {intent ? <button className="secondary-action" onClick={() => void copyText(JSON.stringify(intent))}><ArrowUpRight size={18} /> Copy signed intent JSON</button> : <button className="secondary-action" onClick={() => void signIntent()} disabled={busy}><Wallet size={18} /> Sign as recipient</button>}
              </>
            ) : <div className="empty-result"><FileCheck2 size={34} /><h2>No payment intent yet</h2><p>Complete the payment context to preview the exact signing request.</p></div>}
          </div>
        </section>

        <section className="workflow-strip" id="workflow" aria-label="Merchant integration workflow">
          <div className="workflow-title"><Store /><div><h3>Merchant checkout reference flow</h3><p>A real integration path, without custody.</p></div></div>
          <ol><li><span>1</span><div><b>Create</b><small>Merchant defines amount, order and verifier.</small></div></li><li><span>2</span><div><b>Sign</b><small>Recipient confirms the complete intent.</small></div></li><li><span>3</span><div><b>Verify</b><small>Checkout fails closed on any changed field.</small></div></li><li><span>4</span><div><b>Pay separately</b><small>Wallet remains in control of the transaction.</small></div></li></ol>
        </section>

        <section className="developer-strip" id="sdk">
          <div className="sdk-intro"><span><Braces /></span><div><h3>Installable SDK</h3><p>Typed verifier for browser, server and CI.</p></div></div>
          <pre><code><b>import</b> {'{ verifyPaymentIntent }'} <b>from</b> <i>'qie-saferoute-sdk'</i>;{`\n\n`}<b>const</b> result = <b>await</b> verifyPaymentIntent(intent, {'{'}{`\n  `}expectedAudience: merchant,{`\n  `}expectedReference: order.id,{`\n`}{'}'});</code></pre>
          <div className="security-note"><PackageCheck /><div><strong>13 SDK tests · 3 contract tests</strong><p>Publish-ready package; not yet released or deployed.</p></div></div>
        </section>
        <section className="market-note"><span>Designed for</span><strong>Wallet send screens</strong><strong>Exchange deposit flows</strong><strong>Merchant checkout SDKs</strong></section>
      </main>
      <footer><span>QIE SafeRoute · Payment Intent v2</span><span>Verify context. Keep custody.</span></footer>
    </div>
  )
}

export default App
