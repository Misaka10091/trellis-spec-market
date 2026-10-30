# 可信发布与来源证明

## 为什么先手动发一次

npm 的 Trusted Publisher 只能在**已存在**的包上配置。自动化无法完成第一次发布，顺序反了会卡在“包不存在 → 无法配置发布者”。

```
0.1.0（首个版本）  →  手动发布，带 2FA
        ↓  包已存在于 npm
一次性配置        →  npm → Settings → Trusted Publisher → GitHub Actions
        ↓
0.1.1 及以后      →  推送标签，工作流接管
```

## 一次性配置

1. 包页面 → Settings → Trusted Publisher → GitHub Actions。
2. 填仓库、工作流文件名（必须与实际 YAML 文件名一致）、environment（没有就留空）。
3. 在 **Allowed actions** 中显式启用 **Allow npm publish**，再保存。本规范的工作流直接运行 `npm publish`；据 [npm 官方说明](https://docs.npmjs.com/trusted-publishers/)，2026-09-03 之后创建的配置默认只允许 `npm stage publish`，未授权直接发布时，OIDC 身份匹配也会被拒绝。
4. 之后工作流用 `id-token: write` 认证，不需要发布用的 secret。

`Allow npm dist-tag` 是独立授权；只有工作流还要单独修改 dist-tag 时才需要。本规范通过 `npm publish --tag` 设置渠道，不额外运行 `npm dist-tag add`。

手动首发需要账号开启 2FA，或使用带 bypass-2FA 权限的 granular token。报错 `E403 ... Two-factor authentication ... is required` 就是账号配置没完成。

## 工具版本

- npm CLI ≥ 11.5.1（工作流里 `npm install --global npm@^11.5.1`），Node ≥ 22.14。
- 低于这个版本，即使 `id-token: write` 和 Trusted Publisher 都配好，发布也会失败。

## 来源证明的条件

- 仓库公开。
- `package.json#repository.url` 精确匹配托管仓库（`git+https://github.com/<owner>/<repo>.git`）。
- 工作流在 GitHub Actions 中运行，且 `id-token: write` 未被静态令牌替代。

三者缺一，`--provenance` 会失败或产出一个无法验证的证明。通过可信发布时 npm 默认就会生成 provenance，`--provenance` 只是显式声明。

## 什么时候回退到 NPM_TOKEN

只在 OIDC 不可用时（例如企业内网 registry、非 GitHub 托管）。回退时必须：

- 建 granular token，限定包范围与发布权限。
- 存为仓库 secret，不要写进 workflow 明文。
- 在 README 中写清楚当前用的是哪一种，避免下一个人猜。

## 常见故障

| 现象 | 原因 |
| --- | --- |
| `E403 ... cannot publish over` | 版本已存在。抬版本，不要重发 |
| `E404 ... not found` | scope 权限不足，或包名拼错 |
| `provenance` 校验失败 | `repository.url` 与实际仓库不一致，或仓库私有 |
| Trusted Publisher 拒绝直接 `npm publish` | Allowed actions 未启用 **Allow npm publish**；新配置默认只允许 staged publishing |
| Trusted Publisher 配好了仍 401 | 仓库、工作流文件名、environment 或 OIDC 权限与配置不符；手动或复用工作流还需核对调用方工作流身份 |
| 配好仍然 `ENEEDAUTH` / `404` | `.npmrc` 里被写了占位 `_authToken`（`setup-node` v5/v6 在 `NODE_AUTH_TOKEN` 未设置时兜底），npm 因而不走 OIDC。用 `setup-node@v7`，或发布前删掉 `.npmrc` 里的 `_authToken` 行 |
