# 发布工作流

## 触发

```yaml
on:
  push:
    tags: ['v[0-9]*.[0-9]*.[0-9]*']
  workflow_dispatch:
    inputs:
      tag:
        description: '已存在的发布标签，例如 v0.1.1'
        required: true
```

`workflow_dispatch` 用于重跑：发布**之前**的失败（校验、安装、构建、测试、打包）可以直接重跑同一个 tag。如果 `npm publish` 已经成功，重跑会在防回退门禁或 npm 处失败——去单独补 GitHub Release 即可；下方 Release 步骤只在不存在时创建，已有 Release 不会重复创建。

## 权限

```yaml
permissions:
  contents: read

jobs:
  publish:
    permissions:
      id-token: write     # OIDC，用于 Trusted Publishing 与 provenance
      contents: write     # 创建 GitHub Release
```

不要在这里引用 `NPM_TOKEN`：一旦同时存在 OIDC 与静态令牌，来源证明会失效，且令牌泄漏面变大。

`actions/setup-node` 的 `registry-url` 会往 `.npmrc` 写一行 `_authToken=${NODE_AUTH_TOKEN}`。v5/v6 在变量未设置时会把它兜底成占位值，npm 看到“已配置认证”就不再走 OIDC，表现为 `ENEEDAUTH` 或 `404`。用 `@v7`（已移除该兜底），并显式关掉依赖缓存。

## 并发与超时

```yaml
concurrency:
  group: npm-release-${{ github.repository }}
  queue: max
  cancel-in-progress: false
```

同一个 npm 包的**所有版本和渠道必须共用锁**，不能按 tag 分组。示例保守地串行化整个仓库的 npm 发布；其它发布或提升渠道的工作流也必须用同一个 group。独立包确需并行时可改成稳定的包名锁，但同一包不能因 workflow、版本、Git tag 或渠道不同而分组。

`cancel-in-progress: false` 保护正在发布的任务；`queue: max` 最多容纳 100 个等待任务，满后新任务会被取消。默认队列只保留一个等待任务，会被后来的任务替换，不能承诺“永不取消”。详见 [GitHub 并发说明](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency)。

队列不保证 SemVer 顺序，所以串行化还不够：在持锁期间、紧挨 `npm publish` 之前，必须从发布所用 registry 重新读取目标 dist-tag，并要求待发版本按 SemVer **严格高于**当前值。旧版晚到时直接失败；不能让 `latest` 或 `next` 回退。实现见[发布门禁脚本](./release-gate.md#发布前防止-dist-tag-回退)。本锁只协调本仓库中参与的工作流，手工发布或其它仓库的写入也要统一调度。

`timeout-minutes` 给 15 左右。没有上限时，一个卡住的上传会耗尽默认的六小时。

## 步骤顺序

```yaml
- uses: actions/checkout@v7
  with:
    ref: refs/tags/${{ inputs.tag || github.ref_name }}
    fetch-depth: 0          # 必须检出标签指向的提交，不是分支头
- uses: actions/setup-node@v7
  with:
    node-version: '24'
    registry-url: https://registry.npmjs.org
    package-manager-cache: false   # 发布作业不缓存依赖
- run: npm install --global npm@^11.5.1  # 可信发布要求 >=11.5.1
- id: release
  run: node scripts/prepare-release.mjs "$RELEASE_TAG" "$RUNNER_TEMP/release"
- run: npm ci --ignore-scripts
- run: npm run build
- run: npm test --if-present
- run: npm pack --dry-run
- name: 检查渠道并发布
  env:
    DIST_TAG: ${{ steps.release.outputs.dist_tag }}
  run: |
    node scripts/check-dist-tag.mjs "$DIST_TAG" package.json
    npm publish --access public --provenance --tag "$DIST_TAG"
- name: 创建 GitHub Release
  env:
    GH_TOKEN: ${{ github.token }}
    PRERELEASE: ${{ steps.release.outputs.prerelease }}
  run: gh release view "$RELEASE_TAG" >/dev/null 2>&1 || gh release create "$RELEASE_TAG" --notes-file "$RUNNER_TEMP/release/notes.md" --verify-tag --prerelease="$PRERELEASE"
```

要点：

- `checkout` 必须钉在 tag 上。默认检出的是触发分支的头，重跑时可能已经不再是那个提交。
- 发布前重跑构建、测试与打包检查。CI 通过不等于可发布内容正确。
- 可信发布要求 npm ≥ 11.5.1、Node ≥ 22.14；`npm@^11.5.1` 保证这一点。
- `--tag` 由门禁脚本决定，不要写死 `latest`；预发布版本进 `next`。
- Release notes 用门禁脚本生成，保证与 changelog 一致；`prerelease` 输出必须为字符串 `true` 或 `false`，显式传给 `gh release create --prerelease`，不能靠 Git tag 名推断。
- 两个门禁脚本由目标项目按[接口与示例](./release-gate.md)实现；防回退脚本依赖的 `semver` 要作为直接开发依赖写入该项目的清单与锁文件，不能依赖 npm 内部模块。

## 分发标签

| 版本 | dist-tag |
| --- | --- |
| `1.2.3` | `latest` |
| `2.0.0-beta.1` | `next` |

规则放在脚本里，不要散落在 YAML 的 shell 片段中——脚本可本地跑、可单测，YAML 不能。

## 完整文件

```yaml
name: publish

on:
  push:
    tags: ['v[0-9]*.[0-9]*.[0-9]*']
  workflow_dispatch:
    inputs:
      tag:
        description: '已存在的发布标签，例如 v0.1.1'
        required: true
        type: string

permissions:
  contents: read

concurrency:
  group: npm-release-${{ github.repository }}
  queue: max
  cancel-in-progress: false

jobs:
  publish:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    permissions:
      id-token: write
      contents: write
    env:
      RELEASE_TAG: ${{ inputs.tag || github.ref_name }}
    steps:
      - uses: actions/checkout@v7
        with:
          ref: refs/tags/${{ inputs.tag || github.ref_name }}
          fetch-depth: 0
      - uses: actions/setup-node@v7
        with:
          node-version: '24'
          registry-url: https://registry.npmjs.org
          package-manager-cache: false
      - name: 使用支持可信发布的 npm
        run: npm install --global npm@^11.5.1
      - name: 校验标签并生成发布说明
        id: release
        run: node scripts/prepare-release.mjs "$RELEASE_TAG" "$RUNNER_TEMP/release"
      - run: npm ci --ignore-scripts
      - run: npm run build
      - name: 测试
        run: npm test --if-present
      - run: npm pack --dry-run
      - name: 检查渠道并发布
        env:
          DIST_TAG: ${{ steps.release.outputs.dist_tag }}
        run: |
          node scripts/check-dist-tag.mjs "$DIST_TAG" package.json
          npm publish --access public --provenance --tag "$DIST_TAG"
      - name: 创建 GitHub Release
        env:
          GH_TOKEN: ${{ github.token }}
          PRERELEASE: ${{ steps.release.outputs.prerelease }}
        run: gh release view "$RELEASE_TAG" >/dev/null 2>&1 || gh release create "$RELEASE_TAG" --notes-file "$RUNNER_TEMP/release/notes.md" --verify-tag --prerelease="$PRERELEASE"
```

## 多包仓库

下面只适用于**所有待发包同步使用同一版本、同一渠道**的仓库。门禁必须枚举每个待发 workspace，逐个检查它自己的版本、清单、仓库信息与发布说明，不能只验证根 `package.json`。所有包通过后，使用同一仓库锁发布：

```yaml
# 替换单包示例中的“检查渠道并发布”步骤；假设 workspaces 为 packages/*
- name: 检查全部 workspace 并发布
  env:
    DIST_TAG: ${{ steps.release.outputs.dist_tag }}
  run: |
    node scripts/check-dist-tag.mjs "$DIST_TAG" packages/*/package.json
    npm publish --workspaces --access public --provenance --tag "$DIST_TAG"
```

约束：

- 防回退检查的文件列表必须覆盖 npm 实际选择的**全部**待发包；这里的 glob 要按项目的 workspaces 布局调整。在上传任何包前完成所有包的检查。
- 每个包都有自己的 `version`、`files` 和 Trusted Publisher 配置。`"private": true` 的 workspace 会被跳过；默认不发布根包，需要根包时，显式加入 npm 发布选项和门禁列表。
- `DIST_TAG` 沿用门禁输出，预发布版本必须显式带 `--tag next`（由输出提供），不能省略 `--tag` 或依赖隐含的 `publishConfig.tag`。
- 需要独立发布节奏时，用按包区分的 tag（如 `pkg-a-v1.2.3`），在门禁中解析包名与版本，只对所选包发布，并使用该包的 `dist_tag`；不能对混合渠道的版本使用一次 `--workspaces` 发布。
- workspace 发布是逐包上传，不是事务；后续包失败可能留下部分成功状态。恢复时先核对已发布版本，再只补未成功的包，不能盲目重发全部。

## 缓存

发布作业用 `package-manager-cache: false`：缓存投毒可能波及凭据（包括 OIDC token），而发布不靠缓存提速。

不要在发布任务里缓存 `node_modules`：安装耗时远小于拿到过期依赖的风险。

`npm ci` 需要仓库根有 `package-lock.json`；没有锁文件时改用 `npm install`，并先提交锁文件。
