# DSH Plugin 规范

> DeepSeek Harness 插件约定：纯 ESM JavaScript，无构建步骤。
> 以 Trellis 规范模板的形式维护；项目安装后拥有自己的副本，应继续按实际情况编辑。

## 分册

| 文件 | 内容 |
| --- | --- |
| [host-plugin.md](./host-plugin.md) | `apply`/`inject`、生命周期归属、配置与落盘 |
| [client-plugin.md](./client-plugin.md) | `__ModuleLoader__`、`require`、UI 插槽、清理 |
| [packaging.md](./packaging.md) | 两份清单、`files` 白名单、补丁行、资源文件 |
| [release.md](./release.md) | 版本同步、变更记录门禁、分发标签、来源证明 |
| [testing.md](./testing.md) | `node:test` 不变量测试与加载器契约测试 |

## 动手前自查

- [ ] 写注册逻辑前，先读过现有的 `src/index.js` 与 `src/client.js`？
- [ ] 这段行为属于宿主侧、浏览器侧，还是两侧都要？两侧契约不同。
- [ ] 你注册的东西会不会比插件生命周期更长？会的话必须挂到 effect 上。
- [ ] 是不是新增了要随包发布的文件？是的话 `package.json` 的 `files` 也要加。
- [ ] 是不是新增了宿主 API？是的话 `engines.dsh` 与 peer 范围要一起抬高。

## 质量门

```bash
npm run check            # 语法 + 结构检查 + node:test 不变量
npm pack --dry-run       # 实际发布的文件列表本身也是契约
node scripts/prepare-release.mjs vX.Y.Z .release-dry-run   # 打标签前跑
```

`npm run check` 通过、并且 `npm pack --dry-run` 既包含全部运行期文件、又不夹带非运行期文件，才算改完。
