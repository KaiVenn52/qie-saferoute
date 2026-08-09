# Hackathon submission draft

## Project name

QIE SafeRoute

## One-liner

A non-custodial payment preflight SDK that resolves QIE's 0x/qie1 address pair and verifies recipient wallet control before funds move.

## Problem

QIE exposes both EVM and Cosmos-compatible surfaces. Users and integrators encounter `0x…` and `qie1…` account formats across faucets, wallets, explorers, APIs, and payment fields. A valid-looking address can still be the wrong representation for an integration, and copy-pasted address pairs do not prove that the recipient controls the wallet.

## Solution

SafeRoute gives any QIE application one preflight step:

1. validate either address format locally;
2. resolve the matching dual representation;
3. optionally verify a short-lived EIP-712 proof signed by the recipient;
4. share or embed the result as JSON/QR without holding funds.

## QIE integration points

- QIE Testnet chain ID 1983 and official testnet RPC metadata
- QIE bech32 `qie` account prefix
- Ethermint/EVM 20-byte account representation
- injected QIE Wallet/MetaMask EIP-712 signing
- optional Solidity proof-hash registry deployable to QIE Testnet

## What is working

- responsive reference web app
- tested 0x ↔ qie1 resolver using a public QIE genesis account
- wallet-connect and QIE Testnet switch flow
- signed 24-hour control proof
- local proof verification and QR/JSON sharing
- non-custodial registry contract source

## Differentiation

SafeRoute is not a wallet, checkout, invoice system, transaction simulator, or identity/KYC product. It is a QIE-native integration safety primitive focused on the chain's dual-address edge case and payment proof workflow.

## Business and traction

The open-source SDK targets wallets, exchanges, bridges, and merchant payment apps. In 90 days we will seek three retained integrations, two thousand route checks, a median integration time below 30 minutes, and evidence that partner address-format support cases decline.

## Security statement

SafeRoute never requests a private key, never moves funds, and never claims a recipient is trustworthy. A valid proof only establishes control of the stated address pair during the proof lifetime. The MVP is testnet-first; no mainnet deployment or spend has been performed.

## Demo flow

Paste either a QIE `0x…` or `qie1…` address → resolve both representations → connect the recipient wallet → sign a 24-hour proof → copy the QR/JSON → verify it in the second tab.

## Requested milestone framing

- Milestone 1: audited resolver, proof schema, testnet reference app, public SDK and documentation.
- Milestone 2: two external testnet integrations, proof revocation, expanded test vectors, usage evidence and production readiness review.

Do not submit this draft or deploy to mainnet without explicit user approval.
