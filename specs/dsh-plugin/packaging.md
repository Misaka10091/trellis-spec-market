# 打包

DSH 插件要交付两份清单，两者必须一致。

## `package.json`

| 字段 | 规则 |
| --- | --- |
| `name` | 真实的 npm 包名；浏览器模块 `id` 必须与它相同 |
| `type` | `"module"` |
| `main` / `exports["."]` | 宿主入口（`src/index.js`） |
| `exports["./client"]` | 浏览器入口（`src/client.js`） |
| `exports["./locale/*.json"]` | 多语言字典 |
| `engines.node` | 实际测过的 Node 下限 |
| `engines.dsh` | 宿主版本下限；宿主读取的是这个顶层字段 |
| `dsh.bundle.patch` | `./cordis.patch.yml` |
| `dsh.client.platform` | `"web"` |
| `dsh.client.inject` | 浏览器侧要 `require` 的共享运行时模块 |
| `files` | 白名单——压缩包内容就是契约 |

`peerDependencies["@deepseek-ai/dsh"]` 应与 `engines.dsh` 同范围，并保持 `optional`，这样直接 `npm i` 不会把宿主一起拉下来。

## `dsh.plugin.json`

```json
{
  "id": "dsh-external/my-plugin",
  "version": "0.1.0",
  "main": "./src/index.js",
  "description": "...",
  "engines": { "dsh": ">=0.2.1-rc.1" },
  "contributes": { "tools": [], "skills": [] }
}
```

`version` 必须等于 `package.json` 的版本。`npm version` 会跑同步脚本，两者不会漂移；发布门禁还会再校验一次。

## 补丁文件

```yaml
- insert:
    - id: my-plugin
      name: '@scope/dsh-my-plugin'
```

这一行的 `id` 是配置持久化的键：稳定、不带 scope，由包名推导而来。不需要外层 `id` 或 `parent`——没有父节点的 `insert` 会追加到根上。

## 资源

- `locale/<语言>.json` 至少包含 `meta.title` 与 `meta.description`；声明支持哪些语言就交付哪些。
- `icon.svg` 通过 `files` 暴露；只有宿主需要路径时才引用它。

## 不该发布的

测试、`.trellis/`、`.agents/`、`.codex/`、`.github/`、本地运行态，以及任何与环境相关的东西。每次改完 `files` 都用 `npm pack --dry-run` 看一遍——npm 会把 `.gitignore` 从压缩包里丢掉，如果某个工具依赖它，源文件得换个名字存放。
