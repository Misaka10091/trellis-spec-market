# 发布门禁脚本

判断“这次发布是否成立”的逻辑不要写在 YAML 里。抽成一个纯函数脚本，本地能跑、能单测、失败信息可读。

## 接口

```js
prepareRelease({ tag, pkg, manifest, changelog })
// → { package, version, tag, dist_tag, prerelease, notes }
```

- `tag` 来自 `GITHUB_REF_NAME` 或手动输入
- `pkg` / `manifest` 由调用方读入并解析，脚本不做 IO（CLI 入口再包装一层）
- `changelog` 是原始文本
- 失败直接抛错，非零退出；成功把 `dist_tag` 和 `prerelease` 写进 `GITHUB_OUTPUT`。`prerelease` 必须显式写为字符串 `true` 或 `false`，供 GitHub Release 的 `--prerelease` 使用；不能省略正式版本的 `false`

## 必须校验的项

按顺序，第一条失败即中止：

| # | 校验 | 为什么 |
| --- | --- | --- |
| 1 | 标签形如 `vX.Y.Z` 或 `vX.Y.Z-prerelease`，不含构建元数据 | `+build` 在 npm 里不可发布 |
| 2 | 预发布里纯数字标识不带前导零 | `beta.01` 不是合法 semver |
| 3 | `package.json#version` 等于标签 | 不一致会发错版本 |
| 4 | 第二份清单（若有，如 `dsh.plugin.json`）版本一致 | 两份清单漂移是最常见的发版事故 |
| 5 | `repository.url` 非空且不含占位符 | provenance 绑定它，错了证明就指错地方 |
| 6 | `CHANGELOG.md` 有 `## <tag> — ` 段落且正文非空 | 发布说明不能事后补 |

第 5 条要检查占位符（`{{`、`YOUR-`），而不只是非空——模板仓库最容易漏这一步。

## dist-tag 规则

```js
const distTag = version.includes('-') ? 'next' : 'latest'
```

版本含预发布标识就进 `next`，否则进 `latest`。渠道由门禁脚本决定，YAML 中不重复判断：

```js
const prerelease = version.includes('-')
// CLI 包装层；本地干跑时不写 GitHub 输出。
if (process.env.GITHUB_OUTPUT) {
  appendFileSync(process.env.GITHUB_OUTPUT,
    `dist_tag=${distTag}\nprerelease=${prerelease}\n`)
}
```

`appendFileSync` 来自 `node:fs`；本地干跑未设置 `GITHUB_OUTPUT` 时跳过写入，仅返回校验结果。

## 发布前防止 dist-tag 回退

显式 `npm publish --tag latest` 不会替你拦截版本回退，`next` 也没有单调递增保证（见 [npm 11.5.1 的实现](https://raw.githubusercontent.com/npm/cli/v11.5.1/lib/commands/publish.js)）。采用保守策略：**拒绝会让目标渠道指向相同或更旧版本的发布**。例如 registry 的 `latest` 为 `1.2.4` 时，晚到的 `1.2.3` 必须失败；`next` 为 `2.0.0-beta.10` 时，`beta.2` 同样失败。按 SemVer 比较，不能按字符串排序。

在构建、测试、打包完成后，持有[发布工作流中的共享锁](./workflow.md#并发与超时)，紧挨上传之前运行 `scripts/check-dist-tag.mjs <dist-tag> <package.json>...`。以下为目标项目可采用的完整脚本；先把 `semver` 声明为该项目的直接开发依赖并提交锁文件（例如 `npm install --save-dev semver@^7`）：

```js
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import semver from 'semver'

function assertDistTagForward({ name, version, distTag, distTags }) {
  assert.ok(typeof version === 'string' && semver.valid(version),
    `${name}: invalid version ${version}`)
  assert.ok(distTags && typeof distTags === 'object' && !Array.isArray(distTags),
    `${name}: invalid dist-tags response`)
  assert.ok(Object.values(distTags).every(value =>
    typeof value === 'string' && semver.valid(value)),
    `${name}: invalid version in registry dist-tags`)
  const current = distTags[distTag]
  if (current === undefined) return // 已成功读到包，但尚无这个渠道
  assert.ok(semver.gt(version, current),
    `${name}: refusing to move ${distTag} from ${current} to ${version}`)
}

const [distTag, ...manifests] = process.argv.slice(2)
assert.ok(['latest', 'next'].includes(distTag) && manifests.length > 0,
  'usage: check-dist-tag.mjs <latest|next> <package.json>...')
let checked = 0
for (const file of manifests) {
  const pkg = JSON.parse(readFileSync(file, 'utf8'))
  if (pkg.private === true) continue
  assert.ok(typeof pkg.name === 'string' && pkg.name.length > 0,
    `${file}: missing package name`)
  // 直接读取公共 registry，不使用 npm 本地缓存；网络、状态码或 JSON 错误均中止。
  const response = await fetch(`https://registry.npmjs.org/${encodeURIComponent(pkg.name)}`, {
    cache: 'no-store',
    headers: { accept: 'application/vnd.npm.install-v1+json' },
    signal: AbortSignal.timeout(30_000),
  })
  assert.ok(response.ok, `${pkg.name}: registry query failed (${response.status})`)
  const metadata = await response.json()
  assertDistTagForward({ name: pkg.name, version: pkg.version, distTag,
    distTags: metadata['dist-tags'] })
  checked++
}
assert.ok(checked > 0, 'no publishable packages were checked')
```

这里通过 Node 的 `fetch` 禁用缓存并读取公共 npm registry；不要换成可能在网络失败时回退到本地旧缓存的 `npm view --prefer-online`。上传也必须使用同一 registry，不能被项目的 `.npmrc` 或 `publishConfig.registry` 改到别处。包已经过手动首发，所以查询包得到 404 也应中止；只有**成功读到合法的 dist-tags 对象，但没有目标键**才允许初始化渠道。历史版本如确需发布，应另行设计不会覆盖现有渠道的流程，不能绕过本门禁。

多包发布要先通过每个包的发布门禁，再把全部待发包的清单传给防回退脚本；所有检查成功后才能开始上传。共享锁必须覆盖这些检查和全部上传，不能在门禁结束后释放。

## 发布说明

从 changelog 截取当前 tag 的段落，作为 GitHub Release 正文；可在末尾追加安装命令：

```markdown
### Installation

```sh
npm i <包名>@<版本>
```
```

`notes` 写到 `$RUNNER_TEMP/release/notes.md`，由 `gh release create --notes-file` 使用。

## 本地干跑

```bash
node scripts/prepare-release.mjs v0.2.0 .release-dry-run
```

这一条应当在打标签之前在本地跑一次。它和执行在 CI 里的是同一个函数，不存在“本地过了 CI 挂”的两套逻辑。

把 `.release-dry-run/` 加进 `.gitignore`，避免把生成的发布说明提交进去。

## 不要做的

- 不要在 YAML 里用 `if` 拼版本号正则——分支一多就没人敢改。
- 不要在脚本里读环境变量来决定校验项，校验项应当只取决于输入。
- 不要把 `package.json` 的修改写回磁盘；门禁只读。
