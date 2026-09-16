"""错因分析 Prompt（v1）"""
from __future__ import annotations


ANALYZE_PROMPT_ZH = """你是一位严谨的英语学习诊断专家，正在分析一位中国备考雅思 / 托福 / GRE 学员的错题数据。

学员历史错题（含评分）：
{records}

请用以下 JSON 结构输出（**仅输出 JSON**，不要任何额外说明）：

{{
  "summary": "整体学习情况总结（50-80 字）",
  "categories": [
    {{
      "category": "拼写错误 | 词义混淆 | 用法错误 | 发音相似 | 长期遗忘 | 其他",
      "count": 该类错误出现次数,
      "examples": ["单词1", "单词2"]
    }}
  ],
  "suggestions": [
    "针对性建议 1（20-40 字）",
    "针对性建议 2",
    "针对性建议 3"
  ],
  "strengths": [
    "学员做得好的地方 1",
    "学员做得好的地方 2"
  ]
}}

要求：
1. 总结要具体、有数据感（不要"加油"这种空话）
2. 分类准确，不要把拼写错误的归到用法错误
3. 建议要可执行（例如"每天用 ABC 方法复习 X 类词"而非"加强学习"）
4. 优点至少 1 条（避免纯负面报告打击信心）
"""


ANALYZE_PROMPT_EN = """You are a rigorous English learning diagnostic expert, analyzing mistake data for a learner preparing for IELTS / TOEFL / GRE.

Learner mistake history (with ratings):
{records}

Output the following JSON structure (**only JSON**, no extra text):

{{
  "summary": "Overall learning summary (50-80 words)",
  "categories": [
    {{
      "category": "Spelling | Meaning | Usage | Phonetic | Long-term Forgetting | Other",
      "count": number of mistakes in this category,
      "examples": ["word1", "word2"]
    }}
  ],
  "suggestions": [
    "Actionable suggestion 1 (20-40 words)",
    "Actionable suggestion 2",
    "Actionable suggestion 3"
  ],
  "strengths": [
    "Strength 1",
    "Strength 2"
  ]
}}

Requirements:
1. Summary should be specific and data-driven (no vague encouragement)
2. Categorization must be accurate
3. Suggestions must be actionable
4. At least 1 strength (avoid pure negative reports)
"""


def build_analyze_messages(records_text: str, language: str = "zh-CN") -> list[dict]:
    template = ANALYZE_PROMPT_ZH if language == "zh-CN" else ANALYZE_PROMPT_EN
    user_content = template.format(records=records_text)
    return [
        {
            "role": "system",
            "content": "You are a JSON-only responder. Output valid JSON only, no markdown blocks, no commentary.",
        },
        {"role": "user", "content": user_content},
    ]