# QIE SafeRoute

QIE SafeRoute is a non-custodial payment preflight and developer tool for QIE's dual account representation. It resolves an EVM `0x…` address and its QIE `qie1…` bech32 representation, then lets the recipient sign a short-lived EIP-712 proof of control.

It does **not** claim that a recipient is honest, simulate a payment, hold funds, or expose a send button. The promise is deliberately narrow: correct encoding, deterministic representation, and cryptographic control proof.

## MVP

- 0x ↔ qie1 local conversion and validation
- QIE genesis-account test vector
- injected-wallet connection on QIE Testnet (chain ID 1983)
- 24-hour EIP-712 route proof
- offline proof verification and QR payload
- optional non-custodial proof-hash registry contract
- responsive, accessible single-screen workflow

## Run

```bash
npm install
npm run dev
```

Quality checks:

```bash
npm test
npm run lint
npm run build
```

## Safety boundary

- Testnet is configured by default.
- No deploy script, private key, transfer call, or mainnet RPC is included.
- The Solidity registry stores only a proof hash, expiry, and revocation bit; it cannot receive or move user funds.
- Mainnet deployment requires a separate review and explicit approval.

See [product decision](docs/product-decision.md), [submission draft](docs/hackathon-submission.md), and the [UI concept](docs/ui-concept.png).

Live demo: <https://kangming0602.github.io/qie-saferoute/>
