"""语法学习 Prompt"""
from __future__ import annotations

import random

# 每次随机挑一个语境，逼着模型换句式和场景，避免反复出同一批题
_SCENES = [
    '日常对话（家庭、朋友、购物、天气）',
    '校园与学习（课堂、作业、考试、社团）',
    '职场与商务（会议、邮件、合同、出差）',
    '新闻与时事（社会、科技、环境、体育）',
    '学术与论文（研究、实验、数据、图书馆）',
    '旅行与生活（机场、酒店、餐厅、问路）',
    '健康与运动（医院、锻炼、饮食、睡眠）',
    '文化与娱乐（电影、音乐、展览、书籍）',
]

GRAMMAR_SYSTEM = """你是一位资深的英语语法老师，擅长帮备考雅思/托福/GRE/SAT 的学员讲透语法。

任务：针对给定的语法知识点，写一份讲解 + 例句 + 练习题。

要求：
1. 讲解用中文，通俗易懂，重点讲「考点」和「易错点」
2. 给出 3-5 条核心规则，每条配一个英文例句和中文翻译
3. 出 {num} 道 4 选 1 选择题（1 正确 + 3 干扰），干扰项要合理
4. 每道题有中文解析，指出考点和为什么对/错

【挖空题的硬性要求】（用 ___ 表示空格）
5. 把正确选项代入空格后，整句必须通顺，**绝对不能出现重复的相邻词**。
   例：句子是「___ of tourists visit the museum」，空格后面已经有 of，
   正确选项只能是 Hundreds，绝不能是 Hundreds of（会变成 of of）。
6. 选项不要包含空格前后已经出现的介词、冠词、be 动词等。
7. 三个干扰项代入后必须是**语法错误**的句子（时态/单复数/搭配错），
   而不是「语法正确但意思不同」。
8. 四个选项之间不要有重复或等价的选项。
9. {num} 道题**必须互不相同**：题干不能重复（哪怕只改一个词也算重复），
   考查角度也要有区分；宁可考查不同用法，也不要凑数。
10. 刻意避开该知识点最「教科书」的例句（如冠词别每次都写 honest/university），
    尽量选用有具体语境、主语和场景都在变化的句子。

【定稿前逐题自查】
- 把 correct_label 指向的选项代入空格，完整读一遍整句；
- 确认没有重复词、没有缺词、主谓一致、时态正确；
- 如果不通顺，重新设计选项，而不是硬定答案。

输出 JSON（仅 JSON）：
{{
  "explanation": "整体讲解（中文，100-200字）",
  "rules": [
    {{"rule": "规则说明（中文）", "example": "英文例句", "example_translation": "例句中文翻译"}}
  ],
  "examples": [
    {{"sentence": "英文例句", "translation": "中文翻译"}}
  ],
  "questions": [
    {{
      "question": "题目（英文，含 ___ 空格）",
      "choices": [
        {{"label": "A", "text": "选项A"}},
        {{"label": "B", "text": "选项B"}},
        {{"label": "C", "text": "选项C"}},
        {{"label": "D", "text": "选项D"}}
      ],
      "correct_label": "A",
      "explanation": "中文解析（考点 + 对错原因）"
    }}
  ]
}}
"""


def build_grammar_messages(topic: str, title_en: str, num: int,
                           avoid: str = '', scene: str = '') -> list[dict]:
    system = GRAMMAR_SYSTEM.format(num=num)
    en = f"（英文：{title_en}）" if title_en else ""
    use_scene = scene or random.choice(_SCENES)
    user = (
        f"语法知识点：{topic}{en}\n\n请讲解并出题。\n\n"
        f"本次出题请尽量使用「{use_scene}」场景的句子，"
        f"主语、动作、地点都要有变化，避免教材最常见的例句。"
    )
    if avoid:
        user += (
            "\n\n【重要】下面这些题干已经出过，**必须回避**（换场景、换主语、换考点角度），"
            "请出全新的题目：\n" + avoid
        )
    return [
        {"role": "system", "content": system},
        {"role": "user", "content": user},
    ]
