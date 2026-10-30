# 仓库配置

这些是仓库设置，不是代码，但决定了一个项目能不能长期维护。

## 默认分支

统一用 `main`。`master` 只应在迁移成本极高时保留，且不要两套并存。

## 分支保护（`main`）

至少开启：

| 规则 | 理由 |
| --- | --- |
| Require a pull request before merging | 直推没有评审，也没有 CI 强制 |
| Require approvals ≥ 1 | 作者不能自己批准自己的 PR |
| Dismiss stale approvals on new commits | 批准后再改代码，等于批准了没看过的内容 |
| Require status checks to pass | 列出真正必过的 job，不要全选 |
| Require branches to be up to date | 避免“合并后才发现冲突” |
| Require linear history | 配合 squash，历史可读 |
| Do not allow force pushes | 已评审的提交不应被替换 |
| Do not allow deletions | 防误删 |

管理员豁免要谨慎：一旦 `main` 上出现“管理员可以直接推”，规矩就只对新人有效。

## CODEOWNERS

放在 `.github/CODEOWNERS`，按目录指定责任人：

```
*                       @owner
/.github/               @owner
/specs/                 @owner
```

作用是把“谁该看这个 PR”变成仓库事实，而不是靠记忆。注意：CODEOWNERS 只在开启 “Require review from Code Owners” 后才是强制的。

## 合并策略

只保留一种：**Squash and merge**。理由：一个 PR 对应一个提交，回滚粒度清晰，`main` 上不出现 “fix typo” 这类噪声。

配置后关掉 merge commit 与 rebase merge，避免同仓库出现三种历史形状。合并后自动删除源分支。

## 安全开关

| 设置 | 建议 |
| --- | --- |
| Dependabot alerts | 开 |
| Dependabot security updates | 开 |
| Dependabot version updates | `.github/dependabot.yml`，按生态分组、每周一次 |
| Secret scanning | 开（公开仓库默认开） |
| Private vulnerability reporting | 开，`SECURITY.md` 写明流程 |
| Code scanning | 有语言支持时开 |

依赖更新 PR 也要过 CI，不要给 Dependabot 开自动合并——除非该生态的测试足够可信。

## 仓库最低内容

- `README.md`：是什么、怎么装、怎么用、怎么跑测试
- `LICENSE`
- `SECURITY.md`：怎么报漏洞、多久响应
- `CONTRIBUTING.md`：本地怎么跑、PR 要求（可与本规范互相引用）
- `.gitignore`：至少排除依赖目录、构建产物、本地环境文件

## 提交物边界

- 不提交 `node_modules/`、构建产物、二进制、本地配置文件。
- 不提交生成物与源文件并存的情况，除非生成物是分发所必需，且 CI 会校验它是否过期。
- 大文件用 Releases 或对象存储，不进 Git 历史——历史里的二进制几乎无法删除。
