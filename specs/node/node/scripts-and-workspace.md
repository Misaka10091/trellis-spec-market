# 脚本与 workspace

`package.json` 的 `scripts` 是项目的可执行入口，workspace 是多包仓库的组织方式。两者都该让“怎么跑”一眼可见，而不是散落在文档和别人的记忆里。

## scripts 约定

统一入口命名，跨包保持一致：

| 脚本 | 作用 | 备注 |
| --- | --- | --- |
| `dev` | 本地开发（watch / 热更新） | 不用于 CI |
| `build` | 产出可分发的构建物 | 产物目录写进 `.gitignore` |
| `test` | 跑测试 | 单元测试默认入口 |
| `lint` | 静态检查 | 只检查，不自动改 |
| `format` | 格式化 | 另配 `format:check` 供 CI 校验 |
| `typecheck` | 类型检查（TS） | 与 `build` 分开，便于快速反馈 |

规则：

- **命令写进 `scripts`，不写进文档让人手敲**。文档只说 `pnpm dev`，不说一长串 `node --loader ...`。
- **用本地依赖，不用全局工具**。`eslint`、`vitest` 走项目内的 `devDependencies`；需要时用 `pnpm exec <bin>`，而不是假设全局装过。
- **跨平台**：脚本要在 Linux / macOS / Windows 上都能跑。避免 `&&` 之外的特殊 shell 语法；需要设环境变量用 `cross-env`，需要逻辑就写一个小 `.mjs` 脚本。
- **冒号分组**子任务：`test:unit`、`test:e2e`、`build:watch`；顶层 `test` 汇总跑全部。
- **`pre` / `post` 钩子慎用**：隐式执行难排查；确需时在脚本名或文档里写清楚它会顺带跑什么。
- `prepare` 只做“安装后必须发生一次”的事（如构建本地包、装 git hooks），不要塞耗时任务。

```jsonc
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint .",
    "format:check": "prettier --check .",
    "typecheck": "tsc --noEmit"
  }
}
```

## workspace（多包仓库）

用 `pnpm-workspace.yaml` 声明包目录，根 `package.json` 作为“编排层”：

```yaml
# pnpm-workspace.yaml
packages:
  - 'packages/*'
  - 'apps/*'
```

- **根 `package.json` 设 `"private": true`**：根不是发布物，只用来跑跨包脚本、放共享的 `devDependencies`。
- **跨包依赖用 `workspace:` 协议**：`"@scope/core": "workspace:^"`。本地链接、发布时按规则替换成真实版本，别写死本地路径。
- **共享配置放根**：`tsconfig` 的 base、lint / format 配置、测试预设提升到根，子包 `extends` 或引用，避免每个包抄一遍。
- **只把需要的包发布出去**：其余标 `private: true`；发布流水线见 `npm-publish` 模板。

在根跑跨包命令，用递归与过滤：

```bash
pnpm -r build                          # 按拓扑顺序，所有含 build 的包依次构建
pnpm -r --filter "./packages/*" test   # 只对 packages 下的包跑测试
pnpm --filter @scope/core build        # 只构建一个包（含它的依赖）
```

## 依赖方向

多包仓库最容易烂在依赖关系上。约定：

- **单向**：底层 `core` / `shared` 不反向 import 上层 `app` / `ui`。
- **共享逻辑下沉**：两个包都要用的代码提到最底层的共享包，而不是互相 import。
- **禁止循环依赖**：`a -> b -> a` 会让构建顺序无解、类型也互相牵扯；发现就拆公共部分。
- **构建顺序交给 pnpm**：`pnpm -r build` 按 workspace 依赖拓扑排序，前提是依赖写对了（用 `workspace:` 协议）。

| 反模式 | 后果 | 正确做法 |
| --- | --- | --- |
| 子包互相用 `file:` / 相对路径引用 | 发布后路径失效、循环风险 | 用 `workspace:` 协议 |
| 根目录塞业务代码 | 编排层变成第二个应用 | 根只放脚本与共享配置 |
| 每个包各写一套 lint / tsconfig | 规则漂移，改一处要改十处 | 提升到根，子包 extends |
| 在 app 里直接 import core 的内部文件 | 破坏封装、升级困难 | 走包的公开入口（`exports`） |

## 常见坑

| 现象 | 原因 | 修法 |
| --- | --- | --- |
| 根跑 `pnpm build` 什么都没发生 | 根没有 `build` 脚本，也没 `-r` | 用 `pnpm -r build` 或给根加汇总脚本 |
| 子包改了不生效 | 本地包被当成注册表版本装了 | 确认用 `workspace:` 协议并在根 `pnpm install` |
| CI 上脚本找不到命令 | 依赖没装在当前包，或用了全局工具 | 把工具加进该包 `devDependencies`，用 `pnpm exec` |
| Windows 上脚本报错 | 用了 POSIX 专有语法 | 改 `cross-env` 或写成 `.mjs` 脚本 |
