# QIE SafeRoute development log

This is a factual, human-readable record of the engineering decisions behind the hackathon build. It is not a replacement for Git history.

## 2026-08-10 — initial MVP

- Chose a QIE-specific dual-address preflight instead of a generic wallet, invoice or transaction simulator.
- Implemented local bech32/EVM conversion, EIP-712 route proof and a non-custodial reference UI.
- Added resolver and proof tests before public demo work.

## 2026-08-28 — Payment Intent v2

- Reviewed the hackathon's mainnet, real-user, originality and 90-day traction requirements.
- Bound amount, asset, order reference, intended verifier, destination type and purpose into the signed message.
- Added negative tests for context substitution and audience/reference replay.
- Replaced the single-anchor registry with a multi-intent anchor/revoke registry and added local Hardhat tests.
- Added a publish-ready TypeScript SDK build and a merchant checkout reference flow.
- Kept mainnet deployment and all external submissions gated pending organizer clarification and explicit approval.

## 2026-08-30 — registry-connected reference flow

- Closed the gap between the tested registry contract and the reference frontend.
- Added environment-gated Testnet/Mainnet registry addresses so an unverified address cannot silently appear in a build.
- Added live `isActive` reads plus explicit recipient-wallet anchor and revoke transactions using the SDK's canonical digest.
- Kept payment and registry actions separate: registry writes require wallet approval and gas but cannot transfer payment funds.
- Verified a locally signed Payment Intent in the real UI and checked the new lifecycle panel at desktop and 390 px mobile width.
- Left both chain addresses unconfigured because no explorer-verified deployment has been performed.
- Removed the private-key requirement from read-only network estimates; a public deployer address is now sufficient until an explicitly approved broadcast.

## 2026-09-21 — independent review and hardening

- Ran an independent read-only review of the repository, git history, contract, EIP-712 schema, registry digest path, frontend and public artifacts. Findings are recorded in [`docs/independent-review-2026-09-21.md`](independent-review-2026-09-21.md).
- Verified the `0x` ↔ `qie1` resolver against QIE's own infrastructure rather than only against the repository's test fixture: the official chain registry declares `bech32_prefix: "qie"`, `slip44: 60` and `ethsecp256k1`; `api.qie.digital` returns an `ethermint.types.v1.EthAccount` for the genesis `qie1…` address; and both the Cosmos bank balance and the mainnet explorer balance for the corresponding `0x` account report the identical value. This upgraded the resolver from self-consistent to independently corroborated.
- Made revocation final in `PaymentIntentRegistry`: `anchor` now reverts with `AlreadyRevoked` instead of clearing the revocation bit, so a verifier can treat `revoked` as a monotonic signal. Added positive tests for expiry refresh and negative tests for re-anchoring a revoked digest.
- Extended `verifyPaymentIntent` with `expectedRecipientEvm`, `expectedAsset`, `expectedAmount` and `expectedDecimals` so an integrator can pin the payment it is about to display instead of only the audience and reference. Added positive and negative tests.
- Made the registry controls genuinely fail closed: the UI now checks for deployed bytecode at the configured address before enabling anchor/revoke, so a syntactically valid but undeployed address cannot enable the buttons.
- Corrected two pieces of UI copy that overstated guarantees: the signature is now described as created (not verified) locally, and `isActive` is described as an unexpired, non-revoked anchor rather than on-chain signature verification.
- Removed the dead `RouteProof` v1 module and its five tests. It was not exported by the SDK, not imported by the app and excluded from the SDK build. Test counts shown in the UI and docs are now accurate.
- Fixed public artifacts: the README and submission package pointed at `kangming0602.github.io`, which 404s because the GitHub account was renamed to `KaiVenn52`; Pages serves the site from the new hostname. Corrected stale test counts and the dependency-audit claim in the published security report, which now carries a superseded banner and an amendment.
- Documented the GitHub Pages source mismatch: the workflow uses `actions/deploy-pages`, which requires Pages to be set to the GitHub Actions source, while the site is currently published from the `gh-pages` branch. Recorded in [`docs/deployment.md`](deployment.md).
- No deployment, broadcast, push or submission was performed in this pass.

## 2026-10-30 — original repository release preparation

- Continued this original repository; the separate qie3-saferoute implementation is not part of this release.
- Validated lint, 12 SDK tests, 5 contract tests, production app/SDK builds and the package dry run. Removed-v1 output is absent from the fresh SDK distribution.
- Exercised desktop 1440x1100 and mobile 390x844 browser flows: unsigned preview, malformed recipient/proof rejection, network switching and missing-wallet handling. Eight checks passed with no console/runtime errors and no mobile horizontal overflow. No wallet signing or chain write was performed.
- Clarified that a valid signature alone does not establish the payer's expected order, amount or verifier.
- Added SDK/contract validation before Pages publication and prepared the switch from legacy gh-pages hosting to GitHub Actions.
- Disclosed the current Zod advisory in the threat model. No mainnet contract address, paid operation or hackathon submission is claimed.

## 2026-10-30 — compatible dependency maintenance

- Updated the lockfile within declared dependency ranges, including Vite 8.3.5, Vitest 4.1.12 and Hardhat 3.21.2. The full audit fell from ten affected package groups to five; all remaining groups trace to the Zod advisory. Production-only audit still reports one Zod group. No vulnerability suppression or forced cross-major override was applied.
- Bound registry bytecode results to chain ID and address, eliminating synchronous effect resets and preventing reuse of a previous network's successful result while the new network is being checked.
- Upgraded Pages workflow actions to verified official release tags: checkout 7.0.1, setup-node 7.1.0, upload-pages-artifact 5.0.0 and deploy-pages 5.0.1.
- Revalidated SDK and contract tests, builds and package contents. Browser regression uses intercepted provider reads and synthetic locally signed intents only; it does not sign a wallet transaction, send funds or establish deployment.
