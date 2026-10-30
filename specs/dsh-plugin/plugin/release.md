# 发布

## 版本与标签

`npm version patch|minor|major` 会更新 `package.json`、跑 `version` 脚本同步 `dsh.plugin.json`，并打出 `v*` 标签。标签与 `package.json` 的版本必须完全一致，否则发布门禁直接失败。

## 打标签前的门禁

```bash
node scripts/prepare-release.mjs vX.Y.Z .release-dry-run
```

它校验：标签形状、预发布标识不带前导零、两份清单版本一致、`repository.url` 真实（npm 的来源证明会把产物绑定到它）、以及 `CHANGELOG.md` 里有对应标签的非空段落。

**先写变更记录再打标签。** 标题格式必须是 `## v<版本> — <摘要>`，正文会成为 GitHub Release 的内容。

## 分发标签

- `0.2.0-beta.1` 这类 → `next`
- 其余 → `latest`

已发布的版本不能重复发布。发坏了就抬版本号。

## 凭据

优先用 npm 的可信发布：工作流给 `id-token: write`，在 npm 上配置发布者，不存任何令牌。两个必须提前规划的后果：

1. 可信发布只能为**已经存在**的包配置，所以第一个版本必须手动带 2FA 发布。
2. 来源证明要求仓库公开，且 `repository.url` 精确匹配。

只有 OIDC 不可用时才退回 granular `NPM_TOKEN`，并在仓库里写清楚用的是哪一种。

## 操作顺序

1. 合入改动，`npm run check` 通过。
2. 补变更记录。
3. `npm version <bump>`，用 `--follow-tags` 推送。
4. 标签流水线负责校验、测试、打包、发布。
