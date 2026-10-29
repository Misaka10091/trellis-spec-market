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
- 失败直接抛错，非零退出；成功把 `dist_tag` 写进 `GITHUB_OUTPUT`

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

版本含预发布标识就进 `next`，否则进 `latest`。这条规则只出现在脚本里，YAML 中不重复。

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

## 不要做的

- 不要在 YAML 里用 `if` 拼版本号正则——分支一多就没人敢改。
- 不要在脚本里读环境变量来决定校验项，校验项应当只取决于输入。
- 不要把 `package.json` 的修改写回磁盘；门禁只读。
