# @vocab-agent/sdk-fsrs

FSRS 间隔重复算法的 TypeScript 实现，跨端共享。

## 用法
```ts
import { createFSRS, Rating } from '@vocab-agent/sdk-fsrs'

const scheduler = createFSRS()
const newCard = scheduler.newCard()
const result = scheduler.review(newCard, Rating.Good)
console.log(result.nextDueAt) // 下次复习时间
```

## Python 端对应实现
`packages/sdk-fsrs-py/` 提供一致的 API（FastAPI 调用 / 离线 Python 任务）。
