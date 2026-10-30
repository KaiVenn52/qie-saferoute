# QIE SafeRoute threat model

## Assets

- recipient's intended QIE account representation
- payment context: network, asset, amount, order reference and destination
- recipient signature and its short validity window

## Protected actions

1. Detect a `0x` / `qie1` pair that does not represent the same 20 bytes.
2. Detect a signature made by an account other than the stated recipient.
3. Detect a signed intent modified after approval.
4. Limit accidental reuse with a short expiry, nonce, audience and order reference.

## Explicit non-goals

- proving a person's identity or that a merchant is trustworthy
- detecting malware, a compromised wallet, or a malicious recipient
- guaranteeing transaction inclusion, settlement or delivery
- custody, swaps, transfers, KYC or recovery of funds

## Integrator obligations

- use `expectedAudience` and `expectedReference` on every production verification;
- pin `expectedAmount`, `expectedAsset`, `expectedDecimals` and `expectedRecipientEvm` to the values you are about to display or charge, so a substituted field fails closed instead of merely being visible;
- keep a server-side used-nonce or order state when one-time use is required;
- independently validate token decimals and contract allowlists;
- display the signed amount, asset, route and purpose before the user signs;
- treat expiry, chain changes and wallet-account changes as a hard failure;
- do not call the result “safe payment” or “guaranteed recipient.”

## Registry boundary

- the registry stores a canonical EIP-712 digest, expiry and revocation state only;
- the recipient signer must submit its own anchor transaction;
- the contract does not verify the EIP-712 signature or payment settlement;
- `isActive` means an unexpired, non-revoked anchor exists for that signer, not that an order is unused;
- integrators still need their own consumed-nonce or order state for one-time execution;
- **revocation is final per digest.** `anchor` reverts with `AlreadyRevoked` rather than clearing the revocation bit, so a verifier may treat `revoked` as monotonic. Restarting a flow requires a new intent with a new nonce;
- the contract cannot see the signed intent, so it cannot enforce that the anchored `expiresAt` equals the signed `expiresAt`. Pass the signed value (the SDK helper `paymentIntentAnchorArguments` does this) and never extend an anchor beyond the signed lifetime;
- the contract cannot distinguish “never anchored”, “revoked” and “expired”. It returns `false` for all three.

## EIP-712 domain binding

The domain is `{ name: 'QIE SafeRoute', version: '2', chainId }`. It deliberately does **not** include `verifyingContract`, because the registry is optional and the SDK must produce the same digest whether or not a registry is deployed on that chain. The consequence is that any application on the same chain can declare an identical domain.

Residual risk is bounded by the signed payload rather than by the domain: `chainId` prevents cross-network reuse, and `audience` plus `reference` are signed, so an intent signed for one verifier or order is rejected by any other verifier that supplies its own `expectedAudience`/`expectedReference`. This makes the omission acceptable **only** for integrators that pass those expectations; an integrator that calls `verifyPaymentIntent` with no expectations loses that protection.

If a future version adds `verifyingContract` or a fixed `salt`, the domain separator changes and every existing v2 digest becomes invalid. That decision must be taken **before** any digest is anchored on QIE Mainnet, since the contract is immutable.

## Dependency audit — 2026-10-30

After compatible dependency updates, the full `npm audit` reports five high-severity affected package groups, all tracing to the single Zod advisory [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5). The initial full audit had ten affected groups (eight high, two moderate), including separate Vite, Vitest, source-map-js and undici findings; those other groups no longer appear after the update. Counts refer to affected dependency groups, not independent root vulnerabilities.

`npm audit --omit=dev` reports one high-severity group, Zod. Installed Zod 3.25.76 is shared by Hardhat tooling and the abitype peer dependency path. Hardhat 3.21.2 and hardhat-zod-utils 3.0.8 still require Zod `^3.23.8`, while the advisory lists 4.6.6 as the first patched version. No cross-major Zod override has been forced. The deployed artifact is a static browser app, but that does not clear the dependency finding. This release is not a security audit or a production-readiness certification; a compatible upstream fix or separately verified toolchain migration remains required.

Registry bytecode checks are keyed by both chain ID and contract address. Changing networks immediately treats the old result as unknown; delayed responses from an earlier effect are ignored. A local browser regression with intercepted RPC responses covers a successful check on one chain followed by a pending and then empty-bytecode result at the same address on another chain. This injected test does not establish a deployment or verify a public contract.
