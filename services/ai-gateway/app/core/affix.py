"""词根词缀引擎

- PREFIXES / ROOTS / SUFFIXES：常用前缀、词根、后缀库（含含义）
- decompose()：对任意英文单词做前缀-词根-后缀拆解

设计目的：手工逐词维护的词表覆盖面有限（收录不到的词就没拆解），
用「词库 + 算法拆解」可以把覆盖率提升到绝大多数拉丁/希腊词源的学术词汇。
"""
from __future__ import annotations

import re

# ============ 前缀 ============
PREFIXES: dict[str, str] = {
    'ab': '离开', 'ad': '向、朝', 'ambi': '两者', 'ante': '在前', 'anti': '反对、抗',
    'auto': '自己', 'be': '使、加强', 'bene': '好、善', 'bi': '二、双',
    'circum': '环绕', 'co': '共同', 'col': '共同', 'com': '共同、加强',
    'con': '共同、加强', 'contra': '相反', 'counter': '反对、反', 'de': '向下、去除',
    'di': '二、分', 'dia': '穿过', 'dis': '否定、分开', 'dys': '不良、困难',
    'e': '出、向外', 'en': '使…、进入', 'em': '使…、进入', 'epi': '在…之上',
    'equi': '相等', 'ex': '出、向外、前任', 'extra': '超出、额外', 'fore': '前、预先',
    'geo': '地球', 'hetero': '不同', 'homo': '相同', 'hyper': '过度、超',
    'hypo': '不足、在下', 'il': '否定（用于 l 前）', 'im': '否定、向内（用于 m/p/b 前）',
    'in': '否定、向内', 'inter': '在…之间、相互', 'intra': '内部', 'intro': '向内',
    'ir': '否定（用于 r 前）', 'macro': '宏大、宏观', 'mal': '坏、恶',
    'micro': '微小、微观', 'mid': '中间', 'mini': '小', 'mis': '错误、坏',
    'mono': '单一', 'multi': '多', 'neo': '新', 'non': '非、不',
    'ob': '反对、朝向', 'omni': '全、都', 'out': '超出、向外', 'over': '过度、在上',
    'pan': '全、泛', 'para': '旁边、类似', 'per': '贯穿、彻底', 'peri': '周围',
    'poly': '多', 'post': '后', 'pre': '在前、预先', 'pro': '向前、支持',
    'pseudo': '假、伪', 're': '再、回、反', 'retro': '向后、回顾', 'semi': '半',
    'sub': '在下、次', 'suc': '在下', 'suf': '在下', 'sup': '在下',
    'super': '在上、超', 'sur': '超过、在上', 'sym': '共同', 'syn': '共同',
    'tele': '远', 'trans': '跨越、转移', 'tri': '三', 'ultra': '极端、超',
    'un': '否定、相反', 'under': '在下、不足', 'uni': '单一', 'vice': '副、次',
    'with': '向后、相反',
}

# ============ 词根 ============
ROOTS: dict[str, str] = {
    'act': '做、行动', 'ag': '做、驱动', 'alter': '其他、改变', 'anim': '生命、精神',
    'ann': '年', 'aqu': '水', 'arch': '统治、首要', 'aud': '听',
    'bio': '生命', 'brev': '短', 'cap': '拿、头', 'capt': '拿、抓',
    'ced': '走、让', 'cede': '走、让', 'cept': '拿、取', 'cern': '区分、筛选',
    'chron': '时间', 'cid': '切、杀', 'cise': '切', 'civ': '公民',
    'claim': '喊、叫', 'clam': '喊、叫', 'clar': '清楚、明亮', 'clin': '倾斜',
    'clud': '关闭', 'clus': '关闭', 'cogn': '知道', 'corp': '身体',
    'cosm': '宇宙、秩序', 'cred': '相信', 'cresc': '生长', 'cur': '跑、关心',
    'curs': '跑', 'cycl': '圆、循环', 'dem': '人民', 'derm': '皮肤',
    'dic': '说', 'dict': '说', 'domin': '统治、主宰', 'don': '给予',
    'duc': '引导', 'duct': '引导', 'dur': '持久、硬', 'equ': '相等',
    'fac': '做、制造', 'fact': '做、制造', 'fect': '做、制造', 'fer': '带来、拿',
    'fid': '信任', 'fin': '结束、界限', 'firm': '坚固', 'flect': '弯曲',
    'flex': '弯曲', 'flor': '花', 'flu': '流动', 'form': '形状',
    'fort': '强、力量', 'frag': '破碎', 'fract': '破碎', 'fund': '基础、底',
    'gen': '产生、种类', 'geo': '土地', 'grad': '步、走、等级', 'grat': '感谢、愉快',
    'grav': '重', 'greg': '群体', 'gress': '走', 'hab': '拥有、居住',
    'hydr': '水', 'ject': '投掷', 'jud': '判断', 'junct': '连接',
    'jur': '法律、宣誓', 'labor': '劳动', 'lect': '选择、读、收集', 'leg': '读、法、派遣',
    'lev': '举起、轻', 'liber': '自由', 'liter': '文字', 'loc': '地方',
    'log': '言语、学问', 'loqu': '说', 'luc': '光', 'lum': '光',
    'man': '手', 'mand': '命令', 'mar': '海', 'mater': '母亲、物质',
    'mem': '记忆', 'ment': '心智、思考', 'merg': '沉、浸', 'meter': '测量',
    'migr': '迁移', 'min': '小、突出', 'miss': '送、派', 'mit': '送、派',
    'mob': '移动', 'mort': '死亡', 'mot': '移动', 'mov': '移动',
    'mut': '改变', 'nat': '出生', 'nav': '船、航行', 'neg': '否定',
    'nom': '名字、法则', 'nov': '新', 'numer': '数字', 'oper': '工作',
    'opt': '选择、视觉', 'ordin': '顺序、命令', 'pact': '固定、紧', 'par': '准备、显现、平等',
    'pass': '通过、感受', 'path': '感受、疾病', 'ped': '脚、儿童', 'pel': '推动',
    'pend': '悬挂、称量', 'pens': '称量、思考', 'phil': '爱', 'phon': '声音',
    'photo': '光', 'plic': '折叠、缠绕', 'ply': '折叠、缠绕', 'pon': '放置',
    'pop': '人民', 'port': '携带、港口', 'pos': '放置', 'prehend': '抓住',
    'press': '压', 'prim': '第一、主要', 'priv': '私人、剥夺', 'prob': '证明、检验',
    'proper': '自己的', 'puls': '推动、跳动', 'punct': '点、刺', 'quir': '寻求',
    'quisit': '寻求', 'reg': '统治、规则', 'rupt': '破裂', 'sci': '知道',
    'scrib': '写', 'script': '写', 'sect': '切', 'secut': '跟随',
    'sent': '感觉', 'sequ': '跟随', 'serv': '服务、保持', 'sid': '坐',
    'sign': '记号', 'simil': '相似', 'sist': '站立', 'soci': '社会、同伴',
    'sol': '单独、太阳', 'solv': '松开、解决', 'son': '声音', 'spec': '看',
    'spect': '看', 'spir': '呼吸、精神', 'sta': '站立', 'stat': '站立',
    'struct': '建造', 'sum': '拿、取', 'tact': '接触', 'tain': '持有',
    'tend': '伸展', 'tent': '伸展', 'term': '结束、界限', 'terr': '土地',
    'test': '证明、见证', 'text': '编织', 'tract': '拉、拖', 'trib': '给予、分配',
    'trud': '推', 'urb': '城市', 'vac': '空', 'vad': '走',
    'val': '价值、强健', 'ven': '来', 'vent': '来', 'ver': '真实',
    'vert': '转', 'vid': '看', 'vis': '看', 'viv': '生命',
    'voc': '声音、呼唤', 'volv': '滚动、卷', 'vol': '意愿', 'vor': '吃',
    'graph': '写、画', 'gram': '写、画', 'magn': '大', 'maxim': '最大',
    'max': '最大', 'thes': '放置', 'thet': '放置', 'crat': '统治、权力',
    'democr': '民主', 'fin': '结束、界限', 'flam': '火焰', 'err': '漫游、犯错',
    'ess': '存在', 'fend': '打击', 'fest': '节日、公开', 'firm': '坚固',
    'labor': '劳动', 'lingu': '语言', 'lumin': '光', 'mand': '命令',
    'mens': '测量', 'mod': '方式、尺度', 'norm': '标准', 'nounc': '宣布',
    'nutri': '营养', 'pati': '忍受', 'pict': '画', 'plen': '满',
    'prehend': '抓住', 'prehend': '抓住', 'radi': '光线', 'rect': '直、正',
    'rid': '笑', 'rog': '问、要求', 'sanct': '神圣', 'sat': '足够',
    'sembl': '相似', 'sens': '感觉', 'somn': '睡眠', 'sorb': '吸收',
    'string': '拉紧', 'stru': '建造', 'summ': '顶点、总', 'tempt': '尝试',
    'ten': '持有', 'tend': '伸展', 'tort': '扭曲', 'tour': '转',
    'tract': '拉、拖', 'vac': '空', 'vinc': '征服', 'viol': '力量、暴力',
    'cre': '生长、产生', 'prov': '证明、检验', 'sper': '希望', 'termin': '界限、结束',
    'test': '证明、见证', 'firm': '坚固', 'mand': '命令', 'norm': '标准',
}

# ============ 后缀 ============
SUFFIXES: dict[str, str] = {
    # 形容词
    'able': '形容词后缀，能…的', 'ible': '形容词后缀，能…的', 'al': '形容词后缀，…的',
    'ial': '形容词后缀，…的', 'ic': '形容词后缀，…的', 'ical': '形容词后缀，…的',
    'ant': '形容词/名词后缀，…的（人）', 'ent': '形容词/名词后缀，…的（人）',
    'ive': '形容词后缀，有…性质的', 'ous': '形容词后缀，多…的', 'ious': '形容词后缀，多…的',
    'ful': '形容词后缀，充满…的', 'less': '形容词后缀，无…的', 'ish': '形容词后缀，略…的',
    'ary': '形容词/名词后缀', 'ory': '形容词/名词后缀', 'ate': '动词/形容词后缀',
    'en': '动词/形容词后缀，使…', 'like': '形容词后缀，像…的', 'ward': '副词后缀，朝…方向',
    # 动词
    'fy': '动词后缀，使…化', 'ify': '动词后缀，使…化', 'ize': '动词后缀，使…化',
    'ise': '动词后缀，使…化',
    # 名词
    'tion': '名词后缀，行为/状态', 'sion': '名词后缀，行为/状态',
    'ation': '名词后缀，行为/状态', 'ition': '名词后缀，行为/状态',
    'ment': '名词后缀，行为/结果', 'ness': '名词后缀，性质/状态',
    'ity': '名词后缀，性质/状态', 'ty': '名词后缀，性质/状态',
    'ance': '名词后缀，状态/行为', 'ence': '名词后缀，状态/行为',
    'er': '名词后缀，…的人/物', 'or': '名词后缀，…的人/物',
    'ist': '名词后缀，…主义者/专家', 'ism': '名词后缀，主义/学说',
    'ship': '名词后缀，身份/状态', 'hood': '名词后缀，时期/身份',
    'dom': '名词后缀，领域/状态', 'age': '名词后缀，行为/总称',
    'ure': '名词后缀，行为/结果', 'tude': '名词后缀，状态',
    'cy': '名词后缀，性质/状态', 'ry': '名词后缀，行为/总称',
    'logy': '名词后缀，…学科', 'ics': '名词后缀，…学',
    'ency': '名词后缀，性质/状态',
    # 副词
    'ly': '副词后缀，…地', 'wise': '副词后缀，在…方面',
}

# 手工词表里混进来的虚词/无词根词，拆解没有意义
STOPWORDS = {
    'the', 'be', 'of', 'and', 'to', 'in', 'that', 'have', 'it', 'for', 'not',
    'on', 'with', 'he', 'as', 'you', 'do', 'at', 'this', 'but', 'his', 'by',
    'from', 'they', 'we', 'say', 'her', 'she', 'or', 'an', 'will', 'my',
    'one', 'all', 'would', 'there', 'their', 'what', 'so', 'up', 'out', 'if',
    'about', 'who', 'get', 'which', 'go', 'me', 'when', 'make', 'can', 'like',
    'time', 'no', 'just', 'him', 'know', 'take', 'people', 'into', 'year',
    'your', 'good', 'some', 'could', 'them', 'see', 'other', 'than', 'then',
    'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also', 'back',
    'after', 'use', 'two', 'how', 'our', 'work', 'first', 'well', 'way',
    'even', 'new', 'want', 'because', 'any', 'these', 'give', 'day', 'most',
    'us', 'is', 'are', 'was', 'were', 'been', 'has', 'had', 'did', 'does',
    'am', 'being', 'very', 'too', 'more', 'much', 'many', 'such', 'own',
    'same', 'each', 'every', 'both', 'few', 'other', 'here', 'where', 'why',
}


def _clean(word: str) -> str:
    return re.sub(r'[^a-z]', '', word.lower().strip())


def decompose(word: str) -> dict | None:
    """对单词做 前缀-词根-后缀 拆解；无法拆解时返回 None。"""
    w = _clean(word)
    if len(w) < 4 or w in STOPWORDS:
        return None

    best = None  # (score, cover, prefix, suffix, root)
    prefix_cands = [''] + [p for p in PREFIXES if w.startswith(p) and len(w) - len(p) >= 4]
    for p in sorted(set(prefix_cands), key=len, reverse=True):
        rest = w[len(p):]
        suffix_cands = [''] + [s for s in SUFFIXES if rest.endswith(s) and len(rest) - len(s) >= 3]
        for s in sorted(set(suffix_cands), key=len, reverse=True):
            middle = rest[:len(rest) - len(s)] if s else rest
            if len(middle) < 3:
                continue
            root = next((r for r in sorted(ROOTS, key=len, reverse=True) if len(r) >= 3 and r in middle), None)
            score = (1 if p else 0) + (1 if s else 0) + (2 if root else 0)
            cover = (len(root) / len(middle)) if root else 0.0
            cand = (score, round(cover, 3), p, s, root)
            if best is None or cand[:2] > best[:2]:
                best = cand

    if not best:
        return None
    score, _cover, p, s, root = best
    if score < 2:  # 至少要有「词根」或有「前缀+后缀」才值得展示
        return None

    return {
        'prefix': f'{p}-' if p else '',
        'prefix_meaning': PREFIXES.get(p, '') if p else '',
        'root': root or '',
        'root_meaning': ROOTS.get(root, '') if root else '',
        'suffix': f'-{s}' if s else '',
        'suffix_meaning': SUFFIXES.get(s, '') if s else '',
    }
