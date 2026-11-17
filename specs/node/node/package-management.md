# 包管理与依赖

一个 Node 仓库的依赖卫生，几乎决定了它半年后还能不能装得动。这里只管“装什么、怎么锁、用哪个版本”。

## 首选 pnpm

pnpm 是本规范默认的包管理器，理由是可验证的：

- **内容寻址存储 + 硬链接**：同一个版本的包在磁盘上只存一份，多项目、多分支共享，`node_modules` 体积小得多。
- **严格的依赖隔离**：默认 `node_modules` 只暴露 `package.json` 里声明的依赖，未声明的“幽灵依赖”直接 import 会失败——让隐式依赖在开发期暴露，而不是在别人的机器上炸。
- **workspace 快**：多包仓库用 `workspace:` 协议做本地链接，装一次、链接全部，见 [scripts-and-workspace.md](./scripts-and-workspace.md)。

不要在同一个仓库里混用包管理器：`npm install` / `yarn add` 会生成各自的锁文件并改写 `node_modules` 布局，很快就会出现“在我机器上能装、CI 装不上”。

## 用 packageManager 钉住 pnpm 版本

在根 `package.json` 写 `packageManager`，让 corepack 决定用哪个 pnpm：

```json
{
  "packageManager": "pnpm@11.20.0"
}
```

- 这是**唯一**应该相信的 pnpm 版本来源；本机 `corepack enable` 后自动切到它。
- 不要在文档里写“请用 pnpm 11.x”，也不要依赖全局安装的 pnpm 版本。
- 升级 pnpm 时只改这一处，并同步更新锁文件。

## 锁文件

| 规则 | 说明 |
| --- | --- |
| 只提交 `pnpm-lock.yaml` | npm / yarn 的锁文件一律不出现；发现就删掉并统一回 pnpm |
| 锁文件随 `package.json` 一起提交 | 依赖变更与锁文件变更在同一个提交里 review |
| CI 用 `pnpm install --frozen-lockfile` | 锁文件与清单不一致就直接失败，不允许 CI 悄悄改写依赖树 |
| 不手改 `pnpm-lock.yaml` | 需要改依赖就改 `package.json` 或跑 `pnpm add/remove`，让 pnpm 重算 |

锁文件冲突时，正确做法是：保留 `package.json` 的正确内容，删掉 `pnpm-lock.yaml` 后重新 `pnpm install`，再提交新锁文件——不要手工合 `pnpm-lock.yaml`。

## Node 版本

三处配合，别只写一处：

```jsonc
// package.json
{
  "engines": { "node": ">=22 <25" },
  "packageManager": "pnpm@11.20.0"
}
```

```
# .nvmrc（或 .node-version）
24.9.0
```

- `engines.node` 声明**支持范围**，是给使用者看的契约；CI 和本地用 `.nvmrc` 的**精确版本**保证可复现。
- `pnpm install` 默认会检查 `engines`；设 `engine-strict=true` 时不符合直接失败。
- CI 的 `setup-node` 用 `node-version-file: .nvmrc`，不要在 workflow 里另写一个版本号，避免两处漂移。

## 依赖增删

命令统一走 pnpm，不要直接手改 `package.json` 的 `dependencies` 再 install（容易漏锁文件或写错范围）：

```bash
pnpm add lodash-es          # dependencies
pnpm add -D vitest          # devDependencies
pnpm add -D @types/node
pnpm remove lodash-es
```

放哪个区：

| 区 | 放什么 | 例子 |
| --- | --- | --- |
| `dependencies` | 运行时真正 require / import 的 | 框架、运行时库 |
| `devDependencies` | 只在开发、构建、测试期用的 | 测试框架、lint、类型、打包器 |
| `peerDependencies` | 由宿主提供、本包只声明兼容范围的 | 库要求宿主带的框架版本 |
| `optionalDependencies` | 装不上也能降级运行的 | 平台相关的原生模块 |

- 库（要被别人安装的包）**不要把 `devDependencies` 里的东西写进 `dependencies`**，那会把测试工具带给使用者。
- 版本范围遵循仓库既有风格；对 `0.x` 依赖尤其小心，`^0.1.2` 只允许 `0.1.x`，不要写成 `^*`。
- 能锁到 `~` 或精确版本的关键工具（构建器、lint）就锁住，别让 `^` 悄悄换大版本。

## 依赖卫生

- `pnpm outdated` 定期看；升级单独提交，不夹在功能 PR 里。
- `pnpm audit` 看已知漏洞；高危项优先升，不能升的记进 issue 并说明原因。
- 删掉不再使用的依赖（`pnpm remove`），别让清单越滚越大。
- 不把构建产物、`node_modules` 提交进仓库；依赖靠锁文件重建。

## 常见坑

| 现象 | 原因 | 修法 |
| --- | --- | --- |
| CI 装出来的依赖和本地不一致 | 没提交锁文件，或 CI 用了 `npm install` | 提交 `pnpm-lock.yaml`，CI 改 `pnpm install --frozen-lockfile` |
| 换台机器就 `MODULE_NOT_FOUND` | 用了未声明的幽灵依赖 | 把真正用到的包补进 `dependencies`，靠 pnpm 的严格布局提前暴露 |
| `ERR_PNPM_OUTDATED_LOCKFILE` | `package.json` 改了但锁文件没更新 | 本地 `pnpm install` 后提交新锁文件，别用 `--no-frozen-lockfile` 蒙混过 CI |
| 同时存在两个锁文件 | 有人跑了 `npm install` / `yarn` | 删除 `package-lock.json` / `yarn.lock`，统一回 pnpm |
| `engines` 不匹配装不上 | 本机 Node 版本超出声明范围 | 用 `.nvmrc` 指定的版本，或放宽 `engines`（改的是契约，要 review） |
