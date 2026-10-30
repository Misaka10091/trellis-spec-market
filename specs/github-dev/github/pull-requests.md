# 分支、提交与 PR

## 分支命名

`<type>/<slug>`，`type` 与提交类型一致：

```
feat/spec-market-templates
fix/registry-path-resolution
chore/bump-node-24
docs/multi-template-guide
```

不要用 `dev`、`test`、`my-branch` 这类无法判断意图的名字，也不要在同一分支上混多个不相关的改动。

## 提交信息

Conventional Commits：

```
<type>(<scope>): <祈使句摘要>

<body：为什么这么改，代价是什么>
```

规则：

- 摘要 ≤ 72 字符，不加句号，用祈使句（`add`，不是 `added` / `adds`）。
- `type` 限定：`feat` `fix` `docs` `refactor` `test` `chore` `perf` `build` `ci`。
- body 讲**原因与取舍**，代码本身已经说明了“改了什么”。
- 破坏性变更在 footer 写 `BREAKING CHANGE:`，不要只靠标题里的 `!`。

squash 合并时，PR 标题就是最终提交信息，所以 PR 标题要按同一标准写。

## PR 描述

模板四段，缺一不可：

```markdown
## 做了什么

## 为什么

## 怎么验证

## 风险与回滚
```

- **怎么验证**要写可复现的步骤或命令，不能只写“测试通过”。
- **风险与回滚**写清影响面与撤回方式；没有风险也要写“无”，表示想过。

## 大小与拆分

目标 diff 300–400 行以内。超过时按“可独立评审、可独立回滚”拆：

- 重命名、格式化单独一个 PR（评审只需确认机械性）
- 依赖升级单独一个 PR
- 功能与重构分开，避免 reviewer 分不清哪些是行为变化

## 评审

- 作者不批准自己的 PR；管理员身份也不该绕过。
- reviewer 关注**契约与边界**：接口、错误处理、并发、数据迁移。风格问题交给 linter，不占人工。
- 提出问题时区分“必须改”与“建议”，后者用 `nit:` 前缀。
- 批准后又有新提交时，GitHub 会作废旧批准（配合 “Dismiss stale approvals”）；重新评审，不要直接合并。

## 合并前检查

- [ ] CI 全绿，且失败原因是定位过的，不是靠重跑
- [ ] 至少一个 approve，且讨论已解决
- [ ] 分支已更新到最新 `main`
- [ ] PR 标题符合提交信息规范（squash 后会成为正式提交）
- [ ] 无临时调试代码、无 `console.log`/`print` 残留、无被注释掉的旧实现

## 不要做的

- 不推 `--force` 到已评审的分支。需要整理历史时用 `--force-with-lease` 并告知 reviewer 重新看。
- 不在同一个 PR 里顺手改无关文件（会拖慢评审，也会污染回滚范围）。
- 不把“CI 会修”当作不写测试的理由。
