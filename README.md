# Trellis Spec Market

个人的 Trellis 规范模板库，供 `trellis init --registry` 安装。一个仓库放多套互不依赖的规范：**任意装一套，或任意叠加装多套**，互不覆盖。

> 非官方项目，个人维护。[Trellis 官方仓库](https://github.com/mindfold-ai/Trellis)与本仓库无关。

装进项目后，规范属于那个项目，团队按实际代码继续编辑——它不是远程同步的 wiki。

## 目录结构

```
trellis-spec-market/
├── index.json                 # marketplace 索引（id -> specs/<id>）
├── scripts/check.mjs          # 结构校验（CI 跑它）
└── specs/
    ├── dsh-plugin/            # 模板包：id = dsh-plugin（path 指这里）
    │   └── plugin/            #   安装命名空间 -> .trellis/spec/plugin/
    ├── npm-publish/           # 模板包：id = npm-publish
    │   └── release/           #   安装命名空间 -> .trellis/spec/release/
    └── github-dev/            # 模板包：id = github-dev
        └── github/            #   安装命名空间 -> .trellis/spec/github/
```

关键约定：

- **模板 id 是“包名”，包内顶层目录是“安装命名空间”。** `--registry` 安装时，CLI 会把 `path` 目录（即 `specs/<id>/`）的**内容**原样拷进 `.trellis/spec/`，所以 `specs/<id>/<命名空间>/` 最终落到 `.trellis/spec/<命名空间>/`。
- **命名空间名就是安装后的目录名，必须全局唯一。** 它们互不重叠，才能“单独装 / 任意叠加装”都不撞文件。`scripts/check.mjs` 强制这条。
- 不要把文件直接放在 `specs/<id>/` 根下——那会落到 `.trellis/spec/` 根，跟别的模板或 Trellis 自带文件冲突。
- 这与官方 marketplace 的 `specs/<id>/{backend,frontend,shared,guides}/` 是同一形状：模板 id 和安装目录本来就不同名。

## 现有模板

| id | 内容 | 安装到 | 位置 |
| --- | --- | --- | --- |
| `dsh-plugin` | DeepSeek Harness 插件：宿主/浏览器契约、清单、打包、发布、测试 | `.trellis/spec/plugin/` | [`specs/dsh-plugin/plugin/`](./specs/dsh-plugin/plugin/index.md) |
| `npm-publish` | GitHub Actions 发布 npm：标签触发、OIDC、来源证明、分发标签 | `.trellis/spec/release/` | [`specs/npm-publish/release/`](./specs/npm-publish/release/index.md) |
| `github-dev` | GitHub 开发规范：分支保护、PR、Actions 卫生 | `.trellis/spec/github/` | [`specs/github-dev/github/`](./specs/github-dev/github/index.md) |

三者安装后各占一个领域目录：

```
.trellis/spec/
├── plugin/
├── release/
└── github/
```

## 安装

`--template` 是单值参数，一次 `init` 只装一个；要叠加就多跑几次，后续每次带 `--append`（只补缺失文件；所有已有文件都会跳过，包括从未被本地修改的旧版文件）。

```bash
# 装单个
trellis init --registry gh:Misaka10091/trellis-spec-market --template dsh-plugin

# 叠加任意多个
trellis init --registry gh:Misaka10091/trellis-spec-market --template npm-publish  --append
trellis init --registry gh:Misaka10091/trellis-spec-market --template github-dev   --append

# 钉到 tag 或 commit，保证可复现
trellis init --registry gh:Misaka10091/trellis-spec-market#v2.0.0 --template dsh-plugin
```

> 不带 `#ref` 时默认走 `main`。要绝对可复现就把 `#v2.0.0` 换成具体 commit SHA。

需要 Trellis 0.7.0-beta 以上（`--registry` 在该版本可用）。

### 两个来自 CLI 的限制

1. **落点相同**：所有 spec 模板都复制到 `.trellis/spec/`，`--append` 只补缺失文件。所以本仓库用**全局唯一的安装命名空间**保证叠加不冲突（见上）。
2. **升级记录只有一个**：`.trellis/config.yaml` 的 `registry.spec` 只保存一个 `source` + `template`，后装的会覆盖先装的；`trellis update` 只能按这条记录刷新对应模板，不能跟踪全部已安装模板。重跑 `init ... --append` 只能补装缺失文件，**不会升级任何已有文件**。

### 升级已安装的规范

以下行为已按 Trellis `0.7.0-beta.4` 核对。补装用 `--append`；升级已有内容时，对每套模板单独比较、合并：

1. 先提交或备份项目中的 `.trellis/spec/`，记录每套模板上次安装的 tag 或 commit SHA。
2. 把本仓库下载到项目之外的一个未占用目录，检出目标 tag 或 SHA。例如，在项目根执行：

   ```bash
   git clone https://github.com/Misaka10091/trellis-spec-market.git ../trellis-spec-market-upstream
   git -C ../trellis-spec-market-upstream checkout --detach v2.0.0
   git diff --no-index -- .trellis/spec/plugin ../trellis-spec-market-upstream/specs/dsh-plugin/plugin
   ```

   示例中的 `v2.0.0` 换成实际目标版本；`git diff --no-index` 返回 `1` 表示发现差异。
3. 按文件 review：新增文件可补入；已有文件逐个合并上游修正并保留项目定制；上游删除或改名的文件先确认用途再处理。已记录旧 ref 时，先比较旧版与新版上游，再把这部分变化合入本地；没有旧 ref 时，不要把本地差异一概当作上游变化。
4. 对 `npm-publish/release/`、`github-dev/github/` 等其它已装模板重复比较。检查安装后的入口与内部链接，review 项目 diff，并在项目中记录各模板的新 ref 后提交。

`trellis update` 可以使用最后一条 registry 记录的正常冲突处理流程，但不能代替上述多模板升级流程；不要用 `--append` 或整目录覆盖来跳过合并。

## 新增一个模板

1. 建 `specs/<id>/<命名空间>/`，命名空间全局唯一，至少放下 `index.md`。
   命名空间名就是安装后的目录名（例如 `plugin`、`release`）。
   **不要**把文件直接放进 `specs/<id>/`，也不要多套一层固定名（否则会装成 `.trellis/spec/spec/...`）。`scripts/check.mjs` 会强制所有文件都在某个命名空间目录下。
2. 在 `index.json` 的 `templates` 里登记（`path` 指向模板包目录，相对**仓库根**）：

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

   `id` 是 CLI 的 `--template` 值，改名等于破坏兼容。
3. 跑校验：`node scripts/check.mjs`。
4. 在临时项目里实装一遍，确认落点是 `.trellis/spec/<命名空间>/index.md`。
5. 提交、打 tag，并更新本文件的模板表。

## 命名与版本

- `id` 用 `<技术栈或领域>`，全小写、连字符分隔：`dsh-plugin`、`npm-publish`、`spring-boot`。
- 命名空间用**领域名**，不要用包名：`plugin`、`release`、`github`。它决定安装后的 `.trellis/spec/<dir>/`，一旦发布就当作稳定路径。
- 破坏性重写换新 `id`（如 `dsh-plugin-v2`），不要原地改语义；改安装命名空间同样是不兼容变化，按 SemVer 抬 MAJOR。
- 版本用 **SemVer**：`vMAJOR.MINOR.PATCH`，标签带 `v` 前缀：
  - **MAJOR**：不兼容变更——安装路径 / 命名空间改名、删除模板、改 `id` 语义、迁移布局。
  - **MINOR**：向后兼容的新增——加模板、加分册、补内容。
  - **PATCH**：修正——措辞、链接、错别字、示例。
- 已发布的 tag 不移动、不复用。历史 `spec-v1` 保留不动（对应 1.x 线）；当前布局重排属于破坏性变更，发布为 `v2.0.0`。
- 安装时钉到 tag 或 commit SHA 最稳；日常跟 `main` 也行。
- 上游改动不会自动影响已安装的项目，项目侧升级要单独 review。

## 从 `spec-v1` 迁移到 `v2.0.0`

`spec-v1` 是旧的 tag（无 SemVer 前缀，对应 1.x）。当时是旧布局：`dsh-plugin` 的 `index.md`、`host-plugin.md` 等直接铺在 `.trellis/spec/` 根上，`npm-publish` 落在 `.trellis/spec/npm-publish/`。

`v2.0.0` 起改为领域命名空间：`plugin/`、`release/`、`github/`。装过旧版的项目，升级前先删掉旧文件，否则新旧两份规范会同时存在：

```bash
# 先确认这些是插件规范（首行应为 "# DSH Plugin 规范"），不是别的东西
head -1 .trellis/spec/index.md

rm -f .trellis/spec/index.md
rm -f .trellis/spec/host-plugin.md .trellis/spec/client-plugin.md \
      .trellis/spec/packaging.md .trellis/spec/release.md .trellis/spec/testing.md
rm -rf .trellis/spec/npm-publish

# 再按新布局重装
trellis init --registry gh:Misaka10091/trellis-spec-market#v2.0.0 --template dsh-plugin --append
```

这些文件如果被本地改过，先把差异合进新目录再删。

## 维护流程

```bash
node scripts/check.mjs     # 索引字段、path 落点、命名空间唯一、index.md、占位符、内部链接
```

CI 会在每次 push 与 PR 上跑同一条命令。

改动合入 `main` 后按 SemVer 打 tag（例：本次布局重排是破坏性变更，故为 `v2.0.0`）：

```bash
git tag -a v2.0.0 -m "v2.0.0: domain namespace layout"
git push origin v2.0.0
```

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
