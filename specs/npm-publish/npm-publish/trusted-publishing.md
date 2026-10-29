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
3. 之后工作流用 `id-token: write` 认证，不需要任何 secret。

手动首发需要账号开启 2FA，或使用带 bypass-2FA 权限的 granular token。报错 `E403 ... Two-factor authentication ... is required` 就是账号配置没完成。

## 来源证明的条件

- 仓库公开。
- `package.json#repository.url` 精确匹配托管仓库（`git+https://github.com/<owner>/<repo>.git`）。
- 工作流在 GitHub Actions 中运行，且 `id-token: write` 未被静态令牌替代。

三者缺一，`--provenance` 会失败或产出一个无法验证的证明。

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
| Trusted Publisher 配好了仍 401 | 工作流文件名对不上，或用了 `pull_request` 触发 |
