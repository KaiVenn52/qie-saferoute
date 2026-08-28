# Payment Intent SDK integration

SafeRoute is designed to sit immediately before a payment action. The merchant, wallet, exchange or bridge creates a typed intent; the recipient signs it; the integrator verifies the exact context before displaying its own payment action.

## Install from a local pack

The package is currently publish-ready, not yet released to npm:

```bash
npm run build:sdk
npm pack --dry-run
```

Once published, the import surface is:

```ts
import { analyzeAddress, verifyPaymentIntent } from 'qie-saferoute-sdk'
```

## Verify at checkout

```ts
const result = await verifyPaymentIntent(intent, {
  expectedAudience: merchantWallet,
  expectedReference: order.id,
})

if (!result.valid) {
  throw new Error(result.reason ?? 'Payment intent rejected')
}

// Only the host application decides how and when to start its payment flow.
showWalletPaymentButton()
```

The verifier checks the QIE address pair, signature, chain, asset, amount, expiry, nonce, destination type and signed strings. `expectedAudience` and `expectedReference` are application-level replay boundaries and should be supplied by every production integrator.

## Intent fields

| Field | Why it is signed |
| --- | --- |
| `recipientEvm`, `recipientQie` | Prevents a wrong-format or mismatched route |
| `chainId` | Prevents cross-network replay |
| `asset`, `assetSymbol`, `amount`, `decimals` | Prevents amount or asset substitution |
| `reference` | Binds the proof to one order or withdrawal |
| `audience` | Identifies the intended merchant/app verifier |
| `destinationType`, `purpose` | Makes the user-visible context explicit |
| `issuedAt`, `expiresAt`, `nonce` | Limits lifetime and separates requests |

## Safety limits

SafeRoute does not attest to identity, delivery, creditworthiness, or payment finality. A signed intent is not a transaction and should never be presented as a guarantee that funds will arrive.
