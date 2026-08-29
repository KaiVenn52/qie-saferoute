# QIE SafeRoute

QIE SafeRoute is a non-custodial payment-intent preflight SDK for QIE wallet, exchange-deposit, bridge and merchant-checkout flows.

It resolves QIE's two account representations (`0x…` and `qie1…`) and lets the recipient sign a short-lived EIP-712 Payment Intent. The signature covers the route, network, asset, amount, order reference, intended verifier, destination type and purpose. An integrator can then fail closed if any of those fields changes before payment.

SafeRoute does **not** claim that a recipient is honest, simulate a payment, hold funds, or expose a send button. A valid intent proves control of the stated address pair and agreement with the signed payment context for its lifetime.

## Product surface

- local 0x ↔ qie1 conversion and validation
- QIE Testnet (1983) and Mainnet (1990) network metadata
- typed Payment Intent v2 creation and verification
- context binding for amount, asset, order, audience and destination
- offline JSON / URL-safe / QR sharing
- installable TypeScript SDK build (`qie-saferoute-sdk`)
- canonical EIP-712 digest plus non-custodial `PaymentIntentRegistry` anchor/revoke contract
- responsive reference checkout flow with no custody or transfer call

## Run locally

```bash
npm install
npm run dev
```

Quality checks:

```bash
npm run lint
npm test
npm run contracts:test
npm run build
npm pack --dry-run
```

`npm run build` produces both the Vite app and declaration-rich SDK output in `dist-sdk/`. The package is publish-ready but has not been published to npm.

## Contract

[`contracts/PaymentIntentRegistry.sol`](contracts/PaymentIntentRegistry.sol) stores only an intent digest, expiry and revocation bit. It cannot receive or move user funds. Compile and test it locally with:

```bash
npm run contracts:compile
npm run contracts:test
```

The hackathon requires a QIE Mainnet deployment for final eligibility. No mainnet deployment or production transaction has been performed yet, and no address is claimed. The deployment runner is dry-run-only by default and prints the exact account balance, gas estimate and estimated fee before any broadcast. See [`docs/deployment.md`](docs/deployment.md).

## Security boundary

- Private keys never enter SafeRoute.
- Signing is an explicit wallet action and creates no payment.
- Verification is deterministic and can run offline.
- Proof lifetimes are capped at seven days; the reference UI uses 30 minutes.
- Integrators should pass `expectedAudience` and `expectedReference` to prevent an otherwise valid intent being reused in another checkout.
- See [`docs/threat-model.md`](docs/threat-model.md) for assumptions and non-goals.

## Integration

See [`docs/sdk-integration.md`](docs/sdk-integration.md) for the browser/server verifier flow and [`docs/hackathon-submission.md`](docs/hackathon-submission.md) for the competition framing.

Planned reference UI: <https://kangming0602.github.io/qie-saferoute/> (it must be opened in a private window and verified live before submission).
