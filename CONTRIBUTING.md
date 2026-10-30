# 贡献指南

这个仓库只放 Trellis 规范模板，不放产品代码。

## 本地校验

需要 Node.js 24：

```bash
node scripts/check.mjs
```

校验内容：索引字段、模板 `path` 落点、命名空间全局唯一、`index.md`、占位符、内部链接。

## 新增或修改模板

- 目录形状固定为 `specs/<id>/<命名空间>/`：外层 `<id>/` 是 `index.json` 的 `path`（模板包），内层是安装命名空间（决定装到 `.trellis/spec/<命名空间>/`）。
- 命名空间用领域名（`plugin`、`release`、`github`），且必须**全局唯一**，保证任意组合安装不冲突。
- 在 `index.json` 的 `templates` 里登记，`path` 相对仓库根。
- 细节见 README 的「新增一个模板」。
- 装进项目后的副本由项目自行维护；这里只改上游版本。

## 提交与 PR

- Conventional Commits：`feat` / `fix` / `docs` / `refactor` / `test` / `chore`。
- 每个 PR 填完模板四段（做了什么、为什么、怎么验证、风险与回滚）。
- CI 必须全绿，失败原因要定位，不要靠重跑。
- 不提交密钥、内部地址、客户数据；不提交 `.trellis/tasks/`、`.trellis/workspace/` 等运行态。

## 发版

合入 `main` 后由维护者按 SemVer 打 tag（`vMAJOR.MINOR.PATCH`，当前为 `v2.0.0`），见 README 的「维护流程」。
