# 词库分包（package-dict）

当 ECDICT 真实词库接入后，会放到这个分包里。
进入选词书页时按需加载，避免主包过大。

## 触发加载

```tsx
import Taro from '@tarojs/taro'

Taro.loadSubpackage({
  package: 'dict',
  success: () => {
    // 分包加载成功，可以使用真实词库
    const { WORDS_BUNDLE } = require('@vocab-agent/words-bundle')
  },
})
```

## 包大小预估

- ECDICT top 5000 词 ≈ 1.5MB（gzip 后约 600KB）
- 加上例句、词根 ≈ 2MB
- 微信小程序分包限制 2MB 主包 + 多个分包（每个独立限制）

## 当前状态

暂未启用（用 MOCK_WORDS 占位）。启用步骤：

1. 下载 ECDICT CSV：https://github.com/skywind3000/ECDICT/releases
2. 运行：`python -m tools.seed-data.ecdict_to_bundle`
3. 把生成的 `words-bundle.ts` 放到 `src/package-dict/data/`
4. 修改 `src/services/words.ts` 中 `USE_BUNDLE = true`