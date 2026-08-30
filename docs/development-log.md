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
