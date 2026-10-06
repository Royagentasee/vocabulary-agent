"""生成初中/高中/大学三档英语阅读理解（AI 原创，对齐国内考试风格）

- 并发调用 DeepSeek（5 线程）
- 断点续传：已有的 (level, index) 跳过
- 每生成一篇就写盘

产出：tools/seed-data/data/reading_levels.json
"""
from __future__ import annotations

import json
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

GW = Path(__file__).resolve().parent.parent.parent / 'services' / 'ai-gateway'
sys.path.insert(0, str(GW))

from dotenv import load_dotenv  # noqa: E402

load_dotenv(GW / '.env')

from app.core.config import get_settings  # noqa: E402
from vocab_agent_llm import ChatMessage, ChatOptions, create_llm_client  # noqa: E402

OUT = Path(__file__).parent / 'data' / 'reading_levels.json'
WORKERS = 5

LEVELS = {
    'junior': {
        'name': '初中',
        'exam': '中考',
        'words': '200-260',
        'vocab': '初中核心词汇约 1600 词，不出现超纲词',
        'style': '句子较短（15 词以内），以记叙文和简单说明文为主，'
                 '话题贴近生活（校园、家庭、爱好、动物、环保）',
        'count': 60,
    },
    'senior': {
        'name': '高中',
        'exam': '高考',
        'words': '280-340',
        'vocab': '高中核心词汇约 3500 词',
        'style': '句式多样（含定语从句、状语从句、非谓语），'
                 '以说明文、议论文、科普文为主，有推断题和主旨题',
        'count': 60,
    },
    'college': {
        'name': '大学',
        'exam': '四六级 / 考研',
        'words': '330-420',
        'vocab': '四六级/考研核心词汇约 5500 词',
        'style': '长难句较多，话题涉及科技、经济、社会、心理、文化，'
                 '需要有推断作者态度、理解隐含含义的能力',
        'count': 60,
    },
}

TOPICS = [
    '科技与发明', '环境保护', '健康与运动', '教育方式', '人工智能',
    '动物行为', '太空探索', '饮食习惯', '城市生活', '传统文化',
    '心理学发现', '职场与工作', '社交媒体', '能源问题', '考古发现',
    '语言学习', '艺术与音乐', '交通出行', '志愿服务', '经济现象',
]

SYSTEM = """你是中国英语考试的命题专家，为中学生和大学生编写英语阅读理解材料。

任务：写一篇**完全原创**的英语文章 + 4 道阅读理解选择题。

要求：
1. 文章必须原创，不要照抄任何已有文章或试题
2. 符合指定的难度和字数
3. 4 道题覆盖不同题型：主旨大意 / 细节理解 / 推理判断 / 词义猜测或作者态度
4. 每题 4 个选项，1 正确 3 干扰；干扰项要有迷惑性但不能有两个正确答案
5. 每题给中文解析（说明为什么对、为什么错）
6. 文章要有明确的主题，不要泛泛而谈

只输出 JSON（不要 markdown 代码块）：
{
  "title": "英文标题",
  "titleZh": "中文标题",
  "topic": "话题（中文）",
  "passage": "英文正文（分段用 \\n\\n）",
  "questions": [
    {
      "question": "题干（英文）",
      "questionType": "主旨大意/细节理解/推理判断/词义猜测/作者态度",
      "choices": [
        {"label": "A", "text": "选项内容"},
        {"label": "B", "text": "选项内容"},
        {"label": "C", "text": "选项内容"},
        {"label": "D", "text": "选项内容"}
      ],
      "correctLabel": "B",
      "explanation": "中文解析"
    }
  ]
}
"""


def clean_json(raw: str) -> dict:
    c = raw.strip()
    if c.startswith('```'):
        c = c.strip('`')
        if '\n' in c:
            c = c.split('\n', 1)[1]
        if c.endswith('```'):
            c = c[:-3]
    return json.loads(c)


def build_specs() -> list[dict]:
    specs = []
    for lv, cfg in LEVELS.items():
        for i in range(cfg['count']):
            specs.append({'level': lv, 'idx': i + 1, 'topic': TOPICS[i % len(TOPICS)]})
    return specs


def main() -> int:
    settings = get_settings()
    bank: list[dict] = []
    done: set[str] = set()
    if OUT.exists():
        bank = json.loads(OUT.read_text(encoding='utf-8'))
        done = {it['id'] for it in bank}

    total = sum(c['count'] for c in LEVELS.values())
    print(f'已有 {len(bank)}/{total} 篇', flush=True)

    specs = [s for s in build_specs()
             if f"{s['level']}-{s['idx']:03d}" not in done]
    if not specs:
        print('全部已生成', flush=True)
        return 0
    print(f'待生成 {len(specs)} 篇', flush=True)

    lock = threading.Lock()

    def generate(spec: dict) -> dict | None:
        cfg = LEVELS[spec['level']]
        user = (
            f"学段：{cfg['name']}（{cfg['exam']}难度）\n"
            f"字数：{cfg['words']} 词\n"
            f"词汇范围：{cfg['vocab']}\n"
            f"文体特点：{cfg['style']}\n"
            f"话题：{spec['topic']}\n\n"
            f"请编写这篇文章和 4 道题。"
        )
        messages = [ChatMessage(role='system', content=SYSTEM),
                    ChatMessage(role='user', content=user)]
        for attempt in range(3):
            try:
                client = create_llm_client(provider=settings.llm_provider,
                                           api_key=settings.deepseek_api_key)
                raw = client.chat(messages, ChatOptions(temperature=0.9, max_tokens=3500))
                d = clean_json(raw)
                passage = (d.get('passage') or '').strip()
                qs = d.get('questions') or []
                wc = len(passage.split())
                if wc < 120 or len(qs) < 4:
                    raise ValueError(f'内容不完整 ({wc} 词 / {len(qs)} 题)')
                for q in qs[:4]:
                    if not q.get('choices') or not q.get('correctLabel'):
                        raise ValueError('选项缺失')
                return {
                    'id': f"{spec['level']}-{spec['idx']:03d}",
                    'level': spec['level'],
                    'levelName': cfg['name'],
                    'exam': cfg['exam'],
                    'title': (d.get('title') or '').strip(),
                    'titleZh': (d.get('titleZh') or '').strip(),
                    'topic': (d.get('topic') or spec['topic']).strip(),
                    'passage': passage,
                    'wordCount': wc,
                    'questions': qs[:4],
                }
            except Exception as e:
                if attempt == 2:
                    print(f"  [{spec['level']}-{spec['idx']:03d}] 失败: {str(e)[:60]}", flush=True)
                time.sleep(2)
        return None

    with ThreadPoolExecutor(max_workers=WORKERS) as ex:
        futures = {ex.submit(generate, s): s for s in specs}
        for f in futures:
            res = f.result()
            if not res:
                continue
            with lock:
                if res['id'] in done:
                    continue
                bank.append(res)
                done.add(res['id'])
                bank.sort(key=lambda x: (x['level'], x['id']))
                OUT.write_text(json.dumps(bank, ensure_ascii=False, indent=1), encoding='utf-8')
                print(f"  进度 {len(bank)}/{total}  [{res['levelName']}] "
                      f"{res['title'][:40]} ({res['wordCount']}词)", flush=True)

    print(f'\n完成：{len(bank)} 篇 → {OUT}', flush=True)
    return 0


if __name__ == '__main__':
    sys.exit(main())
