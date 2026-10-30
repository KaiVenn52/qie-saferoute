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

For a read-only network estimate, configure only the public deployer address. No private key is required and the default command cannot broadcast:

```powershell
$env:QIE_DEPLOYER_ADDRESS='0xYOUR_PUBLIC_DEPLOYER_ADDRESS'
npm run contracts:deploy:testnet
npm run contracts:deploy:mainnet
```

Configure the deployer key only in the participant's local terminal environment when an actual deployment has been approved. Never paste it into chat, source files, `.env`, screenshots, recordings, or the repository.

```bash
npm run contracts:deploy:testnet
npm run contracts:deploy:mainnet
```

Those commands remain estimates unless `QIE_BROADCAST=yes` is deliberately set. Broadcasting also refuses to start without a configured private key. Mainnet additionally requires `QIE_MAINNET_CONFIRM=QIE_MAINNET_1990`. Before that final action, verify:

1. the printed chain is `QIE Mainnet (1990)`;
2. the printed deployer is the intended public wallet;
3. balance exceeds twice the printed estimated deployment fee;
4. the exact source and compiled tests are final;
5. the frontend is ready to use the resulting address;
6. the transaction can be recorded for the explorer and submission video.

After a successful deployment, record the contract address, transaction hash, explorer link, commit SHA and frontend configuration. Do not claim deployment from console text alone; reopen the explorer and the public app independently.

## Publishing the reference app

The repository contains `.github/workflows/deploy-pages.yml`, which builds the app and publishes it with `actions/deploy-pages`. That action **requires** Settings → Pages → Source to be set to **"GitHub Actions"**.

The initial site was published from `gh-pages`. The Payment Intent v2 release switches Pages to the GitHub Actions source so the validated `main` build is published automatically. A successful old branch deployment does not establish that the latest source is live.

Choose one:

1. **GitHub Actions source (preferred).** Set Pages → Source to "GitHub Actions". Pushing `main` then republishes automatically.
2. **Branch source.** Delete the workflow and push a freshly built `dist/` to `gh-pages` manually.

The site hostname follows the repository owner's username. If the account is renamed, the old `*.github.io` URL stops resolving and every published link must be updated.

Registry addresses must be present at build time. Set `VITE_QIE_TESTNET_REGISTRY_ADDRESS` / `VITE_QIE_MAINNET_REGISTRY_ADDRESS` as repository variables so the workflow can inject them; otherwise the deployed bundle disables the on-chain controls permanently. The UI additionally checks for deployed bytecode before enabling anchor or revoke, so a mistyped or undeployed address fails closed.

Finally, open the published URL in a private window and confirm the served bundle is the current build, not an earlier one. Comparing a distinctive string from the new build against the deployed JavaScript asset is a quick check.

### Stale build output

`npm run build` begins with `npm run clean`, which deletes `dist/` and `dist-sdk/`. This is required because Vite 8.2.1 (rolldown) does not currently honour `build.emptyOutDir` — verified by testing both the config option and the `--emptyOutDir` CLI flag — and `tsc` never removes output for deleted source files. Without the clean step, a branch-based `gh-pages` deploy keeps uploading superseded hashed bundles and a stale file can survive into the published npm package.

Known environment caveat: on Windows with the repository inside a OneDrive-synced folder, Node's `fs.rmSync` was observed to return success without deleting anything, so `npm run clean` has no effect locally even though it exits 0. This was isolated to the OneDrive path — the same call works correctly in a normal directory and on the Ubuntu CI runner. If you build locally in a OneDrive folder, remove the output first:

```powershell
Remove-Item dist, dist-sdk -Recurse -Force
npm run build
```

The GitHub Actions path is unaffected because each run starts from a fresh checkout.
