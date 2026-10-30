# 失败模式与反模式

## 常见故障

| 现象 | 原因 | 修法 |
| --- | --- | --- |
| `E403 ... cannot publish over` | 版本已存在 | 抬版本，不要重发同一版本 |
| `E404 ... not found` | scope 无权限，或包名拼错 | 确认账号拥有该 scope；首次发新 scope 要显式授权 |
| `E403 ... Two-factor authentication ... required` | 手动发布时账号未开 2FA | 开启 2FA 或换 granular token 并允许 bypass |
| Trusted Publisher 配好仍 401 | 工作流文件名对不上，或触发方式不是 `push` tag | 文件名必须与仓库里的 YAML 完全一致 |
| provenance 生成失败 | 仓库私有，或 `repository.url` 与实际仓库不一致 | 公开仓库 + 精确 URL |
| 发出来的包少了文件 | `files` 白名单漏了新文件 | 发布前必看 `npm pack --dry-run` |
| 发了 `next` 却没人装到 | 用户默认装 `latest` | 用 `npm dist-tag add <pkg>@<ver> latest` 显式提升 |
| CI 打包内容和本地不一致 | `.gitignore`/`.npmignore` 与 `files` 相互作用 | 用 `npm pack --dry-run --json` 比对文件列表 |
| `ENEEDAUTH` / `404`，但 Trusted Publisher 已配好 | `.npmrc` 里被写了占位 `_authToken`（`setup-node` v5/v6 在 `NODE_AUTH_TOKEN` 未设置时兜底成假 token），npm 不走 OIDC | 用 `setup-node@v7`，或发布前删掉 `_authToken` 行 |
| 重跑流水线报 `E403 ... cannot publish over` | 上一次 `npm publish` 其实已经成功 | 不要重发；只补 GitHub Release（工作流里的 Release 步骤是幂等的） |

## 反模式

**在 PR 上发布。** `pull_request` 触发器不会拿到 `id-token` 的写权限，且不该让未合并代码有发布能力。发布只发生在 tag 上。

**检出分支头而不是 tag。** 重跑时分支可能已经前进，发出去的不是标签指向的那个提交。必须 `ref: refs/tags/<tag>`。

**同时配置 `NPM_TOKEN` 与 OIDC。** 静态令牌会取代 OIDC 身份，provenance 随之失效，且令牌长期有效。二选一，不要都留。注意 `setup-node` 的 `registry-url` 也会写入 `NODE_AUTH_TOKEN` 占位行，同样会短路 OIDC。

**把版本号写在两处。** 两份清单（`package.json` 与插件清单）各自维护版本，迟早漂移。让 `npm version` 触发同步脚本。

**用 `--force` 重发。** npm 不允许覆盖已发布版本，`--force` 只会掩盖错误。

**发布与打标分成两次人肉操作。** tag 推上去就应当完成发布；中间留人工步骤，等于制造“tag 已推但没发”的半完成状态。

**在工作流里装 `npm@latest`。** 版本随机漂移，某天可能悄悄换掉发布行为。钉到明确版本（如 `npm@^11.5.1`）。

**没有 `timeout-minutes`。** 卡住的上传会吃掉默认六小时，日志里没有任何失败测试可以归因。

**在发布作业里开依赖缓存。** `setup-node` 的 `cache: npm` 会把依赖缓存暴露给发布流程，缓存投毒可能波及凭据（包括 OIDC token）。用 `package-manager-cache: false`。

## 发布后的确认

```bash
npm view <pkg>@<version> dist.tarball
npm dist-tag ls <pkg>
```

两条都对了才算发完。只看 Actions 绿勾不算——它只证明命令返回 0。
