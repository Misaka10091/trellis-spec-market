# GitHub Actions 发布 npm 包

任何发布到 npm 的仓库都适用：标签触发、OIDC 发布、来源证明、分发标签。与具体语言栈无关。

> 与 `dsh-plugin` 模板的分工：那边讲插件特有的打包与清单，这里讲发布流水线的通用部分。
> 两者文件路径不重叠，可以同时安装。

## 分册

| 文件 | 内容 |
| --- | --- |
| [workflow.md](./workflow.md) | 完整工作流文件、权限、并发、超时、单仓与多包 |
| [release-gate.md](./release-gate.md) | 门禁脚本的接口、必查项、dist-tag 与发布说明 |
| [trusted-publishing.md](./trusted-publishing.md) | 首发手动、OIDC 配置、来源证明、令牌回退 |
| [pitfalls.md](./pitfalls.md) | 故障对照表与反模式 |

## 装进来的位置

本模板的内容会落在 `.trellis/spec/npm-publish/`，不会覆盖 `.trellis/spec/index.md` 或其它模板的文件。

## 质量门

```bash
npm pack --dry-run          # 实际发包内容
node scripts/prepare-release.mjs vX.Y.Z .dry-run   # 若仓库有发布门禁脚本
```

## 三条硬约束

- **首发必须手动**：npm 只能为已存在的包配置 Trusted Publisher。
- **标签与版本必须一致**：`v1.2.3` 对应 `1.2.3`，不一致就失败，不要“先发再看”。
- **同一版本不可重发**：发错了抬版本号，不要试图覆盖。
