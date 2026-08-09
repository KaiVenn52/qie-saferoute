# QIE SafeRoute security report

Date: 2026-08-10  
Scope: frontend application, proof core, dependency tree, repository secrets, optional Solidity registry, build output  
Disposition: PASS for public testnet MVP; NOT approved for mainnet deployment

## Executive summary

No open critical, high, medium, or low dependency vulnerabilities were found in the application. Eight automated positive and negative tests pass, lint passes, and the production build succeeds. A signed-proof trust-boundary flaw found during review was corrected before release: the core verifier now validates that the signed EVM and qie1 values resolve to the same account, rather than leaving that check to the UI.

## Controls verified

- No private key, seed phrase, API token, deployment key, mainnet RPC secret, or environment file is present.
- No transfer, approval, custody, or mainnet deployment path exists in the app.
- Address conversion validates checksum/encoding and exact 20-byte payload length.
- Proof verification checks the address pair, recovered signer, chain ID, issued-at bound, expiry, maximum lifetime, 32-byte nonce, and 65-byte signature.
- Encoded proof input is limited to 16 KiB and malformed input fails closed.
- Network addition is attempted only for wallet error code 4902; user rejection and other wallet failures propagate.
- The optional registry stores a proof hash, expiry, issuer, and revocation state only; it exposes no payable function or asset-moving operation.
- `npm audit` and `npm audit --omit=dev` both report zero vulnerabilities.
- Package signature verification completed successfully for the installed application dependency tree.

## Threat model summary

| Threat | Mitigation | Residual risk |
| --- | --- | --- |
| Signed mismatched address pair | Core equality check after deterministic conversion | Compromised wallet may still sign malicious data. |
| Replay/indefinite proof | Nonce, issued-at, expiry, chain ID, and seven-day maximum lifetime | Integrators must enforce intended audience/context outside this narrow proof. |
| Oversized/malformed proof | 16 KiB limit and schema/type validation | Browser resource exhaustion remains possible at the normal web-page level. |
| Wallet/network manipulation | Exact chain ID and constrained network-add fallback | User can still approve the wrong prompt in a compromised wallet. |
| False trust interpretation | UI states that control is not identity, reputation, or transaction safety | Downstream integrators may omit the disclaimer. |

## Mainnet gate

The Solidity source compiles under Solidity 0.8.24, but it has not received an independent audit and has not been deployed. Mainnet deployment remains blocked pending an explicit competition requirement, a funded wallet decision by the owner, bytecode/source verification, and a separate deployment review.
