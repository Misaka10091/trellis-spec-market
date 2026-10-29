# 测试

纯 `node:test`，不引入框架，不需要构建。

```bash
npm test                      # node --test "tests/*.test.mjs"
npm run check:syntax          # 对每个入口跑 node --check
```

## 两类测试

**包级不变量**（`tests/package.test.mjs`）拦的是发布事故，不是逻辑 bug：

- 两份清单的版本与宿主下限一致
- `files` 里的每个路径都真实存在
- 补丁只插入一行，id 与 name 符合预期
- 浏览器侧没有顶层 `import`/`export`，且 `id` 等于包名
- 每个交付语言的元数据都完整

这类断言应当“脆”一点。它挂了说明发布是错的，而不是测试是错的。

**行为测试**直接调用纯模块。把宿主逻辑拆成 `src/host/` 下的小纯函数，就能脱离运行中的宿主测试：不 import Cordis 上下文，不在模块加载时开套接字。

## 不启动宿主也能验加载器契约

```js
const modules = []
vm.runInNewContext(source, {
  window: { __ModuleLoader__: { load: (m) => modules.push(m) } },
})
assert.equal(modules[0].id, pkg.name)
```

这里执行的是真实的注册路径。断言要落在**注册出来的模块**上，而不是它的副本，否则注册逻辑坏了测试照样绿。

## 不要做的

- 不要 mock 被测对象本身，然后断言 mock 被调用过。
- 不要写“把功能删掉仍然通过”的测试。
- 不要在单元测试里开真实端口；泄漏的套接字会把测试进程挂住。CI 设了任务超时，让这类失败变成有界且可见的。
