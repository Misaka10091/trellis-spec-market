# 浏览器侧插件

浏览器侧运行在 DSH web 的启动图里，由 `exports["./client"]` 提供。

## 加载器契约

```js
window.__ModuleLoader__.load({
  id: '@scope/dsh-my-plugin',        // 必须等于包名
  factory(require) {
    return {
      inject: [],
      apply(ctx) {
        // 挂载界面
        return () => { /* 卸载 */ }
      },
    }
  },
})
```

- 这个文件**只注册工厂**，不能出现顶层 `import` 或 `export`。原生 ESM 语法合法、`node --check` 也会通过，但会破坏加载器契约，所以只能靠测试拦住——`tests/package.test.mjs` 会断言不存在顶层 ESM 语句。
- 模块 `id` 必须等于包名。不一致的结果是：插件装上了，但永远不会挂载。
- 共享运行时模块写进 `dsh.client.inject`，通过 `require` 参数读取。它们不是 npm 依赖，不得出现在 `dependencies` 里。

## 生命周期

- `apply` 可以返回清理函数；只要挂载了监听器、定时器、观察器或对象 URL，就必须返回。
- 不允许模块级可变状态和跨挂载缓存：热重载或禁用之后，不能留下多余的界面、轮询或监听器。
- UI 插槽是集成点；不要伸手去操作你不拥有的宿主内部结构或 DOM。

## 向宿主发请求

用相对于挂载点的路径，并基于 `document.baseURI` 解析，这样部署在子路径下也能访问到。要区分“这个入口按设计就不可用”（给出解释）和“请求失败了”（给出重试）；设计上就该返回 403 的情况，不能渲染成加载失败。
