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
import {
  analyzeAddress,
  hashPaymentIntent,
  paymentIntentAnchorArguments,
  paymentIntentRegistryAbi,
  verifyPaymentIntent,
} from 'qie-saferoute-sdk'
```

## Verify at checkout

```ts
const result = await verifyPaymentIntent(intent, {
  expectedAudience: merchantWallet,
  expectedReference: order.id,
  expectedRecipientEvm: order.recipient,
  expectedAsset: order.asset,
  expectedAmount: order.amountBaseUnits,
  expectedDecimals: order.decimals,
})

if (!result.valid) {
  throw new Error(result.reason ?? 'Payment intent rejected')
}

// Only the host application decides how and when to start its payment flow.
showWalletPaymentButton()
```

The verifier checks the QIE address pair, signature, chain, asset, amount, decimals, expiry, nonce, destination type and signed strings. `expectedAudience` and `expectedReference` are application-level replay boundaries and should be supplied by every production integrator. `expectedRecipientEvm`, `expectedAsset`, `expectedAmount` and `expectedDecimals` let the host pin the exact payment it is about to display, so a substituted recipient, asset or amount fails closed rather than merely being visible. `expectedAmount` accepts base units as a decimal string or `bigint`.

## Optional onchain anchor

The registry key is the same canonical EIP-712 digest used by the verifier. This avoids an integrator inventing a second hash format:

```ts
const [intentHash, expiresAt] = paymentIntentAnchorArguments(intent)

await walletClient.writeContract({
  address: registryAddress,
  abi: paymentIntentRegistryAbi,
  functionName: 'anchor',
  args: [intentHash, expiresAt],
})

console.log(hashPaymentIntent(intent) === intentHash) // true
```

The recipient must anchor from the same address that signed the intent. Anchoring makes the digest and expiry discoverable and allows that signer to revoke it; it does not validate the signature or make the intent single-use.

Pass the **signed** `expiresAt` (as `paymentIntentAnchorArguments` does). The contract cannot see the intent, so it cannot check this for you, and an anchor that outlives the signed lifetime would misrepresent how long the intent is valid.

Revocation is final per digest: re-anchoring a revoked intent reverts with `AlreadyRevoked`, so a verifier can treat `revoked` as a monotonic signal. To restart, issue a new intent with a new nonce.

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

SafeRoute does not attest to identity, delivery, creditworthiness, or payment finality. A signed intent is not a transaction and should never be presented as a guarantee that funds will arrive. Encoded payloads support UTF-8 merchant references and purpose text, with a fixed size limit to prevent unbounded QR/import payloads.
