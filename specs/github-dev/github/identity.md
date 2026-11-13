# 提交身份与隐私

Git 提交和 Trellis 开发者标识统一使用允许公开的别名；提交邮箱使用本人 GitHub 账户提供的 noreply 地址，不暴露真实姓名、私人邮箱或公司邮箱。

## GitHub noreply 与本地 Git 配置

在 GitHub **Settings → Emails** 中开启：

- **Keep my email addresses private**：网页端 Git 操作使用 GitHub 提供的 noreply 地址。
- **Block command line pushes that expose my email**：作为额外防线；仍需在本地核对提交身份，不能依赖它检查全部个人信息。

从该页面复制本人完整的 noreply 地址。常见格式为 `ID+USERNAME@users.noreply.github.com`，部分旧账户使用 `USERNAME@users.noreply.github.com`；以账户页面显示的值为准，不猜测 ID 或拼接地址。

在仓库内显式配置身份，避免沿用全局配置中的真实姓名或邮箱。以下别名和邮箱均为虚构示例，执行前必须替换为自己的公开别名及完整 noreply 地址：

```bash
git config --local user.name "public-handle"
git config --local user.email "12345678+public-handle@users.noreply.github.com"
```

`user.name` 使用不会暴露真实姓名的 GitHub 用户名或公开别名。GitHub 的邮箱隐私设置不会替本地 Git 改写这个名字，也不会修改已有提交。noreply 地址仍会关联 GitHub 账户，账户用户名本身也应适合公开。

## 提交与合并时核对

提交前在本地检查 Git 实际使用的身份：

```bash
git var GIT_AUTHOR_IDENT
git var GIT_COMMITTER_IDENT
```

两者的姓名都必须是公开别名，邮箱都必须是对应账户的 GitHub noreply 地址。`GIT_AUTHOR_NAME`、`GIT_AUTHOR_EMAIL`、`GIT_COMMITTER_NAME`、`GIT_COMMITTER_EMAIL` 等环境变量及命令行参数可以覆盖配置；IDE、代理或自动化创建提交时也要遵守同一要求。

提交后、推送前，再核对实际写入提交的原始字段：

```bash
git log -1 --format='author: %an <%ae>%ncommitter: %cn <%ce>'
```

PR 要检查本次新增的全部提交；基线为 `origin/main` 时可用：

```bash
git log origin/main..HEAD --format='%h %an <%ae> | %cn <%ce>'
```

同时检查提交正文、`Co-authored-by` / `Signed-off-by` 尾注、PR 正文和附带日志中的姓名与邮箱。协作者的身份由本人提供，保留必要归属，不擅自替别人编造或改写身份；发现真实信息时请本人提供公开别名与 noreply 地址。

网页端提交和 squash 合并时同样核对账户公开姓名、最终作者与邮箱选择。不要假定 squash 会清除源分支上的提交身份。

上述命令输出只在本地核对；分享到 PR、日志或截图前先脱敏。

## Trellis 开发者标识

Trellis 的开发者标识文件是 `.trellis/.developer`。初始化或更换开发者时，显式使用适合公开的 GitHub 用户名或别名，例如 `public-handle`；不要使用真实姓名、邮箱或包含这些信息的标识，即使该文件只保留在本地也一样。

- 初始化工具若从 `git config user.name` 取默认值，先完成上面的仓库身份配置，再检查生成结果，不直接接受未经核对的默认值。
- 检查 `.trellis/.developer` 中的开发者标识，以及 `.trellis/workspace/<developer>/` 的目录名、任务负责人、journal 和其它生成记录中的身份字段；统一使用公开别名，不从系统用户名、真实姓名或邮箱生成路径和署名。
- `.trellis/.developer` 属于本地身份文件，应加入项目根 `.gitignore`：

  ```gitignore
  /.trellis/.developer
  ```

- 保持规范内容可版本化，不要为隐藏身份而忽略整个 `.trellis/`。需要共享的任务或工作记录，必须在公开前逐项检查并脱敏。
- 示例、截图和诊断输出同样使用虚构别名，不把真实姓名或邮箱复制到规范、PR 或公开日志中。

## 已经发现真实信息时

- 尚未推送：先修正配置，再检查并修正本次待推送的提交、Trellis 身份字段、路径与记录。只改 Git 配置不会更新旧提交；amend 默认也会保留原作者，不能当作已修复。
- 已被 Git 跟踪的 `.trellis/.developer`：在确认本地文件保留的前提下移出索引，再添加忽略规则；`.gitignore` 不会自动停止跟踪已有文件。
- 已经推送或公开：告知维护者具体暴露位置，协调修复。删除文件或后续改用 noreply 不能清除历史、PR 引用或已有副本；不要未经协商强推共享历史。

## 参考

- [GitHub：设置提交邮箱](https://docs.github.com/en/account-and-profile/how-tos/email-preferences/setting-your-commit-email-address)
- [GitHub：阻止暴露个人邮箱的命令行推送](https://docs.github.com/en/account-and-profile/how-tos/email-preferences/blocking-command-line-pushes-that-expose-your-personal-email-address)
