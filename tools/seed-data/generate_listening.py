"""用 DeepSeek 生成原创听力题库（托福 + 雅思风格）

说明：托福/雅思听力真题音频受版权保护、无官方开放源，
这里生成的是「原创、贴合考试风格的听力文本」，前端用 TTS 朗读。
"""
from __future__ import annotations

import json
import sys
import time
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

# 从 services/ai-gateway 目录导入（需要加载 .env 里的 API key）
GW = Path(__file__).resolve().parent.parent.parent / 'services' / 'ai-gateway'
sys.path.insert(0, str(GW))

from app.core.llm import get_llm_client  # noqa: E402
from vocab_agent_llm import ChatMessage, ChatOptions  # noqa: E402

OUT = Path(__file__).parent / 'data' / 'listening_bank.json'

SYSTEM = """你是英语听力出题专家，擅长编写托福(TOEFL)和雅思(IELTS)风格的听力材料。

任务：写一段听力文本 + 3 道听力理解选择题。

要求：
1. 文本 150-250 词，口语化、自然，符合真实考试场景（讲座/对话/独白）
2. 3 道题，每题 4 选项（1 正确 + 3 干扰），考察主旨、细节、推断
3. 每题给中文解析（考点 + 对错原因）

只输出 JSON（不要 markdown 代码块）：
{
  "title": "英文标题",
  "passage": "听力文本",
  "questions": [
    {"question": "题目（英文）", "choices": [{"label":"A","text":"..."},{"label":"B","text":"..."},{"label":"C","text":"..."},{"label":"D","text":"..."}], "correct_label": "A", "explanation": "中文解析"}
  ]
}
"""

SPECS = [
    # 托福（讲座 + 对话）
    {'exam': 'TOEFL', 'type': 'lecture', 'scene': '天文学讲座：恒星的生命周期'},
    {'exam': 'TOEFL', 'type': 'lecture', 'scene': '生物学讲座：珊瑚礁与气候变化'},
    {'exam': 'TOEFL', 'type': 'lecture', 'scene': '历史讲座：工业革命的起因'},
    {'exam': 'TOEFL', 'type': 'conversation', 'scene': '办公室答疑：讨论研究论文'},
    {'exam': 'TOEFL', 'type': 'conversation', 'scene': '图书馆：为论文查找资料'},
    {'exam': 'TOEFL', 'type': 'conversation', 'scene': '教务处：咨询选课'},
    # 雅思（各题型风格）
    {'exam': 'IELTS', 'type': 'conversation', 'scene': 'Section 1 对话：预订酒店房间'},
    {'exam': 'IELTS', 'type': 'conversation', 'scene': 'Section 1 对话：咨询健身房会员'},
    {'exam': 'IELTS', 'type': 'monologue', 'scene': 'Section 2 独白：城市博物馆导览'},
    {'exam': 'IELTS', 'type': 'discussion', 'scene': 'Section 3 讨论：规划小组项目'},
    {'exam': 'IELTS', 'type': 'lecture', 'scene': 'Section 4 讲座：记忆的心理学'},
    {'exam': 'IELTS', 'type': 'lecture', 'scene': 'Section 4 讲座：城市规划与绿地'},
]


def clean_json(raw: str) -> dict:
    cleaned = raw.strip()
    if cleaned.startswith('```'):
        cleaned = cleaned.strip('`')
        if '\n' in cleaned:
            cleaned = cleaned.split('\n', 1)[1]
        if cleaned.endswith('```'):
            cleaned = cleaned[:-3]
    return json.loads(cleaned)


def main() -> int:
    client = get_llm_client()
    bank: list[dict] = []
    for i, spec in enumerate(SPECS):
        user = (
            f"考试：{spec['exam']}（{spec['type']}）\n"
            f"场景：{spec['scene']}\n\n请编写听力材料。"
        )
        messages = [
            ChatMessage(role='system', content=SYSTEM),
            ChatMessage(role='user', content=user),
        ]
        for attempt in range(3):
            try:
                raw = client.chat(messages, ChatOptions(temperature=0.8, max_tokens=2000))
                data = clean_json(raw)
                passage = (data.get('passage') or '').strip()
                questions = data.get('questions') or []
                if len(passage) < 100 or not questions:
                    raise ValueError('内容不完整')
                bank.append({
                    'id': f"{spec['exam'].lower()}-{i + 1}",
                    'exam': spec['exam'],
                    'type': spec['type'],
                    'title': data.get('title') or spec['scene'],
                    'passage': passage,
                    'questions': questions,
                })
                print(f'  [{i+1}/{len(SPECS)}] {spec["exam"]} {spec["scene"]} -> {len(passage.split())} 词, {len(questions)} 题')
                break
            except Exception as e:
                print(f'  [{i+1}/{len(SPECS)}] 尝试 {attempt+1} 失败: {e}')
                time.sleep(2)
        else:
            print(f'  [!] {spec["scene"]} 生成失败，跳过')

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(bank, ensure_ascii=False, indent=1), encoding='utf-8')
    print(f'\n完成：{len(bank)} 篇听力材料 → {OUT}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
