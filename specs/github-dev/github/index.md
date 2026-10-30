# GitHub 开发规范

仓库协作、分支与 PR、Actions 卫生。与语言栈无关，任何在 GitHub 上协作的项目都适用。

> 与 `npm-publish` 的分工：那边讲发布流水线与凭据，这里讲日常协作与仓库配置。

## 分册

| 文件 | 内容 |
| --- | --- |
| [repository.md](./repository.md) | 默认分支、分支保护、CODEOWNERS、合并策略、安全开关 |
| [pull-requests.md](./pull-requests.md) | 分支命名、提交信息、PR 模板、评审与合并 |
| [actions.md](./actions.md) | 权限最小化、固定版本、并发与超时、不可信输入 |

## 装进来的位置

本模板的内容会落到 `.trellis/spec/github/`，命名空间全局唯一，不与其它模板的路径冲突。

## 开工前自查

- [ ] 这个改动会进 `main` 吗？是的话走 PR，不直推。
- [ ] 提交信息是否说明了**为什么**，而不只是改了什么？
- [ ] 新增的 workflow 是否声明了最小权限，而不是继承默认值？
- [ ] 是否引入了对 PR 内容的执行（`pull_request_target` + checkout PR 代码）？
- [ ] 改动是否让某个 check 从必过变成可选？那是降低门槛，要单独讨论。

## 质量门

仓库层面（一次性配置，见 `repository.md`）：

- `main` 禁止直推，要求 PR + 至少 1 个 approve + 必需状态检查通过
- 启用 Dependabot 与 secret scanning
- 合并方式统一为 squash，合并后自动删分支

改动层面：

- CI 全绿，且失败原因已定位（不是重跑到绿）
- 无未解决的 review 讨论
