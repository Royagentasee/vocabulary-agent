"""Mock AI 数据生成器

当 DeepSeek 不可用（余额不足、超时等）时，fallback 到本地生成的解释。
避免前端显示"服务异常"这种难看提示。

设计原则：
- 用 DB 里的 translation 作为基础
- 基于 pos + translation 启发式生成 memory_tip
- 给通用模板（etymology、examples）
- 词根词缀拆解来自本地数据 word_roots.py（~150+ 词）
"""
from __future__ import annotations

from typing import Any

from app.core.word_roots import get_root as _get_root


def _template_example(word: str, pos: str) -> str:
    """根据词性生成例句模板"""
    templates = {
        'v': f'The verb "{word}" is often used in academic writing.',
        'n': f'The noun "{word}" appears frequently in IELTS reading passages.',
        'adj': f'The adjective "{word}" is useful for describing nuanced qualities.',
        'adv': f'The adverb "{word}" helps express subtle degrees.',
        'prep': f'The preposition "{word}" connects ideas in sentences.',
        'conj': f'The conjunction "{word}" links clauses together.',
        'pron': f'The pronoun "{word}" refers to previously mentioned nouns.',
        'art': f'The article "{word}" specifies definiteness.',
        'interj': f'The interjection "{word}" expresses sudden emotion.',
    }
    return templates.get(pos, f'Use "{word}" appropriately in context.')


def _template_memory_tip(pos: str, translation: str) -> str:
    """根据词性 + 翻译生成记忆窍门"""
    if not translation:
        return f'记住词性：{pos}（建议查词典查看完整释义）'
    if pos in ('v',):
        return f'动词，记核心含义「{translation}」，注意及物/不及物用法'
    if pos in ('n',):
        return f'名词，核心义「{translation}」，联想一个具体场景记忆'
    if pos in ('adj',):
        return f'形容词，核心义「{translation}」，找 2 个例句加深印象'
    if pos in ('adv',):
        return f'副词「{translation}」，注意修饰动词/形容词/句子'
    if pos in ('prep',):
        return f'介词「{translation}」，注意固定搭配'
    if pos in ('conj',):
        return f'连词「{translation}」，注意连接句子还是从句'
    return f'{pos}，核心义「{translation}」'


def _template_etymology(headword: str, pos_str: str, root: dict | None) -> str:
    """根据词根词缀生成 etymology"""
    if root:
        # 用词根词缀格式化
        parts = []
        if root['prefix']:
            parts.append(f"{root['prefix']} ({root['prefix_meaning']})")
        if root['root']:
            parts.append(f"{root['root']} ({root['root_meaning']})")
        if root['suffix']:
            parts.append(f"{root['suffix']} ({root['suffix_meaning']})")
        if parts:
            return f"{headword} = " + " + ".join(parts)
    return (
        f'该词属于 {pos_str} 类常用词汇。'
        '详细词源信息可在韦氏词典或 etymonline.com 查询。'
    )


def generate_mock_explanation(
    headword: str,
    pos: list[str] | str,
    translation: str,
    definition_en: str = '',
    etymology_db: str = '',
    frq: float = 50.0,
) -> dict[str, Any]:
    """根据词条基础信息生成 mock AI 解释"""
    pos_str = pos[0] if isinstance(pos, list) and pos else (pos if isinstance(pos, str) else 'n')

    # 词根词缀拆解
    root = _get_root(headword)

    # etymology 优先级：DB 字段 > 词根拆解格式 > 通用模板
    if etymology_db:
        etymology = etymology_db
    elif root:
        etymology = _template_etymology(headword, pos_str, root)
    else:
        etymology = f'该词属于 {pos_str} 类常用词汇。详细词源信息可在韦氏词典或 etymonline.com 查询。'

    # memory_tip 基于词性 + 翻译
    memory_tip = _template_memory_tip(pos_str, translation)

    # senses（至少一个）
    senses = [
        {
            'pos': pos_str,
            'definition_en': definition_en or f'a {pos_str} meaning "{translation}"',
            'definition_cn': translation or headword,
        }
    ]

    # examples（一个通用例句）
    examples = [
        {
            'sentence': _template_example(headword, pos_str),
            'translation': f'我在学习中遇到了「{headword}」这个词。',
            'source': '通用例句',
        }
    ]

    collocations: list[str] = []

    return {
        'headword': headword,
        'ipa': '',
        'pos': pos if isinstance(pos, list) else [pos_str],
        'etymology': etymology,
        'root_affix': root,  # 词根词缀拆解（可能为 None）
        'senses': senses,
        'examples': examples,
        'collocations': collocations,
        'difficulty': 'easy' if frq > 70 else ('medium' if frq > 40 else 'hard'),
        'memory_tip': memory_tip,
        'cached': False,
        'is_mock': True,
    }


def generate_mock_quiz(
    headword: str,
    pos: list[str] | str,
    translation: str,
) -> dict[str, Any]:
    """Mock AI 出题（4 选 1）"""
    pos_str = pos[0] if isinstance(pos, list) and pos else (pos if isinstance(pos, str) else 'n')

    correct = translation or headword
    if pos_str == 'v':
        distractors = ['名词', '形容词', '副词']
    elif pos_str == 'n':
        distractors = ['动词', '形容词', '副词']
    elif pos_str == 'adj':
        distractors = ['动词', '名词', '副词']
    else:
        distractors = ['名词', '形容词', '动词']

    choices = [correct] + distractors
    labels = ['A', 'B', 'C', 'D']

    import random
    rnd = random.Random(headword)
    indices = list(range(4))
    rnd.shuffle(indices)
    shuffled = [choices[i] for i in indices]
    shuffled_labels = [labels[i] for i in indices]
    correct_label = shuffled_labels[shuffled.index(correct)]

    return {
        'headword': headword,
        'sentence': f'请选择「{headword}」的正确释义。',
        'choices': [{'label': shuffled_labels[i], 'text': shuffled[i]} for i in range(4)],
        'correct_label': correct_label,
        'explanation': f'"{headword}" 是 {pos_str}，核心含义是「{translation}」。干扰项是其他词性。',
        'difficulty': 'medium',
        'is_mock': True,
    }