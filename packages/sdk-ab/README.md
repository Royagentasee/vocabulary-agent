# @vocab-agent/sdk-ab

A/B 测试 SDK，统一各端实验框架。

## 用法

```ts
import { getABClient, EXPERIMENTS, useVariant } from '@vocab-agent/sdk-ab'

// 1. 简单用法
const variant = useVariant(EXPERIMENTS.AI_EXPLAIN_LAYOUT, userId)

// 2. 高级用法
const client = getABClient()
const { variant, source } = client.assign(EXPERIMENTS.RATE_BUTTON_COLORS, userId)

// 3. 转化埋点
client.track('rate_button_colors', 'card_rated', { rating: 3 })

// 4. 调试时强制覆盖
client.override('rate_button_colors', 'B')
client.reset()  // 清除所有分配
```

## 实验定义示例

```ts
const myExp: ExperimentConfig = {
  key: 'my_experiment',
  description: '...',
  weights: { A: 50, B: 50 },  // 50/50 A/B 测试
  rolloutPercentage: 10,       // 仅 10% 用户参与
  forceList: { 'user-123': 'B' },  // 强制特定用户
  enabled: true,
}
```

## 数据上报

客户端 SDK 不内置上报逻辑（避免强制依赖），通过 `onEvent` 订阅：

```ts
client.onEvent((event) => {
  // 上报到埋点系统（神策 / 友盟 / 自建）
  if (event.type === 'exposure') {
    analytics.track('ab_exposure', event)
  }
  if (event.type === 'event') {
    analytics.track('ab_event', event)
  }
})
```

## 哈希分桶原理

```
hash(userKey + ':' + experimentKey + ':bucket') % 100
```

同一用户在同一实验中始终落在同一桶（除非 weights 改变）。

## 灰度发布

`rolloutPercentage` 控制参与实验的用户比例。例如：

- 0% → 所有用户都是 control
- 10% → 10% 用户进入实验
- 100% → 全部用户参与

配合 `forceList` 做内部测试：先把团队成员加入 forceList 验证，再开放灰度。

## 已有实验

见 `EXPERIMENTS` 常量：

| Key | 用途 |
|---|---|
| `ai_explain_layout` | 复习页 AI 解释展示方式（A=折叠 B=侧边栏 C=内联） |
| `rate_button_colors` | 评分按钮配色 |
| `home_intro_variant` | 首页引导文案 |
| `new_user_default_mode` | 新用户默认背词模式 |