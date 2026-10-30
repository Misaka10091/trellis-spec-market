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
| `engines.dsh` | 宿主 DSH 的 SemVer 兼容范围（如 `>=0.2.1-rc.1`）；安装与 profile 加载前会校验，超出范围默认拒绝，仅当前 profile 的精确版本豁免可放行 |
| `dsh.manifestVersion` | 清单格式标识，当前为 `1`；与包版本无关 |
| `dsh.bundle.patch` | `./cordis.patch.yml`，或按顺序排列的路径列表（作为一个 bundle 层依次应用） |
| `dsh.client.platform` | `"web"` |
| `dsh.client.inject` | 浏览器侧要 `require` 的共享运行时模块 |
| `files` | 白名单——压缩包内容就是契约 |

`peerDependencies["@deepseek-ai/dsh"]` 应与 `engines.dsh` 同范围，并保持 `optional`，这样直接 `npm i` 不会把宿主一起拉下来。

以上兼容性门禁已在 DSH `0.2.1-rc.3` 核实：检查读取 `package.json`，声明 `engines.dsh` 时以它为准；未声明时才检查 DSH 相关 peer 范围。安装前检查不兼容会拒装；安装后检查失败会恢复 profile 的清单和锁文件，并尝试恢复依赖树，恢复失败会提示修复。DSH 也会在 profile 加载前禁用未获豁免的不兼容插件。

版本豁免绑定**完整包名 + 插件精确版本 + DSH 精确版本**，只对当前 profile 生效，需用户显式接受风险；插件或宿主升级后不会自动沿用。不要把声明范围或获得豁免当作已经测试兼容。

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
