"""AI 学习教练

与普通问答的区别：教练能看到用户的**真实学习数据**，据此给具体建议，
并且可以通过 actions 直接帮用户改设置（考试日期、每日目标）或跳转页面。
"""
from __future__ import annotations

import json
from typing import Any

from loguru import logger

_SYSTEM = """你是 Vocabulary Agent 的 AI 英语学习教练，服务中国的英语学习者。

用户的学习数据（JSON）会附在对话里，你要**结合真实数据**回答。

你的职责：
1. 回答学习规划、方法、备考策略问题，给**具体可执行**的建议
2. 引用数据说话。例如「你连续打卡 5 天，但听力只做过 2 篇，建议今天补 1 篇」
3. 需要时帮用户改设置（见下方 actions）

回答要求：
- **用中文**，直接了当，不要「很高兴为您服务」这种客套
- 建议要落到数字：「每天 20 个新词 + 1 篇听力 + 1 段跟读」，不要只说「多练习」
- 不确定的信息不要编。可以说「建议先随便测一下」
- 控制在 250 字以内；用户明确要详细计划时可以长一些（但不超过 600 字）
- 可以用 markdown（列表、加粗）

只输出 JSON（不要 markdown 代码块）：
{
  "reply": "中文回复",
  "actions": []
}

actions 可选值（不需要就留空数组）：
- {"type":"set_exam","examType":"IELTS|TOEFL|GRE|SAT|CET6","date":"YYYY-MM-DD","target":"7.0"}
  用户说「帮我定 12 月 1 日考雅思」时用
- {"type":"set_daily_goal","value":20}
  用户说「每天想多背一点」时用
- {"type":"goto","route":"/listening","label":"去做听力"}
  建议用户去做某件事时，附上跳转按钮
"""

VALID_ROUTES = {
    '/learn', '/review', '/listening', '/speaking', '/dialogue',
    '/reading', '/library', '/photo', '/writing', '/grammar', '/path', '/plan',
}


def build_context(data: dict) -> str:
    """把前端传来的数据整理成给模型看的上下文"""
    keys = [
        ('learnedCount', '已学单词数'),
        ('wrongCount', '错题本词数'),
        ('streak', '连续打卡天数'),
        ('checkinDays', '累计打卡天数'),
        ('points', '积分余额'),
        ('isMember', '是否会员'),
        ('examType', '目标考试'),
        ('examDate', '考试日期'),
        ('daysLeft', '距考试天数'),
        ('targetScore', '目标分'),
        ('dailyGoal', '每日新词目标'),
        ('todayLearned', '今日已学新词'),
        ('todayReviewed', '今日已复习'),
        ('pathProgress', '学习路径进度'),
        ('recentModules', '最近用过的模块'),
        ('totalWords', '平台总词库量'),
    ]
    lines = []
    for k, label in keys:
        v = data.get(k)
        if v in (None, '', [], 0, False):
            continue
        lines.append(f'- {label}：{v}')
    return '用户学习数据：\n' + ('\n'.join(lines) if lines else '（暂无数据，用户可能是新用户）')


def _clean_json(raw: str) -> dict:
    c = raw.strip()
    if c.startswith('```'):
        c = c.strip('`')
        if '\n' in c:
            c = c.split('\n', 1)[1]
        if c.endswith('```'):
            c = c[:-3]
    return json.loads(c)


def sanitize_actions(actions: Any) -> list[dict]:
    """只放行白名单内的动作，防止模型乱改或注入"""
    out: list[dict] = []
    if not isinstance(actions, list):
        return out
    for a in actions[:3]:
        if not isinstance(a, dict):
            continue
        t = a.get('type')
        if t == 'set_exam':
            ex = str(a.get('examType') or '').upper()
            date = str(a.get('date') or '')
            if ex not in ('IELTS', 'TOEFL', 'GRE', 'SAT', 'CET6', 'OTHER'):
                continue
            if len(date) != 10 or date[4] != '-' or date[7] != '-':
                continue
            out.append({
                'type': 'set_exam', 'examType': ex, 'date': date,
                'target': str(a.get('target') or '')[:20],
            })
        elif t == 'set_daily_goal':
            try:
                v = int(a.get('value'))
            except (TypeError, ValueError):
                continue
            if 1 <= v <= 200:
                out.append({'type': 'set_daily_goal', 'value': v})
        elif t == 'goto':
            route = str(a.get('route') or '')
            if route in VALID_ROUTES:
                out.append({
                    'type': 'goto', 'route': route,
                    'label': str(a.get('label') or '去看看')[:20],
                })
    return out


async def chat(messages: list[dict], context: dict) -> dict:
    """教练对话。messages 形如 [{role, content}]，最后一条是用户输入。"""
    import asyncio

    from app.core.config import get_settings
    from vocab_agent_llm import ChatMessage, ChatOptions, create_llm_client

    settings = get_settings()
    client = create_llm_client(provider=settings.llm_provider,
                               api_key=settings.deepseek_api_key)

    ctx = build_context(context)
    history = messages[-8:]      # 只带最近 8 轮，控制 token

    chat_messages = [ChatMessage(role='system', content=_SYSTEM + '\n\n' + ctx)]
    for m in history:
        role = m.get('role')
        if role not in ('user', 'assistant'):
            continue
        content = str(m.get('content') or '')[:2000]
        if content:
            chat_messages.append(ChatMessage(role=role, content=content))

    def _call() -> str:
        return client.chat(chat_messages, ChatOptions(temperature=0.7, max_tokens=1800))

    raw = await asyncio.get_event_loop().run_in_executor(None, _call)

    try:
        d = _clean_json(raw)
        reply = str(d.get('reply') or '').strip()
        actions = sanitize_actions(d.get('actions'))
    except Exception as e:
        logger.warning(f'教练回复解析失败: {e}')
        reply, actions = raw.strip(), []

    return {'reply': reply or '抱歉，我没想好怎么回答，换个说法再问一次？', 'actions': actions}
