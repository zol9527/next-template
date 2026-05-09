# 自定义 TabBar 维护说明

微信小程序的 `custom-tab-bar` 不是普通 Vue 组件。只要 `src/pages.json`
里配置了 `"tabBar": { "custom": true }`，微信运行时就会查找并渲染
项目根目录下的 `custom-tab-bar/index.wxml|wxss|js|json`。

在本项目里，源码入口是 `src/custom-tab-bar/`，编译后会进入
`dist/build/mp-weixin/custom-tab-bar/`。

## 修改位置

- 菜单结构和菜单项：改 `src/custom-tab-bar/index.wxml` 与 `src/custom-tab-bar/index.js`
- 菜单视觉样式、高度、安全区：改 `src/custom-tab-bar/index.wxss`
- Vue 页面选中态同步逻辑：改 `src/utils/tab-bar.ts`

## 页面里怎么同步选中态

Vue 页面不要直接写 `getCurrentPages()`、`getTabBar()`、`setData()`。
统一使用：

```ts
import { syncCustomTabBar } from '@/utils/tab-bar'

syncCustomTabBar()
```

`syncCustomTabBar()` 会根据当前页面路径自动匹配底部菜单项。

## 为什么没有完全写成 `.vue`

普通 Vue 组件只能在页面模板里被 Vue 渲染；微信小程序自定义 tabBar
由微信运行时单独加载，必须存在 `custom-tab-bar/index.*` 这组原生文件。

不要在 `custom-tab-bar/index.js` 里 `require('./config.json')`。部分微信运行时
对自定义 tabBar 目录里的 JSON require 支持不稳定，可能导致组件初始化失败，
表现为底部菜单直接消失。
