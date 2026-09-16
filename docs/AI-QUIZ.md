# AI 出题功能（Quiz）

## 概述

基于 LLM 的**完形填空出题**功能：输入一个单词，AI 生成一个真实语境的句子（挖空该词），并给出 4 个选项（1 正确 + 3 干扰），附解释。

## API

### POST /api/ai/quiz/generate

请求：
```json
{
  "headword": "ephemeral",
  "difficulty": "medium",
  "context": "IELTS"  // 可选
}
```

响应：
```json
{
  "headword": "ephemeral",
  "sentence": "The beauty of cherry blossoms is famously _______, lasting only a few short weeks...",
  "choices": [
    {"label": "A", "text": "ephemeral"},
    {"label": "B", "text": "eternal"},
    {"label": "C", "text": "epicurean"},
    {"label": "D", "text": "effervescent"}
  ],
  "correct_label": "A",
  "explanation": "句子描述樱花美丽短暂，需要形容词表示'短暂的'，ephemeral 符合...",
  "difficulty": "medium"
}
```

## 前端集成

| 端 | 文件 | 说明 |
|---|---|---|
| Web | `apps/web/src/features/ai/QuizPanel.tsx` | 复习页内嵌面板 |
| Web | `apps/web/src/services/quiz.ts` | API 客户端 |
| 小程序 | `apps/mini/src/components/QuizPanel.tsx` | Taro 版组件 |
| 小程序 | `apps/mini/src/services/quiz.ts` | API 客户端 |

## 使用场景

1. **复习页**：用户看到单词后，可点"🎯 用「xxx」出一题"测试掌握度
2. **错题本**：针对用户常错的词出题（未来可集成）
3. **老师布置作业**：批量生成练习题

## 干扰项设计

AI 会自动生成 3 类干扰项：
- **词形干扰**：正确词的词性变化（如 ubiquitous → ubiquity/ubiquitously）
- **反义干扰**：语义相反的词（如 ephemeral → eternal）
- **拼写相似干扰**：拼写接近但含义无关的词（如 ephemeral → epicurean）

## 后续优化

- [ ] 用户答题历史记录（错题归因）
- [ ] 难度自适应（根据 FSRS 评分调整）
- [ ] 批量出题（一次生成 N 题）
- [ ] 图片/音频题目