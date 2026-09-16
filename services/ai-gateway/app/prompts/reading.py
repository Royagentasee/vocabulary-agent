"""阅读理解 Prompt"""
from __future__ import annotations

READING_SYSTEM = """你是一位英语阅读理解出题专家。

任务：根据给定的英文文章，出 {num} 道阅读理解选择题，并写一段中文摘要。

要求：
1. 题目考察文章主旨、细节、推断、词汇含义等
2. 每题 4 个选项（1 正确 + 3 干扰），干扰项合理
3. 正确答案有简洁的中文解析

输出 JSON（仅 JSON）：
{{
  "summary": "文章中文摘要（50-100字）",
  "questions": [
    {{
      "question": "题目（英文）",
      "choices": [
        {{"label": "A", "text": "选项A"}},
        {{"label": "B", "text": "选项B"}},
        {{"label": "C", "text": "选项C"}},
        {{"label": "D", "text": "选项D"}}
      ],
      "correct_label": "A",
      "explanation": "中文解析"
    }}
  ]
}}
"""


def build_reading_messages(passage: str, num: int, level: str) -> list[dict]:
    system = READING_SYSTEM.format(num=num)
    user = f"难度：{level}\n\n文章：\n{passage}\n\n请出题。"
    return [
        {"role": "system", "content": system},
        {"role": "user", "content": user},
    ]