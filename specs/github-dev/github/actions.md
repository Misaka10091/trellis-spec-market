# Actions 卫生

工作流是代码，同样要评审。这里列的是评审时真正该看的东西。

## 权限

```yaml
permissions:
  contents: read        # 工作流级默认只读
```

需要写权限时在 **job 级**提升，只给用得到的那个：

```yaml
jobs:
  publish:
    permissions:
      id-token: write   # OIDC
      contents: write   # 创建 Release
```

不要省略 `permissions` 依赖仓库默认值——默认值可能随仓库设置变化，而显式声明让权限成为可评审的代码。

## 固定第三方 action

```yaml
- uses: actions/checkout@v7       # 可接受：主版本
- uses: some/action@<40位SHA>     # 高保障：不可变
```

禁止 `@main` / `@master`：上游一次提交就能改变你的构建行为。安全要求高时用 SHA 并配 Dependabot 更新。

## 不可信输入

`pull_request_target` 在**基仓库**上下文中运行，能拿到 secret。一旦它 checkout 了 PR 的代码并执行，等于把 secret 交给任意贡献者。

规则：

- 不要用 `pull_request_target` + checkout PR head + 执行构建/测试。
- 需要给 fork PR 评论或打标签时，单开一个 `pull_request_target` 作业，**不 checkout PR 代码**，PR 标题/正文经 `env:` 中转。同仓库 PR 可以用 `pull_request` + `permissions: pull-requests: write`；但 fork PR 的 `GITHUB_TOKEN` 恒为只读，写权限声明不会生效。
- 既要跑 PR 代码又要写权限时，用 `workflow_run` 把“跑代码”和“回写 PR”拆成两个工作流。
- 表达式 `${{ github.event.* }}` 出现在 `run:` 里就是注入面；用 `env:` 中转。

## 触发与并发

```yaml
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true
```

CI 用 `cancel-in-progress: true`（新提交作废旧跑）；发布用 `false`（不许打断进行中的发布）。

`workflow_dispatch` 给运维留一条可控的手动入口，比“改代码再推一次”安全。

## 超时与缓存

- 每个 job 都设 `timeout-minutes`。默认六小时，卡住的进程会让日志毫无线索。
- 缓存 key 要含锁文件哈希（`setup-node` 的 `cache: npm` 已这么做）。手工缓存时漏掉哈希，就会拿到过期依赖。
- 不在发布 job 缓存 `node_modules`。

## 依赖安装

用 `npm ci --ignore-scripts` 而不是 `npm install`：前者严格按锁文件，后者可能改写锁文件；`--ignore-scripts` 让第三方包无法在 CI 里执行任意脚本。

## 日志与 secret

- 不 `echo` 环境变量；GitHub 只会遮蔽**已注册**的 secret，派生值仍会泄漏。
- 调试时打印命令可以，打印 `env` 不行。
- fork PR 拿不到 secret，这是特性；不要为了“让 fork PR 也能跑完整测试”去改触发方式。

## 自托管 runner

公开仓库不要给自托管 runner 打标签——任何 fork PR 都可能在其上执行任意代码，而 runner 通常持有内网可达权限。必须用时，只接受来自受信分支的 job。
