"""口语朗读服务（句子库 + AI 发音评估，带 mock fallback）"""
from __future__ import annotations

import asyncio
import difflib
import functools
import json
import os

from loguru import logger
from vocab_agent_llm import ChatMessage, ChatOptions

from app.core.llm import get_llm_client
from app.prompts.speaking import build_speaking_messages
from app.schemas.speaking import (
    SpeakingAssessRequest,
    SpeakingAssessResponse,
    SpeakingSentence,
    Mispronounced,
)

USE_MOCK = os.getenv('USE_AI_MOCK', '').lower() in ('1', 'true', 'yes')

SENTENCES: list[dict] = [
    {'id': 's1', 'text': 'I think this theory is worth thinking about.', 'translation': '我认为这个理论值得思考。', 'focus': 'th 音', 'difficulty': 'easy'},
    {'id': 's2', 'text': 'The weather this Thursday will be better than last Thursday.', 'translation': '这周四的天气会比上周四好。', 'focus': 'th 音', 'difficulty': 'medium'},
    {'id': 's3', 'text': 'The red lorry rolled slowly down the road.', 'translation': '那辆红色卡车沿路缓缓行驶。', 'focus': 'r / l 区分', 'difficulty': 'easy'},
    {'id': 's4', 'text': 'We will visit the village next Wednesday.', 'translation': '我们下周三会去参观那个村庄。', 'focus': 'v / w 区分', 'difficulty': 'easy'},
    {'id': 's5', 'text': 'She finished her work and decided to relax.', 'translation': '她完成了工作，决定放松一下。', 'focus': '-ed 结尾', 'difficulty': 'easy'},
    {'id': 's6', 'text': 'I like to ride my bike by the riverside.', 'translation': '我喜欢在河边骑自行车。', 'focus': '长短 i 音', 'difficulty': 'easy'},
    {'id': 's7', 'text': 'The teacher is about to give us a lesson.', 'translation': '老师正要给我们上课。', 'focus': '弱读 schwa', 'difficulty': 'medium'},
    {'id': 's8', 'text': 'Please close the windows and turn off the lights.', 'translation': '请关上窗户并关掉灯。', 'focus': 's / z 区分', 'difficulty': 'medium'},
    {'id': 's9', 'text': 'The present is a present for the president.', 'translation': '这份礼物是送给总统的。', 'focus': '词性重音', 'difficulty': 'hard'},
    {'id': 's10', 'text': 'He asked for a task that was quite complex.', 'translation': '他要求了一个相当复杂的任务。', 'focus': '辅音连缀', 'difficulty': 'medium'},
    {'id': 's11', 'text': 'Would you like to come to the party tonight?', 'translation': '你今晚想来参加聚会吗？', 'focus': '疑问句语调', 'difficulty': 'easy'},
    {'id': 's12', 'text': 'The rabbit ran around the red rock.', 'translation': '兔子绕着红石头跑。', 'focus': 'r 音', 'difficulty': 'easy'},
    {'id': 's13', 'text': 'She is singing a long song.', 'translation': '她正在唱一首长歌。', 'focus': 'ng 音', 'difficulty': 'easy'},
    {'id': 's14', 'text': 'She sells seashells on the seashore.', 'translation': '她在海边卖海贝壳。', 'focus': 'sh 音（绕口令）', 'difficulty': 'hard'},
    {'id': 's15', 'text': 'The baby bought a pair of purple boots.', 'translation': '宝宝买了一双紫色的靴子。', 'focus': 'p / b 区分', 'difficulty': 'easy'},
    {'id': 's16', 'text': 'I did not say he stole the money.', 'translation': '我没说他偷了钱。（重音不同含义不同）', 'focus': '句子重音', 'difficulty': 'hard'},
    {'id': 's17', 'text': 'Turn it off and pick it up.', 'translation': '把它关掉，然后捡起来。', 'focus': '连读', 'difficulty': 'medium'},
    {'id': 's18', 'text': 'Would you like a cup of tea?', 'translation': '你想来杯茶吗？', 'focus': '弱读', 'difficulty': 'easy'},
    {'id': 's19', 'text': 'The plane is late, so we have to wait.', 'translation': '飞机晚点了，所以我们得等。', 'focus': '长 a 音', 'difficulty': 'easy'},
    {'id': 's20', 'text': 'I found a round house in the south.', 'translation': '我在南方发现了一栋圆形的房子。', 'focus': 'ou 音', 'difficulty': 'medium'},
    {'id': 's21', 'text': 'Do not forget to hand in your report.', 'translation': '别忘了交你的报告。', 'focus': '词尾辅音', 'difficulty': 'easy'},
    {'id': 's22', 'text': 'Three brothers threw three red balls.', 'translation': '三兄弟扔了三个红球。', 'focus': 'th 与 r 连用', 'difficulty': 'hard'},
    {'id': 's23', 'text': 'She watches matches and washes dishes.', 'translation': '她看比赛、洗碗。', 'focus': '-s/-es 结尾', 'difficulty': 'medium'},
    {'id': 's24', 'text': 'I bought apples, oranges, and bananas.', 'translation': '我买了苹果、橙子和香蕉。', 'focus': '列举语调', 'difficulty': 'easy'},
]


def _clean_json(raw: str) -> dict:
    cleaned = raw.strip()
    if cleaned.startswith('```'):
        cleaned = cleaned.strip('`')
        if '\n' in cleaned:
            cleaned = cleaned.split('\n', 1)[1]
        if cleaned.endswith('```'):
            cleaned = cleaned[:-3]
    return json.loads(cleaned)


def _simple_compare(text: str, transcript: str) -> dict:
    """无 AI 时的简单对比：用 difflib 找不一致的词"""
    target_words = [w.lower().strip('.,!?') for w in text.split()]
    said_words = [w.lower().strip('.,!?') for w in transcript.split()]
    mis: list[Mispronounced] = []
    for tw in target_words:
        if tw not in said_words:
            mis.append(Mispronounced(word=tw, tip='这个单词没有读出来或读得不准，建议对照音标再读一遍。'))
    accuracy = max(0, 100 - len(mis) * 15) if target_words else 100
    return {
        'accuracy': accuracy,
        'feedback': f'识别到 {len(said_words)} 个词，其中有 {len(mis)} 个词可能读得不准。',
        'mispronounced': mis[:6],
    }


async def assess_speaking(req: SpeakingAssessRequest) -> SpeakingAssessResponse:
    """发音评估（带 mock fallback）"""
    if USE_MOCK:
        return SpeakingAssessResponse(**_simple_compare(req.text, req.transcript), is_mock=True)

    try:
        client = get_llm_client()
        messages = build_speaking_messages(req.text, req.transcript)
        chat_messages = [ChatMessage(role=m["role"], content=m["content"]) for m in messages]
        raw = await _to_thread(
            client.chat, chat_messages, ChatOptions(temperature=0.3, max_tokens=1200)
        )
        data = _clean_json(raw)
        return SpeakingAssessResponse(
            accuracy=int(data.get('accuracy', 0)),
            feedback=data.get('feedback', ''),
            mispronounced=[Mispronounced(**m) for m in data.get('mispronounced', [])],
            is_mock=False,
        )
    except Exception as e:
        logger.warning(f"Speaking assess LLM failed, fallback: {e}")
        return SpeakingAssessResponse(**_simple_compare(req.text, req.transcript), is_mock=True)


async def _to_thread(fn, *args, **kwargs):
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, functools.partial(fn, *args, **kwargs))
