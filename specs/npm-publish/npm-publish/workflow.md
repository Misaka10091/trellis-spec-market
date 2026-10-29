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

`workflow_dispatch` 用于重跑：发布失败后应当能对同一个 tag 重试，而不是改代码重发。

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

## 并发与超时

```yaml
concurrency:
  group: npm-release-${{ inputs.tag || github.ref_name }}
  cancel-in-progress: false
```

按 tag 分组、**永不取消**：重试同一个 tag 时必须让它跑完，而不是打断正在进行的发布。

`timeout-minutes` 给 15 左右。没有上限时，一个卡住的上传会耗尽默认的六小时。

## 步骤顺序

```yaml
- uses: actions/checkout@v5
  with:
    ref: refs/tags/${{ inputs.tag || github.ref_name }}
    fetch-depth: 0          # 必须检出标签指向的提交，不是分支头
- uses: actions/setup-node@v5
  with:
    node-version: '24'
    registry-url: https://registry.npmjs.org
- run: npm install --global npm@11      # 旧 npm 不支持可信发布
- run: node scripts/prepare-release.mjs "$RELEASE_TAG" "$RUNNER_TEMP/release"
- run: npm ci --ignore-scripts
- run: npm run build
- run: npm pack --dry-run
- run: npm publish --access public --provenance --tag "${{ steps.release.outputs.dist_tag }}"
- run: gh release create "$RELEASE_TAG" --notes-file "$RUNNER_TEMP/release/notes.md" --verify-tag
```

要点：

- `checkout` 必须钉在 tag 上。默认检出的是触发分支的头，重跑时可能已经不再是那个提交。
- 发布前重跑构建与打包检查。CI 通过不等于可发布内容正确。
- `--tag` 由门禁脚本决定，不要写死 `latest`；预发布版本进 `next`。
- Release notes 用门禁脚本生成，保证与 changelog 一致。

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
  group: npm-release-${{ inputs.tag || github.ref_name }}
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
      - uses: actions/checkout@v5
        with:
          ref: refs/tags/${{ inputs.tag || github.ref_name }}
          fetch-depth: 0
      - uses: actions/setup-node@v5
        with:
          node-version: '24'
          registry-url: https://registry.npmjs.org
          cache: npm
      - name: 使用支持可信发布的 npm
        run: npm install --global npm@11
      - name: 校验标签并生成发布说明
        id: release
        run: node scripts/prepare-release.mjs "$RELEASE_TAG" "$RUNNER_TEMP/release"
      - run: npm ci --ignore-scripts
      - run: npm run build
      - run: npm pack --dry-run
      - name: 发布
        run: npm publish --access public --provenance --tag "${{ steps.release.outputs.dist_tag }}"
      - name: 创建 GitHub Release
        env:
          GH_TOKEN: ${{ github.token }}
        run: gh release create "$RELEASE_TAG" --notes-file "$RUNNER_TEMP/release/notes.md" --verify-tag
```

## 多包仓库

npm workspaces 下逐个发布，或一次带上所有 workspace：

```bash
npm publish --workspaces --access public --provenance
```

两条约束：

- 每个包都要自己的 `version` 和 `files`；`--workspaces` 不会替你跳过私有包，用 `"private": true` 排除。
- 所有包共用一个 tag。需要独立发布节奏时，改用按目录过滤的 tag（如 `pkg-a-v1.2.3`），并在门禁脚本里解析出包名与版本。

## 缓存

`setup-node` 的 `cache: npm` 依赖仓库根有 `package-lock.json`。没有锁文件时它会报错，此时去掉 `cache` 或先提交锁文件。

不要在发布任务里缓存 `node_modules`：安装耗时远小于拿到过期依赖的风险。
