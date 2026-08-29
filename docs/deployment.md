# QIE deployment runbook

The hackathon's final eligibility check requires a live QIE Mainnet deployment. Development and wallet-flow rehearsal should still happen on QIE Testnet first. This repository does not contain a deployer key and must never receive a seed phrase.

## Network targets

| Environment | Chain ID | RPC | Purpose |
| --- | ---: | --- | --- |
| Local Hardhat | 31337 | in-process | compile, tests and cost rehearsal |
| QIE Testnet | 1983 | `https://rpc1testnet.qie.digital/` | wallet and explorer rehearsal |
| QIE Mainnet | 1990 | `https://rpc1mainnet.qie.digital/` | final eligible deployment |

The RPC and chain ID are authoritative for network selection. Wallets and QIE surfaces have used both `QIE` and `QIEV3` labels for the native gas balance; this project does not treat `QIEV3` as a separate token contract.

## Safe rehearsal

```bash
npm run contracts:test
npm run contracts:deploy:local
```

The local deployment command estimates the exact compiled bytecode and exits before broadcasting. Network commands behave the same unless `QIE_BROADCAST=yes` is deliberately set.

## Testnet, then mainnet

Configure the deployer key only in the participant's local terminal environment. Never paste it into chat, source files, `.env`, screenshots, recordings, or the repository.

```bash
npm run contracts:deploy:testnet
npm run contracts:deploy:mainnet
```

Those commands are estimates only. Broadcasting is an explicit participant-controlled action. Mainnet additionally refuses to send unless `QIE_MAINNET_CONFIRM=QIE_MAINNET_1990` is present. Before that final action, verify:

1. the printed chain is `QIE Mainnet (1990)`;
2. the printed deployer is the intended public wallet;
3. balance exceeds twice the printed estimated deployment fee;
4. the exact source and compiled tests are final;
5. the frontend is ready to use the resulting address;
6. the transaction can be recorded for the explorer and submission video.

After a successful deployment, record the contract address, transaction hash, explorer link, commit SHA and frontend configuration. Do not claim deployment from console text alone; reopen the explorer and the public app independently.
