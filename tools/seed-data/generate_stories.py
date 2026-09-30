"""批量生成 A-Z 英语分级小故事（26 字母 × 3 难度 = 78 篇）

- 并发调用 DeepSeek（5 线程）
- 断点续传：已有的 (letter, level) 会跳过，重跑继续
- 每生成一篇就写盘，中断不丢

产出：tools/seed-data/data/story_bank.json
"""
from __future__ import annotations

import json
import re
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

GW = Path(__file__).resolve().parent.parent.parent / 'services' / 'ai-gateway'
sys.path.insert(0, str(GW))

# config.py 的 env_file=".env" 是相对 CWD 解析的，从项目根目录跑会读不到密钥，
# 这里显式加载 ai-gateway 的 .env（必须在 get_settings() 之前）
from dotenv import load_dotenv  # noqa: E402

load_dotenv(GW / '.env')

from app.core.config import get_settings  # noqa: E402
from vocab_agent_llm import ChatMessage, ChatOptions, create_llm_client  # noqa: E402

OUT = Path(__file__).parent / 'data' / 'story_bank.json'
WORKERS = 5

LETTERS = list('ABCDEFGHIJKLMNOPQRSTUVWXYZ')

LEVELS = {
    'A2': {
        'name': '入门',
        'words': '300-380',
        'desc': '句子简短（平均 8-12 词），只用人教版初中核心词汇（约 1000 词），'
                '多用一般现在时和一般过去时，情节直白',
    },
    'B1': {
        'name': '进阶',
        'words': '420-520',
        'desc': '句子中等长度，使用高中核心词汇（约 2500 词），'
                '可出现从句、完成时、被动语态，情节有起伏',
    },
    'B2': {
        'name': '高阶',
        'words': '560-680',
        'desc': '句式丰富，使用四六级/雅思核心词汇，'
                '包含描写、对话、心理活动，有隐喻或转折',
    },
}

# 每个字母给一些题材提示，保证 26 个故事风格多样、不重复
THEMES = {
    'A': '蚂蚁、苹果、冒险、机场', 'B': '蝴蝶、气球、面包店、熊',
    'C': '猫、钟表、蛋糕、城堡', 'D': '狗、龙、沙漠、日记',
    'E': '大象、鸡蛋、电梯、回声', 'F': '狐狸、森林、烟花、农夫',
    'G': '花园、长颈鹿、吉他、爷爷', 'H': '马、房子、帽子、假期',
    'I': '岛屿、冰淇淋、发明家、雨伞', 'J': '旅程、丛林、果酱、记者',
    'K': '风筝、袋鼠、钥匙、厨房', 'L': '狮子、灯塔、图书馆、柠檬',
    'M': '月亮、猴子、镜子、博物馆', 'N': '鸟巢、邻居、笔记本、望远镜',
    'O': '猫头鹰、海洋、果园、管弦乐队', 'P': '企鹅、钢琴、邮递员、公园',
    'Q': '女王、安静、测验、鹌鹑', 'R': '兔子、彩虹、机器人、河流',
    'S': '星星、松鼠、雪、学校', 'T': '老虎、火车、望远镜、茶会',
    'U': '雨伞、独角兽、地下、大学', 'V': '村庄、小提琴、火山、志愿者',
    'W': '鲸鱼、窗户、女巫、风', 'X': '木琴、X光、探险',
    'Y': '牦牛、院子、年糕、游艇', 'Z': '斑马、动物园、拉链、零',
}

SYSTEM = """你是英语分级读物作家，为中国的英语学习者编写原创短篇故事。

任务：写一篇**完全原创**的英语小故事（不要改编或复述任何已有的版权作品）。

要求：
1. 故事标题**必须以指定字母开头**
2. 情节完整：有开头、发展、结尾，最好有一个小小的转折或道理
3. 语言自然地道，符合指定难度
4. 内容健康向上，适合青少年和成人学习者
5. 生词表挑 10 个真正值得学的词（含短语），给出中文释义和该词在文中的意思
6. 3 道理解题，考察主旨/细节/推断，每题 4 选项，给中文解析

只输出 JSON（不要 markdown 代码块）：
{
  "title": "英文标题（以指定字母开头）",
  "titleZh": "中文标题",
  "text": "英文正文（分段用 \\n\\n）",
  "translation": "全文中文翻译（分段用 \\n\\n，与英文段落一一对应）",
  "vocabulary": [
    {"word": "英文单词或短语", "meaning": "中文释义"}
  ],
  "questions": [
    {"question": "英文题目", "choices": ["A. ...", "B. ...", "C. ...", "D. ..."],
     "answer": "A", "explanation": "中文解析"}
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
    for letter in LETTERS:
        for level in ('A2', 'B1', 'B2'):
            specs.append({'letter': letter, 'level': level})
    return specs


def main() -> int:
    settings = get_settings()
    bank: list[dict] = []
    done: set[str] = set()
    if OUT.exists():
        bank = json.loads(OUT.read_text(encoding='utf-8'))
        done = {f"{it['letter']}-{it['level']}" for it in bank}
    total = len(LETTERS) * len(LEVELS)
    print(f'已有 {len(bank)}/{total} 篇', flush=True)

    specs = [s for s in build_specs() if f"{s['letter']}-{s['level']}" not in done]
    if not specs:
        print('全部已生成，无需再跑', flush=True)
        return 0
    print(f'待生成 {len(specs)} 篇', flush=True)

    lock = threading.Lock()
    counter = [len(bank)]

    def generate(spec: dict) -> dict | None:
        lv = LEVELS[spec['level']]
        letter = spec['letter']
        user = (
            f"字母：{letter}\n"
            f"难度：{lv['name']}（{spec['level']}）—— {lv['desc']}\n"
            f"篇幅：正文 {lv['words']} 词\n"
            f"可用题材参考（任选其一或自创，但标题必须以 {letter} 开头）：{THEMES.get(letter, '')}\n\n"
            f"请编写故事。"
        )
        messages = [ChatMessage(role='system', content=SYSTEM), ChatMessage(role='user', content=user)]
        for attempt in range(3):
            try:
                client = create_llm_client(provider=settings.llm_provider,
                                           api_key=settings.deepseek_api_key)
                raw = client.chat(messages, ChatOptions(temperature=0.95, max_tokens=4000))
                data = clean_json(raw)
                text = (data.get('text') or '').strip()
                if len(text.split()) < 150 or not data.get('questions'):
                    raise ValueError(f'内容不完整 ({len(text.split())} words)')
                if not (data.get('title') or '').strip().upper().startswith(letter):
                    data['title'] = f'{letter} — ' + (data.get('title') or '').strip()
                return {
                    'letter': letter,
                    'level': spec['level'],
                    'levelName': lv['name'],
                    'title': data['title'].strip(),
                    'titleZh': (data.get('titleZh') or '').strip(),
                    'text': text,
                    'translation': (data.get('translation') or '').strip(),
                    'vocabulary': data.get('vocabulary') or [],
                    'questions': data.get('questions') or [],
                    'wordCount': len(text.split()),
                }
            except Exception as e:
                if attempt == 2:
                    print(f'  [{letter}-{spec["level"]}] 失败: {str(e)[:70]}', flush=True)
                time.sleep(2)
        return None

    with ThreadPoolExecutor(max_workers=WORKERS) as ex:
        futures = {ex.submit(generate, s): s for s in specs}
        for f in futures:
            res = f.result()
            if not res:
                continue
            with lock:
                key = f"{res['letter']}-{res['level']}"
                if key in done:
                    continue
                counter[0] += 1
                res['id'] = f"story-{res['letter'].lower()}-{res['level'].lower()}"
                bank.append(res)
                done.add(key)
                bank.sort(key=lambda x: (x['letter'], x['level']))
                OUT.write_text(json.dumps(bank, ensure_ascii=False, indent=1), encoding='utf-8')
                print(f"  进度 {len(bank)}/{total}  [{res['letter']}-{res['level']}] "
                      f"{res['title'][:42]} ({res['wordCount']}词)", flush=True)

    print(f'\n完成：{len(bank)} 篇 → {OUT}', flush=True)
    return 0


if __name__ == '__main__':
    sys.exit(main())
