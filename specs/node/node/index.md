# Node.js 项目规范

Node.js 项目的包管理与依赖、`package.json` 脚本与 workspace 约定。包管理器首选 **pnpm**。

> 与 `npm-publish` 的分工：那边讲发布到 npm 的流水线与凭据，这里讲日常的依赖安装、版本管理与脚本/多包组织。

## 分册

| 文件 | 内容 |
| --- | --- |
| [package-management.md](./package-management.md) | pnpm 首选、锁文件、Node 版本（`engines` / `.nvmrc` / `packageManager`）、依赖增删与卫生 |
| [scripts-and-workspace.md](./scripts-and-workspace.md) | `package.json` 脚本约定、pnpm workspace、多包依赖方向 |

## 装进来的位置

本模板的内容会落到 `.trellis/spec/node/`，命名空间全局唯一，不与其它模板的路径冲突。

## 开工前自查

- [ ] 这个仓库只用一种包管理器吗？确认只有 `pnpm-lock.yaml`，没有 `package-lock.json` / `yarn.lock`。
- [ ] 跑的是 `pnpm install`，而不是 `npm install` / `yarn`？
- [ ] `packageManager` 字段与本地 pnpm 版本一致，`engines.node` 声明了支持范围？
- [ ] 新依赖加在正确的 `dependencies` / `devDependencies` 里，没把仅构建期需要的东西塞进运行时依赖？
- [ ] 改动 `package.json` 脚本了吗？入口命名与其它子包一致，且不依赖全局安装的工具？
- [ ] 多包仓库里跨包引用用 `workspace:` 协议，且没有反向或循环依赖？

## 质量门

```bash
pnpm install --frozen-lockfile                      # 锁文件与 package.json 一致
pnpm -r lint && pnpm -r typecheck && pnpm -r test   # 各包跑各自的检查
pnpm outdated                                       # 依赖漂移与过时项（人工判断）
```

## 三条硬约束

- **一个仓库只用一种包管理器**：pnpm。不混用 npm / yarn，也不提交多份锁文件。
- **锁文件必须提交**：`pnpm-lock.yaml` 入库，CI 用 `--frozen-lockfile` 校验它没漂移。
- **Node 版本显式声明**：`engines.node` + `packageManager`（corepack），本机与 CI 读同一份来源。
