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
- optional frontend registry status, anchor and revoke controls when a verified deployment address is configured
- responsive reference checkout flow with no custody or transfer call

## Run locally

```bash
npm install
npm run dev
```

Quality checks:

```bash
npm run validate
```

`npm run validate` runs lint, the SDK tests, the contract tests, the Vite build, the SDK build and `npm pack --dry-run` in one pass. Individual steps are also available as `npm run lint`, `npm test`, `npm run contracts:test`, `npm run build` and `npm pack --dry-run`.

`npm run build` produces both the Vite app and declaration-rich SDK output in `dist-sdk/`. The package is publish-ready but has not been published to npm.

## Contract

[`contracts/PaymentIntentRegistry.sol`](contracts/PaymentIntentRegistry.sol) stores only an intent digest, expiry and revocation bit. It cannot receive or move user funds. Compile and test it locally with:

```bash
npm run contracts:compile
npm run contracts:test
```

The hackathon requires a QIE Mainnet deployment for final eligibility. No mainnet deployment or production transaction has been performed yet, and no address is claimed. The deployment runner is dry-run-only by default and can print the exact public-account balance, gas estimate and estimated fee without loading a private key. See [`docs/deployment.md`](docs/deployment.md).

After a deployment is independently verified in the explorer, expose it to the reference app with `VITE_QIE_TESTNET_REGISTRY_ADDRESS` or `VITE_QIE_MAINNET_REGISTRY_ADDRESS`. The UI will then read `isActive` and let the connected recipient explicitly anchor or revoke the signed digest. Those writes require wallet approval and gas; they never send the payment itself. The controls fail closed: they stay disabled unless the configured address is valid *and* actual contract bytecode is found at that address on the selected chain.

Revocation is final for a given digest. Re-anchoring a revoked intent is rejected on-chain, so a `revoked` result can be treated as monotonic; restarting the flow requires a new intent with a new nonce.

## Security boundary

- Private keys never enter SafeRoute.
- Signing is an explicit wallet action and creates no payment.
- Verification is deterministic and can run offline.
- Proof lifetimes are capped at seven days; the reference UI uses 30 minutes.
- Integrators should pass `expectedAudience` and `expectedReference` to prevent an otherwise valid intent being reused in another checkout, and should pin `expectedAmount`, `expectedAsset`, `expectedDecimals` and `expectedRecipientEvm` to the values they are about to display or charge.
- The registry contract does not verify EIP-712 signatures. `isActive` only means an unexpired, non-revoked anchor exists for that signer; the signature must still be verified off-chain.
- See [`docs/threat-model.md`](docs/threat-model.md) for assumptions and non-goals.

## Integration

See [`docs/sdk-integration.md`](docs/sdk-integration.md) for the browser/server verifier flow and [`docs/hackathon-submission.md`](docs/hackathon-submission.md) for the competition framing.

Live reference UI: <https://kaivenn52.github.io/qie-saferoute/>

The Payment Intent v2 app is built from `main` by the GitHub Pages workflow, which validates the SDK and contract before publication. Check the latest successful deployment and the served bundle before relying on this URL in a submission. The registry remains unconfigured until an independently verified deployment exists; publishing the app does not deploy a contract.
