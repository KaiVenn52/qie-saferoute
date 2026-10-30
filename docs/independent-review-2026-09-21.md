# QIE SafeRoute — 独立审查报告

- 审查日期：2026-09-21
- 审查范围：只读审查 + 只读验证。**未执行**任何注册、推送、发布、链上广播、主网部署或比赛提交。
- 本地仓库：`C:\Users\Dell2u\OneDrive\Documents\X创作\qie-saferoute`
- 本地 HEAD：`cceb9d5`（main）
- 远程 main：`786fd17`（落后本地 3 个提交）
- 公开仓库：https://github.com/KaiVenn52/qie-saferoute （`private: false`）
- 敏感信息：本次审查**未**索取、读取、保存或输出任何私钥或助记词。

---

## 0. 五种状态的诚实区分

这是本次审查最重要的一节。五种状态**互不等价**，此前简报中把其中若干项混为一谈。

| 状态 | 结论 | 证据 |
| --- | --- | --- |
| **local working** | ✅ 是 | `npm run validate` 退出码 **0**；15 个 Vitest + 3 个合约测试通过；Vite 构建、SDK 构建、`npm pack` 23 文件全部通过 |
| **remotely published** | ⚠️ 部分 | 仓库公开，但远程 main 停在 `786fd17`（2026-08-10）。v2 SDK + Registry 生命周期**不在远程** |
| **on-chain verified** | ❌ 否 | 测试网/主网均无部署；两个网络余额均为 0；无合约地址、无交易哈希 |
| **publicly accessible** | ✅ 是（**已更正**） | `https://kaivenn52.github.io/qie-saferoute/` → **HTTP 200**。但它服务的是 8 月 v1 构建 |
| **submitted** | ❌ 否 | 未发现任何提交证据 |

### 0.1 对简报的重要更正：公开 demo 是活的

简报称「计划中的公开网址 HTTP 404，因此不能声称公开 demo 已上线」。实测：

| URL | 结果 |
| --- | --- |
| `https://kangming0602.github.io/qie-saferoute/` | **404** — Site not found |
| `https://kaivenn52.github.io/qie-saferoute/` | **HTTP 200** — 返回 `<title>QIE SafeRoute — Verify the route, then pay</title>` |

**404 的根因**：GitHub 账号被改名（`kangming0602` → `KaiVenn52`）。GitHub Pages 的站点主机名跟随用户名，因此**旧 URL 失效、新 URL 生效**。这不是「没有发布」，而是「旧链接失效」。

GitHub API 证实 Pages 确实启用：`has_pages: true`，并存在两条 `pages build and deployment` 运行记录（`gh-pages` 分支，2026-08-09 / 2026-08-12，均 success）。

> 结论修正：**公开 demo 是「已上线但内容过期」**，而不是「未上线」。这同时意味着现在有一个**指向 404 的公开链接**在 README 里（见 F-01）。

---

## 1. 已重新执行的工程验证

```
npm.cmd run validate
```

| 阶段 | 结果 |
| --- | --- |
| oxlint | 0 warnings, 0 errors（16 files, 104 rules） |
| Vitest | 3 files / **15 tests** passed |
| 合约测试 | **3 passing** |
| TypeScript (`tsc -b`) | 通过 |
| Vite production build | 通过 |
| SDK build (`dist-sdk`) | 通过 |
| `npm pack --dry-run` | 通过，**23 files**，`qie-saferoute-sdk@0.1.0` |
| **退出码** | **0** |

**关于退出码的澄清**：首次以 `pwsh -Command` 捕获输出时得到 `[exit code: 1]`。经复测（`cmd /c "npm.cmd run validate > nul 2>&1 & echo VALIDATE_EXIT=%ERRORLEVEL%"`）确认为 **`VALIDATE_EXIT=0`**。之前的 1 是 PowerShell 把 npm 写到 stderr 的 `Unknown env config "side-effects-cache"` 警告当成 `NativeCommandError` 所致，**不是测试失败**。

Git 状态复现：

```
## main...origin/main [ahead 3]
cceb9d5 (HEAD -> main) Connect SafeRoute registry lifecycle
2aca105 Harden QIE registry deployment path
f3eff24 Build QIE Payment Intent preflight SDK
786fd17 (origin/main) Build QIE SafeRoute hackathon MVP
```

另有本地分支 `gh-pages` → `698b7b1 Deploy QIE SafeRoute demo`。

---

## 2. 核心正确性：`0x ↔ qie1` 解析已独立验证 ✅

这是整个产品的技术地基，因此我用**三个独立于本仓库代码**的 QIE 官方来源交叉验证，而不是只信任仓库自己的测试常量。

| 来源 | 观察 |
| --- | --- |
| QIE 官方 Cosmos/Ethermint REST：`https://api.qie.digital/cosmos/auth/v1beta1/accounts/qie12amp0xvls6tpf85tdctk4wzqfhmzhtnd2xkqdm` | 返回 `@type: /ethermint.types.v1.EthAccount`，`address` 即为该 `qie1…` |
| 同上，bank 余额 | `{"denom":"aqie","amount":"1099976375000000000"}` |
| QIE 主网 Explorer：`https://mainnet.qie.digital/api/v2/addresses/0x577617999f8696149e8b6e176ab8404df62bae6d` | `coin_balance: "1099976375000000000"`，`is_contract: false` |
| 官方 chain registry `qieadmin/chain-registry` → `qie/chain.json` | `bech32_prefix: "qie"`、`slip44: 60`、`key_algos: ethsecp256k1`、denom `aqie` |
| 独立 bech32 解码（不经本仓库代码） | `prefix=qie bytes=20 hex=0x577617999f8696149e8b6e176ab8404df62bae6d` |

**两侧余额完全相同（`1099976375000000000`）**，且 `0x5776…ae6d` 是主网上真实存在、有余额的非合约账户。

> **结论**：`evmToQie` / `qieToEvm` 的编码方案（bech32 + 20 字节 payload + `qie` 前缀）**与 QIE 官方实现一致**，`analyzeAddress` 的往返一致性成立。这不再是「自证」，而是有官方基础设施背书的事实。
>
> 附带确认：`App.tsx` 中的 `DEMO_ADDRESS` 与测试里的 `GENESIS_EVM` 是同一个真实主网账户，不是编造值。

---

## 3. 智能合约审查：`contracts/PaymentIntentRegistry.sol`

```solidity
uint64 public constant MAX_LIFETIME = 7 days;
mapping(address signer => mapping(bytes32 intentHash => IntentAnchor)) public anchors;
function anchor(bytes32 intentHash, uint64 expiresAt) external
function revoke(bytes32 intentHash) external
function isActive(address signer, bytes32 intentHash) external view returns (bool)
```

### 3.1 已验证的良好边界 ✅

- **不接收、不转移资金**：无 `payable`、无 `call`、无 `transfer`、无 `approve`。已确认。
- **无外部调用** → 无重入面。
- **无 `selfdestruct`、无 `delegatecall`、无代理/可升级逻辑** → 部署后语义不可变。
- **按 `msg.sender` 隔离**：`anchors[msg.sender][intentHash]`，第三方无法替他人 anchor。测试 `isolates anchors by signer` 覆盖。
- **`revoke` 只能撤销调用者自己的 anchor**：同样以 `msg.sender` 为键。
- **输入校验**：`intentHash == bytes32(0)` 拒绝；`expiresAt <= block.timestamp` 或 `> block.timestamp + 7 days` 拒绝。
- **7 天上限与 SDK 一致**：合约 `MAX_LIFETIME = 7 days` ↔ SDK `MAX_INTENT_LIFETIME_SECONDS = 7 * 24 * 60 * 60`。**完全一致**。
- **`isActive` 语义正确**：`expiresAt > block.timestamp && !revoked`。

### 3.2 F-04（中）— `revoke` 不是终局，anchor 可以「复活」已撤销的 intent

```solidity
anchors[msg.sender][intentHash] = IntentAnchor(expiresAt, false);  // 无条件把 revoked 重置为 false
```

`anchor()` 无条件覆写整个结构体。因此流程可以是：

1. signer 调用 `anchor(h, t)` → `isActive = true`
2. signer 调用 `revoke(h)` → `isActive = false`，verifier 收到 `IntentRevoked` 事件
3. signer **再次**调用 `anchor(h, t2)` → `revoked` 被重置为 `false` → `isActive` **重新变回 true**

**影响**：对于支付安全产品，「撤销」是一个应当单调的安全信号。任何按事件流或按状态缓存来做决策的集成方（例如「见过 revoke 就永久拒绝该 digest」）都会被这一步推翻。合约没有 `AlreadyRevoked` 保护（该 error 只用于 `revoke` 自身重复调用）。

**说明与克制**：撤销者与签名者是同一地址，因此这不是「攻击者越权」，而是**语义缺陷**：合约承诺的撤销语义弱于它给人的印象。严重度评为**中**，而非高。

**修复建议（任选其一）**：
- (a) 让撤销终局：在 `anchor()` 开头加 `if (anchors[msg.sender][intentHash].revoked) revert AlreadyRevoked();`
- (b) 保持可重新 anchor，但**明确文档化**「撤销可被同一 signer 重新激活」，并要求集成方以最新事件为准；
- (c) 分离语义：新增 `reanchor()`，让 `anchor()` 对已撤销 digest 直接 revert。

> ⚠️ **时序提示**：合约不可升级。**必须在主网部署之前**决定并修复，否则主网上会永久留下当前语义。

### 3.3 关于「链上 anchor 不等于签名验证」——文档已正确声明 ✅

`isActive(signer, hash) == true` 只证明「该 signer 地址 anchor 过这个 bytes32」，**不证明 signer 真的对该 intent 签过名**。合约看不到 EIP-712 签名，也无从验证。

`docs/threat-model.md` 已明确写出这一点：

> the contract does not verify the EIP-712 signature or payment settlement
> `isActive` means an unexpired, non-revoked anchor exists for that signer, not that an order is unused

**这是诚实且正确的**。但前端文案略有张力，见 F-08。

---

## 4. EIP-712 schema、重放保护、过期处理审查

### 4.1 Domain 与类型

```ts
paymentIntentDomain(chainId) = { name: 'QIE SafeRoute', version: '2', chainId }
```

签名覆盖字段（13 项）：`recipientEvm`, `recipientQie`, `asset`, `assetSymbol`, `amount`, `decimals`, `reference`, `audience`, `destinationType`, `purpose`, `issuedAt`, `expiresAt`, `nonce`。

### 4.2 已验证的防护 ✅

| 防护 | 实现 | 测试 |
| --- | --- | --- |
| 跨网络重放 | `chainId` 在 **domain** 中（符合 EIP-712 最佳实践） | — |
| 跨订单重放 | `reference` 被签名 + `expectedReference` 校验 | `rejects replay into another merchant or order` |
| 跨验证方重放 | `audience` 被签名 + `expectedAudience` 校验 | 同上 |
| 地址对不一致 | `evmToQie(recipientEvm) !== recipientQie` 直接拒绝 | `rejects edits to ... route` |
| 金额/资产替换 | `amount`/`asset`/`assetSymbol`/`decimals` 全部签名 | `rejects edits to amount, asset, ...` |
| 过期 | `expiresAt <= now` 拒绝 | `rejects expired ...` |
| 超长寿命 | `> 7 天` 拒绝 | `rejects ... oversized-lifetime` |
| 未来签发 | `issuedAt > now + 300s` 拒绝（时钟偏移容忍） | — |
| 重放分隔 | 32 字节 `nonce`（`crypto.getRandomValues`） | — |
| 载荷膨胀 | 24 KiB 上限 + base64url + `fatal: true` UTF-8 解码 | — |
| 签名格式 | `^0x[0-9a-fA-F]{130}$` | — |

**关键顺序正确**：`validateShape` 先于 `verifyTypedData` 执行，且 audience/reference 校验在签名验证之前 —— 失败快速、无多余密码学开销。

**Unicode 处理正确**：`订单-2048` / `咖啡设备订单` 的往返与验签均有测试覆盖，且 `TextEncoder`/`fatal` 解码避免了非法字节被静默接受。

### 4.3 F-06（中）— EIP-712 domain 缺少 `verifyingContract`

Domain 只有 `{name, version, chainId}`，没有 `verifyingContract`（也没有 `salt`）。因为签名是**离线验证**的（没有消费签名的合约），这意味着：

- 在**同一条链**上，任何自称 `QIE SafeRoute` v2 的应用都共享同一个 domain；
- 一个 intent 签名在 domain 层面可以被另一个集成方复用。

**现有缓解**：`audience` + `reference` 被签名，因此跨商户/跨订单复用已被阻断；用户签名时也能在钱包里看到字段。所以**这不是高危**，但缺少一层纵深防御。

**建议**：加入 `verifyingContract`（指向 Registry 地址）或固定 `salt`。**注意**：这会改变 domain separator，**使所有既有 v2 digest 失效**。因此：
- 若要做，**必须在主网 anchor 任何 digest 之前**做（可考虑升为 `version: '3'` 并保留 v2 验证兼容）。

### 4.4 F-05（中）— `verifyPaymentIntent` 无法让集成方「钉住」金额/资产/收款人

当前 options 仅支持：

```ts
{ now?, expectedAudience?, expectedReference? }
```

商户**无法**以编程方式断言「这笔付款必须是 12.50 QIE 给这个收款人」。验证器会返回 `valid: true` 只要**收款人确实签了某个 intent**——即使金额、资产或收款人被替换成另一个（收款人自己签的）值。

这是典型的**金额替换**缺口。虽然收款人签名本身就意味着同意该金额，但集成方缺少一个廉价的程序化断言点。

**建议**：扩展为 `expectedAmount` / `expectedAsset` / `expectedRecipientEvm` / `expectedDecimals`，并在 `validateShape` 之后、签名验证之前比较。

### 4.5 F-07（低/中）— 缺失的 `decimals` 交叉校验

`decimals` 被签名且被范围校验（0–36），但没有与 `asset` 合约的真实 `decimals()` 做交叉校验。`docs/threat-model.md` 已把它列为集成方义务（"independently validate token decimals"），**属于已声明的残留风险**，但值得在 UI/文档中更醒目地提示，因为 10^12 级别的小数位错误是支付场景最昂贵的错误。

---

## 5. Registry ↔ SDK canonical digest 一致性审查 ✅

这是任务清单第 4 项，结论是**完全一致**。

| 环节 | 代码 | 结论 |
| --- | --- | --- |
| 规范 digest 定义 | `registry.ts` → `paymentIntentRegistryKey(intent) = hashPaymentIntent(intent)` | 复用同一个 EIP-712 哈希，**没有第二套哈希格式** |
| anchor 参数 | `paymentIntentAnchorArguments(intent) = [paymentIntentRegistryKey(intent), BigInt(intent.expiresAt)]` | 传的是**被签名的** `expiresAt`，不是另算的值 |
| 前端读 | `isActive(intent.recipientEvm, paymentIntentRegistryKey(intent))` | signer 取 `recipientEvm` |
| 前端写 | `writeRegistry` 强制 `signer === intent.recipientEvm` | 与合约 `msg.sender` 隔离语义吻合 |
| 合约 | 把 `bytes32` 当不透明值存储 | 与「digest 由链下定义」的架构自洽 |
| ABI | `paymentIntentRegistryAbi` 与 Solidity 签名逐项对齐（`anchor`/`revoke`/`isActive`，含 `uint64`、`view`） | 一致 |
| 寿命上限 | 合约 `7 days` ↔ SDK `7 * 24 * 60 * 60` | 一致 |
| 测试 | `test/PaymentIntentRegistry.ts` 用真实 `hashPaymentIntent(...)` 作为 anchor 入参 | **端到端串联已验证** |

`docs/sdk-integration.md` 的说法（"The registry key is the same canonical EIP-712 digest used by the verifier"）**与代码相符**。

**唯一残留注意点**：合约无法强制「anchor 的 `expiresAt` == 被签名的 `expiresAt`」，因为合约看不到 intent。前端传的是签名值（正确），但第三方集成方可能传入不同值。这属于集成方义务，建议在 `docs/sdk-integration.md` 中显式点明。

---

## 6. 前端「看起来能用但实际没有真实链上连接」审查

### 6.1 已验证的诚实设计 ✅

- `registryAddress()`：未配置或格式非法时返回 `null` → **Check / Anchor / Revoke 三个按钮全部 `disabled`**。这是真正的 fail-closed。
- Registry 区块**仅在存在已签名 intent 时**渲染（`{intent && <div className="registry-zone">}`）。
- `Revoke` 仅在 `registryStatus === 'active'` 时可用；`Anchor` 在已 active 时禁用。
- 链上写入前调用 `ensureWalletNetwork()`，且仅在钱包错误码 **4902** 时尝试 `wallet_addEthereumChain`，其他错误原样抛出。
- 写操作等待 `waitForTransactionReceipt` 并检查 `receipt.status !== 'success'`。
- 文案明确区分：anchor 后提示 "Payment remains a separate wallet action."
- 无任何转账/发送按钮；`signTypedData` 不产生交易。
- 网络元数据（chainId 1983/1990、RPC、explorer）与官方一致。

### 6.2 F-09（中）— 「未经验证则禁用」只靠流程，未在代码中强制

简报与 README 称「未配置或**未经验证**时，链上按钮禁用」。代码实际只检查**地址格式**：

```ts
return configured && isAddress(configured) ? getAddress(configured) : null
```

**没有检查该地址上是否真的有已部署的字节码**（`getCode`）。若配置了一个格式合法但无合约的地址（或链不匹配），按钮会被**启用**，用户点击后交易会失败或变成一次无意义的转账。

「未经验证」目前只是 `docs/deployment.md` 里的人工作业规范，不是代码保证。

**建议**：在启用写按钮前加一次 `publicClient.getCode({ address })` 检查，返回 `'0x'` 则视为 `unavailable` 并禁用。

### 6.3 F-08（低/中）— 两处前端文案强于实际保证

1. `signIntent()` 成功后提示 **"Recipient signature verified locally."** —— 实际只是**生成**了签名，并未**验证**它。
2. `refreshRegistryStatus()` 提示 **"This signed intent is active in the on-chain registry."** —— 字面没错，但容易被读成「签名已在链上被验证」，而 `docs/threat-model.md` 明确说合约**不验证签名**。

**建议**：改为「签名已生成」与「该 digest 存在未过期、未撤销的 anchor（合约不验证签名）」。

### 6.4 F-10（低）— `isActive` 三态被压成一态

合约无法区分「从未 anchor」「已撤销」「已过期」，UI 统一显示 `inactive`。不影响安全，但降低可诊断性。

### 6.5 F-11（低）— UI 测试计数不准确

`App.tsx` 硬编码 **"13 SDK tests · 3 contract tests"**。实际为 **15** 个 Vitest（其中 5 个属于已废弃的 v1 `proof.ts`）+ 3 个合约测试。数字对不上任何组合，属于陈旧文案。

---

## 7. README / 提交文案夸大审查

整体评价：**这套文档的诚实度明显高于同类黑客松项目**，多处主动声明限制。以下为需要修正的具体点。

| 编号 | 位置 | 问题 | 严重度 |
| --- | --- | --- | --- |
| F-01 | **远程** `README.md`（judges 现在看到的） | `Live demo: <https://kangming0602.github.io/qie-saferoute/>` → **404** | **高** |
| F-02 | `docs/submission-package.html`（**已在远程公开**） | 同时给出 `github.com/kangming0602/...` 与 `kangming0602.github.io/...` 两个失效链接；并称 "eight passing automated tests"（实为 15+3） | 中 |
| F-03 | `.superstack/security-reports/qie-saferoute-2026-08-10.md`（**已在远程公开**） | 陈旧且现已不实：称 "`npm audit` and `npm audit --omit=dev` both report zero vulnerabilities"（实测全量树 **1 high + 2 moderate**）；称 "Eight automated tests"（实为 15+3）；描述的 `issuer` 字段属于**已被删除**的 `SafeRouteRegistry.sol` | 中 |
| F-12 | 本地 `README.md` | 结尾仍写 "Planned reference UI: https://kangming0602.github.io/..."，而该站点已实际存在于新用户名下 | 低 |

### 7.1 已核实为**不夸大**的部分 ✅

- 本地 README 第 49 行：*"No mainnet deployment or production transaction has been performed yet, and no address is claimed."* —— **与事实一致**。
- 本地 README 第 38 行：*"The package is publish-ready but has not been published to npm."* —— **与事实一致**（`npm pack --dry-run` 通过，未发布）。
- `docs/hackathon-submission.md` 第 55 行：*"No mainnet deployment or spend has been performed."* —— **一致**。
- `docs/final-product-review.md` 第 21 行与 `docs/product-decision.md` 第 87 行把 3 integrations / 2,000 checks 明确标注为 **targets, not current traction claims** —— **正确的诚实表述**。
- `docs/threat-model.md` 的 non-goals 与 integrator obligations 写得具体且可执行。

**未发现**任何宣称：已上主网、已发布 npm、已有真实用户/traction、已有第三方集成。

---

## 8. GitHub 远程 vs 本地 3 个提交

```
git diff --stat origin/main..main   →  33 files changed, 2909 insertions(+), 297 deletions(-)
```

关键差异：

- `A contracts/PaymentIntentRegistry.sol`（新增）
- **`D contracts/SafeRouteRegistry.sol`（删除）** ← 远程仍保留旧合约
- `A src/lib/paymentIntent.ts` + `.test.ts`（v2 intent，175 行）
- `A src/lib/registry.ts`、`A src/sdk/index.ts`、`A tsconfig.sdk.json`
- `A scripts/deploy-registry.ts`、`A hardhat.config.ts`、`A test/PaymentIntentRegistry.ts`
- `A .github/workflows/deploy-pages.yml`、`A .env.example`、`A LICENSE`
- `M src/App.tsx`（+500/-… 行，registry 生命周期）
- `M .gitignore`（新增 `.env`、`.env.*`、`.superstack`、`dist-sdk`、`artifacts`、`cache`）

提交作者与时间（全部落在比赛期 2026-08-01 → 2026-12-10 内）：

| Commit | 日期 | 作者 | 标题 |
| --- | --- | --- | --- |
| `786fd17` | 2026-08-10 | Wong Kang Ming | Build QIE SafeRoute hackathon MVP |
| `f3eff24` | 2026-08-28 | KaiVenn | Build QIE Payment Intent preflight SDK |
| `2aca105` | 2026-08-29 | KaiVenn | Harden QIE registry deployment path |
| `cceb9d5` | 2026-08-30 | KaiVenn | Connect SafeRoute registry lifecycle |

GitHub API 显示 `pushed_at: 2026-08-09T18:19:03Z` —— 远程自 8 月 9 日起**未再收到推送**。`license: null`（LICENSE 尚未推送）。

### 8.1 F-13（中）— 公开 `.gitignore` 不忽略 `.env`

远程 `.gitignore` 只含 `*.local`，**没有** `.env` / `.env.*`。本地（未推送）的 `.gitignore` 才补上了这两条。

**风险评估**：本地工作区的 `.gitignore` 已经是修好的版本，因此当前本地不会误提交 `.env`。但如果有人 clone 远程 main、创建 `.env` 并填入 `QIE_DEPLOYER_PRIVATE_KEY`，该文件**不会被忽略**。

**建议**：把 `.gitignore` 的改动**优先于任何密钥操作**推送；在任何情况下都不要把私钥写入仓库目录内的文件。

### 8.2 F-14（低）— `.superstack/` 已公开，且 `.gitignore` 无法取消跟踪

`git check-ignore` 确认 `.superstack` 现已被忽略，但两个文件**仍在版本控制中**，因此仍然公开：

- `.superstack/security-history.json`
- `.superstack/security-reports/qie-saferoute-2026-08-10.md`

忽略规则只影响未跟踪文件，不会取消已跟踪文件。

**建议**：要么有意保留（内容是诚实的，无敏感信息 —— 我确认其中**没有**私钥/助记词/API token），要么 `git rm --cached` 后重写。若保留，请先修正 F-03 中的不实声明。

### 8.3 密钥扫描结论 ✅

对全部已跟踪文件做了精确扫描（64-hex 私钥、助记词赋值、`sk-`/`ghp_`/`AKIA` token 模式），并检查了**全部 git 历史**中新增的文件名：

- **未发现**任何私钥、助记词、API token 或 `.env` 文件被提交。
- 唯一命中的 64-hex 字符串是 `0x…0001`、`0x…0002`、`0x…0003` —— 公开已知的测试用私钥，非真实密钥。
- 历史中唯一匹配敏感名的文件是 `.env.example`（占位符，无真实值）。

---

## 9. GitHub Pages 404 根因（任务第 8 项）

**根因：账号改名，不是未配置。**

证据链：

1. GitHub API：`has_pages: true`，`html_url: https://github.com/KaiVenn52/qie-saferoute`。
2. 存在 `gh-pages` 分支（`698b7b1`），且其构建产物正是线上所服务的文件（`assets/index-mrIIqwWA.js` 与 gh-pages 树中的文件名一致）。
3. Actions 运行记录 `total_count: 2`，**两条都是** `pages build and deployment`（`event: "dynamic"`，`path: "dynamic/pages/pages-build-deployment"`，`head_branch: "gh-pages"`，conclusion: success）。

第 3 条是决定性的：`dynamic/pages/pages-build-deployment` 是 GitHub 为**「Deploy from a branch」**模式自动创建的动态工作流。**因此 Pages 当前的数据源是 `gh-pages` 分支，而不是 GitHub Actions。**

### 9.1 F-15（高）— CI workflow 与 Pages 配置不兼容，推送后会失败

本地新增的 `.github/workflows/deploy-pages.yml` 使用：

```yaml
permissions: { contents: read, pages: write, id-token: write }
uses: actions/upload-pages-artifact@v3
uses: actions/deploy-pages@v4
```

`actions/deploy-pages` **要求**仓库的 Pages Source 设为 **"GitHub Actions"**。当前是 **"Deploy from a branch" → `gh-pages`**。因此一旦推送 main，`build` job 会成功，但 **`deploy` job 会失败**，且**线上站点不会更新**。

**修复（二选一）**：
- **(a) 推荐**：在 GitHub → Settings → Pages 把 Source 改为 **"GitHub Actions"**。之后推送 main 即自动发布 v2 构建。
- **(b) 保留分支模式**：删除该 workflow，改为本地 `npm run build` 后把 `dist/` 推到 `gh-pages`。

### 9.2 F-16（高）— 线上 demo 内容过期（v1），与提交叙述不符

对比线上 bundle 与本地当前构建：

| 探针字符串 | 线上 `index-mrIIqwWA.js` (291,802 B) | 本地 `index-KpNyH1KR.js` (378,992 B) |
| --- | --- | --- |
| `isActive` | **0** | 2 |
| `registry` | **0** | 12 |
| `expectedAudience` | **0** | 3 |
| `Revoke` | **0** | 1 |
| `Anchor` | 1（无关词） | 3 |
| `RouteProof`（v1 遗留） | **3** | 0 |

**结论**：线上公开 demo 是 **Payment Intent v2 之前**的版本 —— **没有** Registry 生命周期、**没有** audience/reference 绑定、**没有** SDK。而本地 v2 构建有。

对评委而言，**公开 demo 与提交材料描述的不是同一个产品**。叠加反滥用规则中的 **"No Working Demo → 立即取消资格"**，这是当前**最高优先级的对外风险**。

### 9.3 F-17（中）— CI 构建不注入 Registry 地址

`deploy-pages.yml` 的 `npm run build` 步骤没有传入 `VITE_QIE_TESTNET_REGISTRY_ADDRESS` / `VITE_QIE_MAINNET_REGISTRY_ADDRESS`。因此**即使完成主网部署**，GitHub Actions 构建出的公开站点仍会因「未配置」而**禁用全部链上按钮** —— 评委将看不到 anchor/revoke 的真实链路。

**建议**：在 workflow 中通过 `env:`（来自 Repository Variables 或 Secrets）注入这两个变量后再 build。

---

## 10. 官方资料复核与规则冲突

### 10.1 已核实（2026-09-21 实测）

**官方主页** `https://hackathon.qie.digital/`：

- 标题：**QIE Hackathon 3.0 · 2026 · Mainnet Edition**
- Build window：**Aug 1 – Dec 10, 2026**
- 提交截止：**Nov 30, 2026**；Demo Week：**Dec 1–5**；Winners：**Dec 10**
- 奖池 **$17K**、**5** 个赛道、**50/50** 支付模式
- 赛道名称确认：**Developer Infrastructure & Tooling**（描述为 "SDKs, Wallet Tooling, APIs, Analytics, Explorers, Indexers, Security Tools"）→ **与建议赛道相符**
- 反滥用规则（**立即取消资格、无申诉**）：Forked/Recycled Code、Copied Projects、Simple Clones、**AI-Generated Projects (minimal developer contribution)**、**No Working Demo**

**官方条款** `https://hackathon.qie.digital/terms`（Last updated 8/27/2026）逐条核实：

- 资格：18 岁以上 / 有效 QIE 钱包地址 / 非 QIE 或其关联公司现雇员 / 遵守当地法律 / **每队仅一份提交**
- 提交要求：建在 QIE 上或集成 QIE / 比赛期内原创 / **working demo or prototype** / GitHub 源码 / 完整文档 / 不侵权
- 评分：**Innovation 25% / Technical implementation 25% / Potential impact 25% / Presentation 25%**
- *"Prizes will be awarded in QIE tokens"*

**chain registry**（`qieadmin/chain-registry`）与 **QIE Cosmos/Ethermint API** 已用于验证地址方案（见第 2 节）。

### 10.2 规则冲突（**不要替主办方脑补答案**）

以下 6 项在我能读到的官方文本中**无法自洽**，建议通过 `info@qie.digital` 或官网 Telegram **书面**确认。我**未**代发任何邮件或消息。

| # | 冲突 | 我的观察 |
| --- | --- | --- |
| C-1 | 主页显示 **"0 Days to Deadline"**，但 2026-09-21 距 Nov 30 尚有约 70 天 | 计数器/模板状态错误，印证页面状态不可全信 |
| C-2 | 时间线自相矛盾：页头 "Build window: Aug 1 – Dec 10" vs 时间线 "Development Period Aug 1 – Nov 30" vs 注册文案 "Aug 1, 2026 – Nov 30, 2026 window" | 三个不同区间 |
| C-3 | **"Mainnet only"** 是硬性要求，但 **Builder Quickstart 五步全部使用 Testnet**（加 testnet 网络、领 faucet、部署到 testnet、在 testnet explorer 验证） | 最高优先确认项 |
| C-4 | 主页奖金以 **USD** 展示（$5,000/$3,000/$2,000/$500…），条款写 **"awarded in QIE tokens"** | 计价币种、结算价格与流动性风险未定义 |
| C-5 | 评分口径不同：主页列 **5 项**无权重，条款列 **4 项**各 **25%** | 权重不可混用 |
| C-6 | 联系方式不一致：页面显示 `info@qie.digital`，但 **mailto 链接实为 `hello@qie.digital`** | 需确认哪个有效 |

### 10.3 无法验证项（诚实声明）

**FAQ 答案在服务端渲染产物中不存在。** 我直接抓取主页 HTML 与 Next.js RSC payload（`RSC: 1`，仅 4,870 字节），6 个 FAQ 折叠面板的 `role="region"` 容器**全部为空**且 `data-state="closed"`，正文中不含任何答案文本。

因此以下 FAQ **无法核实**，**不应假定其内容**：

- "Is registration open for Hackathon 3.0?"
- "Do we need to deploy on QIE Mainnet?"
- "What are the mandatory submission requirements?"
- "How are payouts structured?"
- **"What are the judging weights?"**
- **"Can AI-assisted development be used?"** ← 与 AI-generated 取消资格条款直接相关，**必须书面确认**

> 附注：这也意味着**依赖 JS 才能看到 FAQ**。若主办方以 FAQ 作为规则来源，建议要求其提供静态可读版本或书面答复。

### 10.4 可能导致取消资格的问题（按风险排序）

1. **No Working Demo（高）** — 公开 demo 存在但是 **v1 过期版本**；无 demo 视频；无主网部署。三项叠加直接命中该条。见 F-16、F-15。
2. **AI-Generated Project / minimal developer contribution（中）** — 现有缓解证据：4 个提交跨 2026-08-10 → 08-30、`docs/development-log.md` 记录了具体工程决策、`docs/product-decision.md` 含原创性检索。**建议保留并强化人类决策痕迹**，并书面确认 FAQ 中该条口径。
3. **Mainnet only（高）** — 未部署主网 = 未满足硬性要求。见 F-18。
4. **Originality / 比赛期内创作（低）** — 首次提交 2026-08-10，落在 Aug 1 – Dec 10 窗口内；远程仓库创建于 2026-08-09T18:02Z（= 马来西亚时间 08-10 02:02）。**可辩护**。
5. **One submission per team（待确认）** — 需用户确认。

---

## 11. 未完成 / 阻塞项

### 11.1 F-18（P0，硬性阻塞）— 主网部署缺失

已独立复现只读估算（`QIE_BROADCAST=no`，未设私钥，**未广播**）：

| 网络 | Chain ID | RPC | 余额 | Gas price | 估算 gas | 估算费用 |
| --- | ---: | --- | ---: | ---: | ---: | ---: |
| QIE Testnet | 1983 | `rpc1testnet.qie.digital` | **0** | 7 wei | 280,645 | 0.000000000001964515 QIE |
| QIE Mainnet | 1990 | `rpc1mainnet.qie.digital` | **0** | 1,125,000,000 wei | 280,645 | **0.000315725625 QIE** |

与简报数据**完全一致**。部署脚本 `scripts/deploy-registry.ts` 的安全设计已审查并**确认有效**：

- 默认 dry-run；`QIE_BROADCAST !== 'yes'` 时提前 return，**不广播**
- 广播前强制要求已配置私钥，否则抛错
- 主网额外要求 `QIE_MAINNET_CONFIRM=QIE_MAINNET_1990`
- 要求 `balance >= estimatedFee * 2n`（2 倍安全缓冲）
- 检查 `receipt.status === 'success'`

**当前阻塞**：部署钱包 `0x7145A2f714693Efba077549f7cb4D5eFd2d3B4d4` 在两个网络余额均为 **0**。主网需约 **0.000632 QIE**（2× 估算费用）才能通过脚本自身的缓冲检查。

> 按你的指示，我**未**设置任何广播变量、**未**发送任何交易。

### 11.2 其他未完成项

- 无测试网部署、无主网部署、无合约地址、无交易哈希、无 explorer 证据
- Registry 环境变量无真实地址
- 3 个本地提交未推送
- 无 demo 视频
- 无真实使用/traction 证据（文档已正确标注为 target）
- 未注册、未提交

---

## 12. 按比赛价值排序的修复清单

> 排序依据：对「满足硬性资格 / 避免取消资格 / 评分四维度」的边际贡献。
> **不包含**任何需要用户批准的外部动作；我只列出建议。

### 阶段 A — 必须在主网部署**之前**决定（因为不可逆）

| # | 动作 | 理由 |
| --- | --- | --- |
| A1 | 决定并修复 **F-04**（`anchor` 复活已撤销 intent） | 合约不可升级，部署后语义永久固定 |
| A2 | 决定是否加 **F-06**（domain 加 `verifyingContract`/`salt`） | 会改变 domain separator → 使所有 v2 digest 失效，必须早于任何 anchor |
| A3 | 决定是否扩展 **F-05**（`expectedAmount`/`expectedAsset`/`expectedRecipient`） | 改动 schema 需与 A2 一起做一次版本决策，避免二次返工 |
| A4 | 重跑 `npm run validate`，确认 `VALIDATE_EXIT=0` | 部署前冻结源码 |

### 阶段 B — P0 资格线

| # | 动作 |
| --- | --- |
| B1 | 向部署钱包 `0x7145…B4d4` 注入少量主网 QIE（≥ 0.000632） |
| B2 | 在用户**明确书面批准**后执行主网部署（`QIE_BROADCAST=yes` + `QIE_MAINNET_CONFIRM=QIE_MAINNET_1990`） |
| B3 | 在 `mainnet.qie.digital` 独立验证合约源码与交易，记录地址/tx/commit SHA |
| B4 | 把真实地址写入 `VITE_QIE_MAINNET_REGISTRY_ADDRESS` |

### 阶段 C — P1 对外一致性（当前最大对外风险）

| # | 动作 | 对应 |
| --- | --- | --- |
| C1 | 修复**公开** README 的 404 链接 → `https://kaivenn52.github.io/qie-saferoute/` | F-01 |
| C2 | 修复 `docs/submission-package.html` 的失效链接与 "eight tests" | F-02 |
| C3 | 修正/移除过期的公开安全报告（`npm audit` 声明、测试数、`issuer` 字段） | F-03 |
| C4 | 推送 3 个本地提交（**先**确认 `.gitignore` 已含 `.env`） | F-13 |
| C5 | 把 Pages Source 改为 **GitHub Actions**，或改用分支发布 | F-15 |
| C6 | 重新构建并发布 **v2** 站点（当前线上是 v1） | F-16 |
| C7 | 在 CI build 注入 `VITE_QIE_*_REGISTRY_ADDRESS` | F-17 |
| C8 | 无痕窗口独立验证公开站点：地址解析、签名、`isActive`、anchor/revoke 全链路 | — |

### 阶段 D — 安全加固（评分：Technical implementation）

| # | 动作 | 对应 |
| --- | --- | --- |
| D1 | 加 `getCode` 守卫，真正实现「未验证则禁用」 | F-09 |
| D2 | 扩展 `verifyPaymentIntent` 的 expected* 断言 | F-05 |
| D3 | 加 `decimals` 与资产合约的交叉校验提示 | F-07 |
| D4 | 修正前端两处过强文案 | F-08 |
| D5 | `npm audit fix`（vitest moderate、adm-zip high；生产树为 0） | F-03 |
| D6 | 为 F-04 补一个负向测试（revoke 后 re-anchor 应 revert） | F-04 |

### 阶段 E — 规则与合规

| # | 动作 |
| --- | --- |
| E1 | 通过 `info@qie.digital` **书面**确认 C-1…C-6 六项冲突（尤其 C-3 Mainnet only、C-4 奖金币种、C-5 权重） |
| E2 | 要求书面确认 FAQ 中 **"Can AI-assisted development be used?"** 的口径 |
| E3 | 确认注册入口真实开放、团队资格、one-submission rule、钱包地址 |

### 阶段 F — 展示与 traction

| # | 动作 |
| --- | --- |
| F1 | 录制 demo 视频（真实签名 + 真实主网 Registry + explorer，不暴露隐私/私钥） |
| F2 | 寻找 1 个真实集成试用者（钱包 / 商户 checkout / bridge / 交易所充值） |
| F3 | 保留反馈与使用证据，**不伪造** traction；文档中继续标注为 target |

### 阶段 G — 低优先清理

| # | 动作 | 对应 |
| --- | --- | --- |
| G1 | 移除或标记 `src/lib/proof.ts`（v1 死代码，仍占 5/15 个测试） | F-11 |
| G2 | 修正 UI "13 SDK tests" 文案 | F-11 |
| G3 | 考虑让 `isActive` 三态可区分 | F-10 |
| G4 | 决定 `.superstack/` 是否继续公开 | F-14 |

---

## 13. 审查方法说明与局限

**已执行**：只读文件审查、git 历史与远程 diff、`npm run validate` 复现、合约/EIP-712 静态分析、只读 RPC 估算复现、QIE 官方 API/explorer/chain-registry 交叉验证、GitHub API 查询、官方主页与条款抓取、密钥与依赖扫描。

**未执行（按你的指示）**：未注册、未推送、未发布、未购买 QIE、未广播任何交易、未部署主网、未提交比赛、未索取或读取私钥/助记词、未代发邮件或 Telegram 消息。

**局限**：

1. 我**无法**在真实浏览器中执行端到端 UI 交互（无浏览器自动化）。线上/本地 UI 的功能性结论基于 bundle 内容比对、代码审查与你自己此前的人工验证记录；**第 12 节 C8 的无痕窗口验证仍必须由人完成**。
2. 钱包签名路径（QIE Wallet / MetaMask 注入）**未经我实测**。
3. 官方 FAQ 答案无法获取（见 10.3），因此 FAQ 层规则**未经验证**。
4. 合约审查为**静态人工审查**，不是形式化验证或第三方审计。
5. `npm audit` 的结论有时效性，依赖公告库更新。

---

## 14. 一句话总结

**技术地基是扎实且经得起独立验证的**（地址解析已获 QIE 官方基础设施三重确认，EIP-712 上下文绑定与重放保护真实有效，Registry 与 SDK digest 完全一致，合约非托管、无可升级性、部署脚本默认安全）。

**真正的风险不在代码，而在「对外呈现」与「硬性资格」**：公开 demo 仍是 8 月的 v1 版本、公开 README 指向一个 404 链接、Pages 发布链路与 CI 配置互不兼容、主网部署因钱包余额为 0 而未完成。其中**任何一项单独都不致命，但叠加官方「No Working Demo → 立即取消资格」条款**，构成了当前最需要优先处理的暴露面。

---

## 附录：本次会话内的修复状态（2026-09-21）

修复后 `npm run validate` 复测 **`VALIDATE_EXIT=0`**：oxlint 0/0、**12** 个 SDK 测试、**5** 个合约测试、Vite 构建、SDK 构建、`npm pack` 23 文件全部通过。**未执行**任何推送、部署、广播或提交。

| 编号 | 发现 | 状态 | 处理方式 |
| --- | --- | --- | --- |
| F-01 | 公开 README 指向 404 链接 | ✅ 已修 | 改为 `kaivenn52.github.io`，并注明线上仍是 MVP 构建 |
| F-02 | `submission-package.html` 失效链接与陈旧测试数 | ✅ 已修 | 链接更新；测试数改为 12+5；审计声明改为「生产依赖树 0 漏洞」 |
| F-03 | 公开安全报告声明不实 | ✅ 已修 | 加 SUPERSEDED 横幅 + 逐条修订表（保留原文可审计） |
| F-04 | `anchor` 可复活已撤销 intent | ✅ 已修 | `anchor` 现在 `revert AlreadyRevoked`；新增 2 个测试 |
| F-05 | 无法钉住金额/资产/收款人 | ✅ 已修 | 新增 `expectedRecipientEvm`/`expectedAsset`/`expectedAmount`/`expectedDecimals` + 测试 |
| F-06 | domain 缺 `verifyingContract` | 📄 已决策 | **有意不改**（registry 可选，改了会使 v2 digest 全部失效）。已在 threat-model 记录理由与残留风险 |
| F-07 | 缺 decimals 交叉校验 | 📄 已记录 | 保持为集成方义务，README/threat-model 已强调 |
| F-08 | 两处前端文案过强 | ✅ 已修 | 改为「created locally」与「合约不验证签名」 |
| F-09 | 「未验证则禁用」未在代码强制 | ✅ 已修 | 新增 `getCode` 检查，无字节码即禁用并提示 |
| F-10 | `isActive` 三态不可区分 | 📄 已记录 | 未改（合约语义），threat-model 已说明 |
| F-11 | UI 测试数错误 + v1 死代码 | ✅ 已修 | 删除 `proof.ts`/`proof.test.ts`；计数改为 12+5 |
| F-12 | 本地 README 陈旧链接 | ✅ 已修 | 同上 |
| F-13 | 公开 `.gitignore` 不忽略 `.env` | ⏳ 待推送 | 修复已在本地提交中，**推送后生效** |
| F-14 | `.superstack/` 公开 | 📄 已记录 | 内容无敏感信息；已加修订说明。是否取消跟踪由用户决定 |
| F-15 | CI 与 Pages 配置不兼容 | ⚠️ 部分 | workflow 已加说明与 env 注入；**Settings → Pages 必须由用户改为 GitHub Actions** |
| F-16 | 线上 demo 是 v1 | ⏳ 待发布 | 已产出干净的 v2 构建；**需推送 + 修正 Pages 源后才能上线** |
| F-17 | CI 不注入 Registry 地址 | ✅ 已修 | workflow 已注入 `VITE_QIE_*` repository variables |
| F-18 | 主网部署缺失（P0） | ❌ 未做 | **按指示未部署**；钱包余额仍为 0，需先注入约 0.000632 QIE |
| — | 依赖漏洞 | ✅ 已修 | `npm audit fix`：`vitest` 4.1.11、`adm-zip` 0.6.1；**全树与生产树均 0 漏洞** |
| — | 构建产物残留 | ✅ 已修 | 新增 `npm run clean`（Vite 8.2.1 不遵守 `emptyOutDir`，已实测确认） |

**仍然阻塞的 3 件事（都需要你的授权或人工操作）**：F-18 注资并部署主网、F-15 修改 Pages Source、F-16/F-13 推送并重新发布公开站点。
