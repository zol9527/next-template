# 小程序微信登录与资料授权对接文档

## 文档信息

- 文档日期：2026-03-16
- 适用对象：微信小程序前端、UniApp 小程序端、前后端联调人员
- 适用范围：微信登录、头像昵称补全、手机号授权绑定
- 当前状态：已落地，可用于前后端联调

## 一、改动目的

本次改动的核心目标是把原来的“登录 + 资料获取”强耦合流程，调整为以下三段式流程：

1. 微信登录
   - 只负责确认用户身份并建立系统登录态
2. 头像昵称补全
   - 用户主动授权或主动填写后再更新资料
3. 手机号绑定
   - 在购买、下单、资料完善等业务节点按需触发

这样做的原因：

- `wx.login` 本身拿不到微信明文昵称、头像、手机号
- 用户拒绝头像昵称授权时，不应影响登录成功
- 手机号不是首次登录必要信息，应在业务需要时再授权

## 二、前端需要理解的最终流程

### 2.1 登录阶段

前端只做：

1. 调用 `wx.login`
2. 拿到 `code`
3. 调后端微信登录接口
4. 保存登录态
5. 拉取当前用户信息
6. 判断是否需要引导完善资料

登录阶段不要再把“必须先拿到昵称头像”作为前置条件。

### 2.2 资料补全阶段

前端在以下时机弹出或引导：

- 首次登录成功后
- 用户进入个人中心时
- 用户下单前资料不完整时

补全内容：

- 头像
- 昵称

### 2.3 手机号绑定阶段

前端在以下时机触发：

- 用户准备购买商品时
- 提交订单前
- 用户中心主动绑定手机号时

不要在启动阶段强制拉手机号。

## 三、接口清单

## 3.1 微信登录

- 方法：`POST`
- 当前已实现路径：`/api/v1/auth/wechat`

兼容说明：

- 当前项目已实现并可直接联调的路径为 `/api/v1/auth/wechat`
- 如果未来切出 `/api/v1/auth/wechat/login` 别名，再由后端另行通知前端切换

### 请求体

```json
{
  "code": "wx-login-code"
}
```

### 兼容期旧请求体

如果后端暂时还兼容旧登录 DTO，也可能接受：

```json
{
  "code": "wx-login-code",
  "nickname": "可选",
  "avatarUrl": "https://example.com/avatar.png"
}
```

前端新逻辑不要依赖这两个旧字段。

### 响应体

```json
{
  "success": true,
  "data": {
    "userId": "uuid",
    "accessToken": "token",
    "refreshToken": "token"
  }
}
```

### 前端接入要求

- 登录时只提交 `code`
- 登录成功后立即请求“当前用户信息”接口
- 再根据用户资料是否完整决定是否弹资料补全

## 3.2 微信资料补全

- 方法：`POST`
- 路径：`/api/v1/user/profile/wechat`

### 请求体

```json
{
  "nickname": "张三",
  "avatarUrl": "https://example.com/avatar.png"
}
```

### 响应体

```json
{
  "success": true,
  "data": {
    "message": "资料补全成功"
  }
}
```

### 前端接入要求

- 需要用户已登录
- 请求前必须确保本地有系统登录态
- 成功后重新刷新当前用户信息

## 3.3 微信手机号绑定

- 方法：`POST`
- 路径：`/api/v1/user/phone/wechat`

### 请求体

```json
{
  "code": "wx-phone-code"
}
```

### 响应体

```json
{
  "success": true,
  "data": {
    "message": "手机号绑定成功",
    "phone": "138****1234"
  }
}
```

### 前端接入要求

- 需要用户已登录
- `code` 来自手机号授权事件
- 成功后刷新当前用户信息

## 四、前端建议时序

### 4.1 小程序启动或进入页面

```text
页面进入
  -> 检查本地是否已有系统登录态
  -> 无登录态：执行微信登录
  -> 有登录态：直接拉取当前用户信息
```

### 4.2 微信登录时序

```text
用户触发登录
  -> wx.login()
  -> 获取 code
  -> POST /api/v1/auth/wechat/login
  -> 保存 token / cookie / 本地登录标记
  -> GET 当前用户信息
  -> 判断 nickname/avatar/phone 是否完整
```

### 4.3 首次资料补全过程

```text
登录成功
  -> 发现 nickname 为空 或 avatarUrl 为空
  -> 弹出资料补全弹窗
  -> 用户选择头像 + 输入昵称
  -> POST /api/v1/user/profile/wechat
  -> 刷新当前用户信息
  -> 关闭弹窗
```

### 4.4 购买前手机号绑定过程

```text
用户点击购买
  -> 检查当前用户 phone 是否为空
  -> 为空：触发手机号授权
  -> 拿到手机号授权 code
  -> POST /api/v1/user/phone/wechat
  -> 刷新当前用户信息
  -> 继续下单流程
```

## 五、前端页面和组件改造建议

## 5.1 登录页

推荐调整为：

- 不再要求先获取头像昵称后才能登录
- 登录按钮只负责触发 `wx.login`
- 登录成功后再决定是否弹资料补全

### 推荐交互

- 按钮文案：`微信快捷登录`
- 登录成功但资料不完整时：
  - 弹窗提示：`完善头像和昵称，便于后续展示`
  - 提供“稍后再说”

## 5.2 个人中心页

推荐提供：

- 头像修改入口
- 昵称修改入口
- 手机号绑定入口

页面展示建议：

- 优先展示 `nickname`
- 其次展示 `username`
- 都没有时显示 `微信用户`

## 5.3 购买页 / 下单页

推荐在点击“立即购买”前做一次用户资料检查：

- 是否已登录
- 是否已绑定手机号

如未绑定手机号：

- 先拉起手机号授权
- 成功后再进入下单

## 六、前端状态字段建议

前端建议维护以下用户状态：

```ts
type CurrentUser = {
  userId: string
  username?: string | null
  nickname?: string | null
  avatarUrl?: string | null
  phone?: string | null
}
```

### 建议派生状态

```ts
const hasDisplayProfile = Boolean(user?.nickname && user?.avatarUrl)
const hasPhone = Boolean(user?.phone)
const displayName = user?.nickname || user?.username || '微信用户'
```

## 七、小程序能力接入建议

## 7.1 微信登录

使用：

- `wx.login`

作用：

- 获取登录 `code`

注意：

- `code` 有时效性
- 不要缓存太久
- 每次登录动作重新获取

## 7.2 头像和昵称

推荐拆开处理：

- 头像：使用微信小程序头像选择能力
- 昵称：使用用户主动输入

原因：

- 微信当前对昵称和头像获取有隐私限制
- 不建议假设登录时一定能直接拿到明文昵称和头像

### 头像建议

- 提供头像选择按钮
- 选择后本地预览
- 用户点击确认后再提交后端

### 昵称建议

- 提供输入框
- 限制长度 1 到 64
- 提交前 `trim`

## 7.3 手机号授权

使用：

- 微信手机号授权能力

前端需要做的事：

1. 用户点击“绑定手机号”或“继续购买”
2. 获取手机号授权事件回调里的 `code`
3. 把这个 `code` 发给后端

前端不要自己解密手机号。

## 八、推荐前端伪代码

## 8.1 登录

```ts
async function loginWithWechat() {
  const loginRes = await wx.login()

  if (!loginRes.code) {
    throw new Error('获取微信登录 code 失败')
  }

  const res = await request.post('/api/v1/auth/wechat/login', {
    code: loginRes.code,
  })

  saveAuth(res.data)

  const me = await fetchCurrentUser()

  if (!me.nickname || !me.avatarUrl) {
    openProfileCompletionModal()
  }
}
```

## 8.2 资料补全

```ts
async function submitWechatProfile(params: { nickname: string; avatarUrl: string }) {
  await request.post('/api/v1/user/profile/wechat', params)
  await fetchCurrentUser()
}
```

## 8.3 手机号绑定

```ts
async function bindWechatPhone(phoneCode: string) {
  await request.post('/api/v1/user/phone/wechat', {
    code: phoneCode,
  })

  await fetchCurrentUser()
}
```

## 8.4 购买前检查

```ts
async function beforeBuy() {
  const me = await fetchCurrentUser()

  if (!me.phone) {
    openPhoneAuthDialog()
    return
  }

  goCreateOrder()
}
```

## 九、错误处理建议

## 9.1 登录失败

前端提示建议：

- `登录失败，请稍后重试`
- 如果后端返回 code 无效：`微信登录已失效，请重新点击登录`

## 9.2 资料补全失败

前端提示建议：

- `资料保存失败，请稍后重试`

处理建议：

- 不影响已登录状态
- 可允许用户稍后再次补全

## 9.3 手机号绑定失败

前端提示建议：

- `手机号授权失败，请重新尝试`

处理建议：

- 不要直接退出登录
- 允许用户再次点击授权
- 如当前页面是购买页，则中断下单并提示先完成手机号绑定

## 十、联调注意事项

## 10.1 Cookie / Token

如果后端使用 Cookie 保持登录态：

- 小程序请求时要确认是否携带 Cookie
- 如果通过网关或代理访问，要检查 Cookie 是否被透传

如果后端返回 token：

- 要明确本地存储方案
- 请求拦截器统一附加

联调前需要和后端确认当前项目最终采用哪种方式。

## 10.2 用户信息接口

前端依赖一个“获取当前用户信息”的接口来判断：

- 是否已登录
- 是否已补全昵称头像
- 是否已绑定手机号

如果该接口当前还没有返回 `nickname`，需要与后端确认联调版本。

## 10.3 路径切换

由于当前登录接口存在历史路径与新路径并行的过渡期，前端建议把接口路径做成配置项：

```ts
const API = {
  wechatLogin: '/api/v1/auth/wechat/login',
  wechatProfileCompletion: '/api/v1/user/profile/wechat',
  wechatPhoneBind: '/api/v1/user/phone/wechat',
}
```

这样在联调期间切换更轻量。

## 十一、前端验收清单

前端联调完成后，至少验证以下场景：

### 登录链路

- 未授权昵称头像时，可以成功登录
- 登录成功后可以正常获取当前用户信息

### 资料补全链路

- 首次登录后可弹出资料补全弹窗
- 用户补全昵称和头像后，页面能立刻刷新展示

### 手机号绑定链路

- 未绑定手机号时，购买流程能正确拦截
- 手机号绑定成功后可继续购买

### 兼容链路

- 老用户已有 username 但无 nickname 时，页面仍能正常显示名称

## 十二、推荐对接顺序

建议小程序前端按以下顺序接入：

1. 先改登录，只提交 `code`
2. 接入资料补全弹窗
3. 接入个人中心资料补全入口
4. 接入购买前手机号绑定拦截
5. 最后补齐错误处理和体验优化

这样可以保证主链路最先可用，再逐步完善补全能力。
