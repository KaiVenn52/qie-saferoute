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
- keep a server-side used-nonce or order state when one-time use is required;
- independently validate token decimals and contract allowlists;
- display the signed amount, asset, route and purpose before the user signs;
- treat expiry, chain changes and wallet-account changes as a hard failure;
- do not call the result “safe payment” or “guaranteed recipient.”
