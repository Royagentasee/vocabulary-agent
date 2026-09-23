"""批量生成听力题库（目标 1000 篇托福/雅思听力材料）

- 并发调用 DeepSeek（5 线程）
- 可断点续传：已生成的标题会跳过，重跑继续
- 每生成一篇就写盘，中断不丢
"""
from __future__ import annotations

import json
import re
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

GW = Path(__file__).resolve().parent.parent.parent / 'services' / 'ai-gateway'
sys.path.insert(0, str(GW))

from app.core.config import get_settings  # noqa: E402
from vocab_agent_llm import ChatMessage, ChatOptions, create_llm_client  # noqa: E402

OUT = Path(__file__).parent / 'data' / 'listening_bank.json'
TARGET = 1000
WORKERS = 5

SYSTEM = """你是英语听力出题专家，擅长编写托福(TOEFL)和雅思(IELTS)风格的听力材料。

任务：写一段听力文本 + 3 道听力理解选择题。

要求：
1. 文本 150-250 词，口语化、自然，符合真实考试场景（讲座/对话/独白）
2. 3 道题，每题 4 选项（1 正确 + 3 干扰），考察主旨、细节、推断
3. 每题给中文解析（考点 + 对错原因）
4. 主题具体、不要泛泛而谈，避免与其他篇目重复

只输出 JSON（不要 markdown 代码块）：
{
  "title": "英文标题",
  "passage": "听力文本",
  "questions": [
    {"question": "题目（英文）", "choices": [{"label":"A","text":"..."},{"label":"B","text":"..."},{"label":"C","text":"..."},{"label":"D","text":"..."}], "correct_label": "A", "explanation": "中文解析"}
  ]
}
"""

# ============ 场景池 ============
TOEFL_LECTURE_SUBJECTS = [
    '生物学', '化学', '物理学', '天文学', '地质学', '生态学', '心理学', '社会学',
    '经济学', '历史学', '艺术史', '文学', '哲学', '人类学', '语言学', '考古学',
    '政治学', '环境科学', '神经科学', '海洋学', '建筑学', '音乐史', '电影研究',
    '植物学', '动物学', '遗传学', '古生物学', '气象学', '火山学', '海洋生物学',
]
TOEFL_CONV_SCENES = [
    '办公室答疑：讨论研究论文', '图书馆：为论文查找资料', '教务处：咨询选课',
    '宿舍：申请换宿舍', '助学金：申请资助', '校园工作：应聘图书馆助理',
    '社团：加入辩论社', '实习：咨询实习机会', '留学：交换项目咨询', '学业顾问：选择专业',
    '写作中心：修改论文', '健康中心：预约体检', 'IT服务台：维修电脑', '食堂：办理餐卡',
    '实验室：加入研究项目', '考试：申请缓考', '转学：学分转换', '毕业：毕业要求咨询',
    '校友：职业规划咨询', '健身房：办理会员', '书店：购买教材', '停车：办理停车证',
    '国际学生：签证问题', '助教：讨论作业', '演讲：准备课堂演讲',
]
IELTS_S1 = [
    '预订酒店房间', '租房咨询', '办理银行卡', '报名驾校', '预约医生', '电话报修',
    '图书馆办卡', '购买火车票', '预订机票', '电话点外卖', '健身房办卡', '维修手机',
    '预约理发', '购买保险', '报名课程', '联系搬家公司', '咨询旅游团', '办理签证',
    '宠物店咨询', '超市退货', '快递寄件', '预约牙医', '租车', '预订餐厅',
    '问路', '办理电话卡', '维修汽车', '报名考试', '咨询家政服务', '购买家具',
]
IELTS_S2 = [
    '博物馆导览', '公园介绍', '图书馆使用说明', '大学校园导览', '社区活动通知',
    '旅游景点介绍', '健康讲座', '新商场开业介绍', '志愿者招募', '艺术展览介绍',
    '健身中心介绍', '音乐节安排', '慈善义卖活动', '环保倡议', '交通改道通知',
    '学校开放日', '职业培训课程介绍', '兴趣班介绍', '城市历史讲解', '动物园导览',
    '科技馆介绍', '运动会安排', '电影节排片', '读书会通知', '手工工作坊',
    '美食节介绍', '招聘会通知', '民宿介绍', '滑雪场须知', '天文台开放日',
]
IELTS_S3 = [
    '规划小组作业', '讨论实验设计', '准备课堂展示', '选择论文题目', '讨论问卷调查',
    '分析研究数据', '准备期末考试', '讨论实习报告', '项目分工', '文献综述讨论',
    '讨论案例研究', '准备辩论赛', '设计学术海报', '讨论调研方法', '准备演讲',
    '讨论课程论文', '时间管理讨论', '找导师讨论选题', '讨论数据分析软件', '准备口语考试',
    '讨论职业规划', '讨论交换项目', '小组项目进度', '讨论参考书目', '准备研究报告',
    '讨论实地考察', '讨论实验数据', '准备学术会议', '讨论毕业设计', '讨论辅导课安排',
]
IELTS_S4 = [
    '记忆心理学', '睡眠科学', '气候变化', '城市规划', '人工智能', '语言习得',
    '市场营销', '营养学', '海洋保护', '可再生能源', '儿童发展', '组织行为学',
    '遗传学', '微观经济学', '艺术史', '考古发现', '天文学', '生态平衡',
    '公共健康', '数字媒体', '教育心理学', '犯罪学', '交通工程', '食品科学',
    '音乐史', '政治学', '社会学', '环境政策', '运动科学', '文化研究',
]


def build_specs() -> list[dict]:
    specs: list[dict] = []
    for i in range(250):
        subj = TOEFL_LECTURE_SUBJECTS[i % len(TOEFL_LECTURE_SUBJECTS)]
        specs.append({'exam': 'TOEFL', 'type': 'lecture', 'scene': f'{subj}讲座（主题自拟）'})
    for i in range(250):
        specs.append({'exam': 'TOEFL', 'type': 'conversation', 'scene': TOEFL_CONV_SCENES[i % len(TOEFL_CONV_SCENES)]})
    for pool, typ, tag in [(IELTS_S1, 'conversation', 'Section 1'), (IELTS_S2, 'monologue', 'Section 2'),
                           (IELTS_S3, 'discussion', 'Section 3'), (IELTS_S4, 'lecture', 'Section 4')]:
        for i in range(122):
            specs.append({'exam': 'IELTS', 'type': typ, 'scene': f'{tag}：{pool[i % len(pool)]}'})
    return specs


def clean_json(raw: str) -> dict:
    c = raw.strip()
    if c.startswith('```'):
        c = c.strip('`')
        if '\n' in c:
            c = c.split('\n', 1)[1]
        if c.endswith('```'):
            c = c[:-3]
    return json.loads(c)


def norm_title(t: str) -> str:
    return re.sub(r'[^a-z0-9]', '', (t or '').lower())


def main() -> int:
    settings = get_settings()
    bank: list[dict] = []
    done_titles: set[str] = set()
    if OUT.exists():
        bank = json.loads(OUT.read_text(encoding='utf-8'))
        done_titles = {norm_title(it.get('title', '')) for it in bank}
    print(f'已有 {len(bank)} 篇，目标 {TARGET} 篇', flush=True)

    specs = build_specs()
    lock = threading.Lock()
    stop = threading.Event()
    count = [len(bank)]
    written = [len(bank)]

    def generate(spec: dict) -> dict | None:
        if stop.is_set():
            return None
        client = create_llm_client(provider=settings.llm_provider, api_key=settings.deepseek_api_key)
        user = f"考试：{spec['exam']}（{spec['type']}）\n场景：{spec['scene']}\n\n请编写听力材料。"
        messages = [ChatMessage(role='system', content=SYSTEM), ChatMessage(role='user', content=user)]
        for _ in range(3):
            try:
                raw = client.chat(messages, ChatOptions(temperature=0.9, max_tokens=2000))
                data = clean_json(raw)
                passage = (data.get('passage') or '').strip()
                questions = data.get('questions') or []
                if len(passage) < 100 or not questions:
                    raise ValueError('内容不完整')
                return {'exam': spec['exam'], 'type': spec['type'],
                        'title': data.get('title') or spec['scene'],
                        'passage': passage, 'questions': questions}
            except Exception:
                time.sleep(2)
        return None

    with ThreadPoolExecutor(max_workers=WORKERS) as ex:
        inflight: list = []
        next_spec = [0]

        def submit_one():
            if stop.is_set():
                return
            spec = specs[next_spec[0] % len(specs)]
            next_spec[0] += 1
            inflight.append(ex.submit(generate, spec))

        for _ in range(WORKERS * 3):
            submit_one()

        while inflight and not stop.is_set():
            for f in list(inflight):
                if not f.done():
                    continue
                inflight.remove(f)
                res = f.result()
                if res:
                    with lock:
                        t = norm_title(res['title'])
                        if t not in done_titles and count[0] < TARGET:
                            done_titles.add(t)
                            res['id'] = f"{res['exam'].lower()}-{count[0] + 1}"
                            bank.append(res)
                            count[0] += 1
                            OUT.write_text(json.dumps(bank, ensure_ascii=False, indent=1), encoding='utf-8')
                            written[0] = count[0]
                            if count[0] % 20 == 0:
                                print(f'  进度 {count[0]}/{TARGET}', flush=True)
                            if count[0] >= TARGET:
                                stop.set()
                                break
                submit_one()
            time.sleep(0.3)

    print(f'\n完成：{len(bank)} 篇 → {OUT}', flush=True)
    return 0


if __name__ == '__main__':
    sys.exit(main())
