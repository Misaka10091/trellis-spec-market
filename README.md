# Trellis Spec Market

个人的 Trellis 规范模板库，供 `trellis init --registry` 安装。同一个仓库放多套技术栈的规范，按 `--template <id>` 选择。

> 非官方项目，个人维护。[Trellis 官方仓库](https://github.com/mindfold-ai/Trellis)与本仓库无关。

装进项目后，规范属于那个项目，团队按实际代码继续编辑——它不是远程同步的 wiki。

## 现有模板

| id | 内容 | 位置 |
| --- | --- | --- |
| `dsh-plugin` | DeepSeek Harness 插件：宿主/浏览器契约、清单、打包、发布、测试 | [`specs/dsh-plugin/`](./specs/dsh-plugin/index.md) |
| `npm-publish` | GitHub Actions 发布 npm：标签触发、OIDC、来源证明、分发标签 | [`specs/npm-publish/`](./specs/npm-publish/npm-publish/index.md) |

## 安装

```bash
# 按 id 安装
trellis init --registry gh:Misaka10091/trellis-spec-market --template dsh-plugin

# 已有项目只补缺失文件，不覆盖本地改动
trellis init --registry gh:Misaka10091/trellis-spec-market --template dsh-plugin --append

# 固定到 tag
trellis init --registry gh:Misaka10091/trellis-spec-market#spec-v1 --template dsh-plugin

# direct 模式：跳过索引，直接装某个模板目录
trellis init --registry gh:Misaka10091/trellis-spec-market/specs/dsh-plugin --append
```

需要 Trellis 0.7.0-beta 以上（`--registry` 在该版本可用）。

### 同时装多个模板

`--template` 是单值参数，**一次 init 只能装一个**。要叠加就多跑几次，每次都带 `--append`：

```bash
trellis init --registry gh:Misaka10091/trellis-spec-market --template dsh-plugin   --append
trellis init --registry gh:Misaka10091/trellis-spec-market --template npm-publish --append
```

有两个由 CLI 行为带来的限制，设计模板时必须知道：

1. **落点相同**。所有模板都复制到 `.trellis/spec/` 根下，`--append` 只补缺失文件，同名路径会被**静默跳过**。所以每个模板要么独占根目录，要么像 `npm-publish` 那样把内容放进自己的子目录（装成 `.trellis/spec/npm-publish/`）。`scripts/check.mjs` 会校验两个模板之间没有重名路径。
2. **升级记录只有一个**。`.trellis/config.yaml` 的 `registry.spec` 只保存一个 `source` + `template`，后装的会覆盖先装的，`trellis update` 只会刷新最后那个。要用 `trellis update` 管理多个模板，目前还做不到；升级其余模板需要重新跑一次 init。

## 新增一个模板

1. 建目录 `specs/<id>/`，放入最终要落到 `.trellis/spec/` 的文件，至少一个 `index.md`。
   **不要**再套一层 `spec/`，否则会装成 `.trellis/spec/spec/...`。
2. 在 `index.json` 的 `templates` 里登记：

   ```json
   {
     "id": "spring-boot",
     "type": "spec",
     "name": "Spring Boot 服务",
     "description": "分层、事务、异常与测试约定。",
     "path": "specs/spring-boot",
     "tags": ["java", "spring"]
   }
   ```

   `id` 是 CLI 的 `--template` 值，改名等于破坏兼容；`path` 相对**仓库根**。
3. 跑校验：`node scripts/check.mjs`。
4. 在临时目录实装一遍，确认落点是 `.trellis/spec/index.md`。
5. 打 tag 并更新本文件的模板表。

## 命名与版本

- `id` 用 `<技术栈>[-<变体>]`，全小写、连字符分隔：`dsh-plugin`、`spring-boot`、`next-app`。
- 破坏性重写换新 id（如 `dsh-plugin-v2`），不要原地改语义。
- 对外承诺用 tag：`spec-v1`、`spec-v2`。上游改动不会自动影响已安装的项目，项目侧升级要单独 review。
- 小改动沿用同一个 tag 线即可，不必每改一次就发新版。

## 维护流程

```bash
node scripts/check.mjs     # 索引字段、path 落点、index.md、占位符、内部链接
```

CI 会在每次 push 与 PR 上跑同一条命令。

## 可以放什么

- 技术栈的目录结构、模块边界、依赖方向。
- 接口、测试、错误处理、发布规则。
- 从真实项目整理、已去掉私有信息的示例。
- 任务完成前的检查清单。

## 不要放什么

- 密钥、内部地址、客户数据、私有事故记录。
- `.trellis/tasks/`、`.trellis/workspace/` 或任何运行态。
- `.claude/`、`.codex/` 这类平台配置——属于 Trellis 平台定制。
- 只对某一个仓库成立的产品需求。

## 关联项目

生成器 `create-dsh-plugin-trellis` 只生成插件骨架，不内置本仓库的规范；生成后按上面的命令安装。

## License

MIT
