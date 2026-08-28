# Hackathon submission draft

## Project name

QIE SafeRoute

## One-liner

A non-custodial payment-intent preflight SDK that binds QIE's 0x/qie1 route, payment context and recipient wallet control before funds move.

## Problem

QIE exposes both EVM and Cosmos-compatible surfaces. Users and integrators encounter `0x…` and `qie1…` account formats across faucets, wallets, explorers, APIs, and payment fields. A valid-looking address can still be the wrong representation for an integration, and copy-pasted address pairs do not prove that the recipient controls the wallet.

## Solution

SafeRoute gives any QIE application one preflight step:

1. validate either address format locally;
2. resolve the matching dual representation;
3. sign a short-lived EIP-712 Payment Intent covering network, asset, amount, order, verifier and destination;
4. verify the exact context locally or on a server before the host app shows its own payment action;
5. share or embed the result as JSON/QR without holding funds.

## QIE integration points

- QIE Testnet chain ID 1983 and Mainnet chain ID 1990 metadata
- QIE bech32 `qie` account prefix
- Ethermint/EVM 20-byte account representation
- injected QIE Wallet/MetaMask EIP-712 signing
- optional Solidity PaymentIntentRegistry anchor/revoke contract

## What is working

- responsive reference web app
- tested 0x ↔ qie1 resolver using a public QIE genesis account
- wallet-connect and QIE Testnet switch flow
- context-bound 30-minute Payment Intent proof
- local proof verification and QR/JSON sharing
- tested non-custodial registry contract source
- publish-ready TypeScript SDK output with declaration files

## Differentiation

SafeRoute is not a wallet, payment processor, invoice system, transaction simulator, or identity/KYC product. It is a QIE-native integration primitive that makes the exact payment context machine-verifiable before a host application pays.

## Business and traction

The open-source SDK targets wallets, exchanges, bridges, and merchant payment apps. In 90 days we will seek three retained integrations, two thousand route checks, a median integration time below 30 minutes, and evidence that partner address-format support cases decline.

## Security statement

SafeRoute never requests a private key, never moves funds, and never claims a recipient is trustworthy. A valid intent establishes control of the stated address pair and agreement with the signed payment context during the proof lifetime. No mainnet deployment or spend has been performed.

## Demo flow

Enter a QIE `0x…` or `qie1…` recipient, amount, asset and order → preview the complete intent → connect the recipient wallet → sign → copy the QR/JSON → verify it in the second tab.

## Requested milestone framing

- Milestone 1: audited resolver, proof schema, testnet reference app, public SDK and documentation.
- Milestone 2: two external testnet integrations, proof revocation, expanded test vectors, usage evidence and production readiness review.

Do not submit this draft or deploy to mainnet without explicit user approval.
