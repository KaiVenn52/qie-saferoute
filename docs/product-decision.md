# Product decision — QIE SafeRoute

## Decision

Build a QIE-specific Payment Intent preflight SDK, not another payment link, wallet, invoice app, RPC fallback, or transaction simulator.

The product's first customer is a developer integrating QIE into a wallet send screen, exchange deposit flow, or merchant checkout. The standalone UI is the reference implementation and verifier.

## Why this problem

QIE combines EVM and Cosmos surfaces. Its public chain registry declares the `qie` bech32 prefix, `ethsecp256k1`, coin type 60, Ethermint codecs, and both EVM and Cosmos APIs. Its public genesis uses Ethermint `EthAccount` records with `qie1…` account addresses. QIE's faucet, meanwhile, asks for a `0x…` wallet address. That split creates a concrete integration and support risk: software and users need to know which representation a field expects and whether both values belong to the same account.

SafeRoute resolves the two encodings and adds a signed, short-lived intent that binds the recipient, amount, asset, order, audience, destination and purpose. This is useful before a payment without becoming a custodian or payment processor.

## Originality check

“Never built by anyone” cannot be proven globally. The defensible claim is narrower:

- Reown AppKit already handles wallet connection and payments, so generic checkout is excluded.
- viem already supports fallback transports, so RPC failover is excluded as a product.
- Tenderly already simulates transactions, so simulation alone is excluded.
- Request Network already handles payment requests and invoices, so invoicing is excluded.
- Sei and other EVM/Cosmos chains document dual addresses, but scoped searches of QIE's product pages, public GitHub organization, documentation, and the wider web found no public QIE-native tool combining dual-address resolution, EIP-712 control proof, offline verification, and an embeddable preflight SDK.

This is differentiated by the **combination and QIE-specific workflow**, not by claiming that bech32 conversion or wallet signatures are new primitives.

## Market and user

### Beachhead users

1. QIE wallet and dApp teams adding a send/withdraw field.
2. Exchanges and bridges listing QIE and answering address-format tickets.
3. Merchant checkout or invoicing teams accepting QIE/QUSDC.

### Job to be done

“Before I send or display a QIE payment address, tell me which format I have, derive the corresponding representation, and verify that the recipient controls it.”

### Why now

QIE publicly positions itself around payments, identity, EVM/Cosmos compatibility, developer tooling, and QUSDC integrations. A narrow integration-safety layer fits that direction without competing with QIE Wallet, QIE Pass, QIE Domains, or QUSDC.

## Product scope

### MVP (hackathon)

- local format and checksum validation
- deterministic 0x/qie1 representation
- QIE Testnet wallet connection
- 30-minute EIP-712 Payment Intent proof bound to amount, asset, order, audience and destination
- proof QR/JSON share and offline verification
- TypeScript reference functions
- optional PaymentIntentRegistry anchor/revoke contract with local tests

### Explicitly out of scope

- funds custody, transfers, swaps, fiat conversion, KYC, reputation scoring
- claiming “safe recipient” or guaranteeing payment recovery
- mainnet deployment before technical and organizer review
- storing raw signatures or personal information on-chain

## Business model hypothesis

Open-source core library; paid hosted policy/API layer for teams that need versioned network metadata, analytics, support SLAs, allowlists, and proof lifecycle monitoring. Do not monetize end users during the first 90 days.

## 90-day traction plan

### Days 1–30: prove the problem

- interview 10 QIE wallet/dApp/exchange developers
- publish SDK and reference verifier
- instrument only privacy-safe counters: checks, proof creations, verification outcome, integration source
- target: 3 design partners, 100 successful route checks, fewer than 5% invalid/ambiguous input retries after UI iteration

### Days 31–60: prove integration value

- ship copy-paste React component and vanilla TypeScript package
- integrate one partner send/deposit screen on testnet
- add network-metadata version pinning and proof revocation
- target: 2 live testnet integrations, 500 checks, median integration time under 30 minutes

### Days 61–90: prove repeat use

- run an address-format support-ticket study with partners
- add CI test vectors and exchange/merchant field policy presets
- propose integration to QIE Wallet/QUSDC ecosystem teams
- target: 3 retained integrations, 2,000 checks, 30% weekly returning integrators, documented reduction in address-format support cases

### Kill criteria

Stop or reposition if fewer than 3 of 10 target developers report address-format confusion, no team integrates after 60 days, or QIE confirms that its canonical address mapping differs from the public Ethermint/genesis evidence used by the MVP.

## Evidence reviewed

- QIE products and positioning: https://www.qie.digital/products
- QIE developer page: https://www.qie.digital/developer
- QIE network/RPC documentation: https://docs.qie.digital/getting-started-with-qie-blockchain/4.-access-mainnet-or-testnet
- QIE chain registry: https://github.com/qieadmin/chain-registry/blob/master/qie/chain.json
- QIE public genesis: https://github.com/qieadmin/qie/blob/main/genesis.json
- QIE public repositories: https://github.com/qieadmin
- QIE faucet requests 0x address: https://www.qie.digital/faucet
- Reown AppKit: https://docs.reown.com/appkit/overview
- viem fallback transport: https://viem.sh/docs/clients/transports/fallback
- Tenderly simulations: https://docs.tenderly.co/simulations/overview
- Request Network documentation: https://docs.request.network/
- Sei dual-address comparison: https://docs.sei.io/learn/accounts

Evidence is a scoped public-web review as of 2026-08-10, not a patent or exhaustive prior-art search.
