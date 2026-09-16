"""词根词缀数据

精选 150+ 高频词 + 49 GRE 核心词的词根词缀拆解。
键：headword（小写）
值：{prefix, prefix_meaning, root, root_meaning, suffix, suffix_meaning}
"""
from __future__ import annotations

from typing import TypedDict


class Affix(TypedDict):
    prefix: str
    prefix_meaning: str
    root: str
    root_meaning: str
    suffix: str
    suffix_meaning: str


# 精选词根词缀拆解（150+ 常用 + 49 GRE）
ROOT_DATA: dict[str, Affix] = {
    # === 基础高频词（按出现顺序）===
    "the": {"prefix": "", "prefix_meaning": "", "root": "the", "root_meaning": "指示代词", "suffix": "", "suffix_meaning": ""},
    "be": {"prefix": "", "prefix_meaning": "", "root": "be", "root_meaning": "存在", "suffix": "", "suffix_meaning": ""},
    "of": {"prefix": "", "prefix_meaning": "", "root": "of", "root_meaning": "出自", "suffix": "", "suffix_meaning": ""},
    "and": {"prefix": "", "prefix_meaning": "", "root": "and", "root_meaning": "加", "suffix": "", "suffix_meaning": ""},
    "to": {"prefix": "", "prefix_meaning": "", "root": "to", "root_meaning": "方向", "suffix": "", "suffix_meaning": ""},
    "in": {"prefix": "", "prefix_meaning": "", "root": "in", "root_meaning": "在内", "suffix": "", "suffix_meaning": ""},
    "that": {"prefix": "", "prefix_meaning": "", "root": "that", "root_meaning": "那个", "suffix": "", "suffix_meaning": ""},
    "have": {"prefix": "", "prefix_meaning": "", "root": "have", "root_meaning": "拥有", "suffix": "", "suffix_meaning": ""},
    "it": {"prefix": "", "prefix_meaning": "", "root": "it", "root_meaning": "它", "suffix": "", "suffix_meaning": ""},
    "for": {"prefix": "", "prefix_meaning": "", "root": "for", "root_meaning": "为了", "suffix": "", "suffix_meaning": ""},
    "on": {"prefix": "", "prefix_meaning": "", "root": "on", "root_meaning": "在…上", "suffix": "", "suffix_meaning": ""},
    "with": {"prefix": "", "prefix_meaning": "", "root": "with", "root_meaning": "和…一起", "suffix": "", "suffix_meaning": ""},
    "he": {"prefix": "", "prefix_meaning": "", "root": "he", "root_meaning": "他", "suffix": "", "suffix_meaning": ""},
    "you": {"prefix": "", "prefix_meaning": "", "root": "you", "root_meaning": "你", "suffix": "", "suffix_meaning": ""},
    "do": {"prefix": "", "prefix_meaning": "", "root": "do", "root_meaning": "做", "suffix": "", "suffix_meaning": ""},
    "at": {"prefix": "", "prefix_meaning": "", "root": "at", "root_meaning": "在", "suffix": "", "suffix_meaning": ""},
    "this": {"prefix": "", "prefix_meaning": "", "root": "this", "root_meaning": "这", "suffix": "", "suffix_meaning": ""},
    "but": {"prefix": "", "prefix_meaning": "", "root": "but", "root_meaning": "但是", "suffix": "", "suffix_meaning": ""},
    "his": {"prefix": "", "prefix_meaning": "", "root": "his", "root_meaning": "他的", "suffix": "", "suffix_meaning": ""},
    "from": {"prefix": "", "prefix_meaning": "", "root": "from", "root_meaning": "从", "suffix": "", "suffix_meaning": ""},
    "they": {"prefix": "", "prefix_meaning": "", "root": "they", "root_meaning": "他们", "suffix": "", "suffix_meaning": ""},
    "we": {"prefix": "", "prefix_meaning": "", "root": "we", "root_meaning": "我们", "suffix": "", "suffix_meaning": ""},
    "say": {"prefix": "", "prefix_meaning": "", "root": "say", "root_meaning": "说", "suffix": "", "suffix_meaning": ""},
    "her": {"prefix": "", "prefix_meaning": "", "root": "her", "root_meaning": "她的", "suffix": "", "suffix_meaning": ""},
    "she": {"prefix": "", "prefix_meaning": "", "root": "she", "root_meaning": "她", "suffix": "", "suffix_meaning": ""},
    "or": {"prefix": "", "prefix_meaning": "", "root": "or", "root_meaning": "或者", "suffix": "", "suffix_meaning": ""},
    "an": {"prefix": "", "prefix_meaning": "", "root": "an", "root_meaning": "一个", "suffix": "", "suffix_meaning": ""},
    "will": {"prefix": "", "prefix_meaning": "", "root": "will", "root_meaning": "愿意", "suffix": "", "suffix_meaning": ""},
    "my": {"prefix": "", "prefix_meaning": "", "root": "my", "root_meaning": "我的", "suffix": "", "suffix_meaning": ""},
    "one": {"prefix": "", "prefix_meaning": "", "root": "one", "root_meaning": "一", "suffix": "", "suffix_meaning": ""},
    "all": {"prefix": "al-", "prefix_meaning": "全", "root": "all", "root_meaning": "全部", "suffix": "", "suffix_meaning": ""},
    "would": {"prefix": "", "prefix_meaning": "", "root": "would", "root_meaning": "会", "suffix": "", "suffix_meaning": ""},
    "there": {"prefix": "", "prefix_meaning": "", "root": "there", "root_meaning": "那里", "suffix": "", "suffix_meaning": ""},
    "their": {"prefix": "", "prefix_meaning": "", "root": "their", "root_meaning": "他们的", "suffix": "", "suffix_meaning": ""},
    "what": {"prefix": "", "prefix_meaning": "", "root": "what", "root_meaning": "什么", "suffix": "", "suffix_meaning": ""},
    "so": {"prefix": "", "prefix_meaning": "", "root": "so", "root_meaning": "所以", "suffix": "", "suffix_meaning": ""},
    "up": {"prefix": "", "prefix_meaning": "", "root": "up", "root_meaning": "上", "suffix": "", "suffix_meaning": ""},
    "out": {"prefix": "", "prefix_meaning": "", "root": "out", "root_meaning": "外", "suffix": "", "suffix_meaning": ""},
    "if": {"prefix": "", "prefix_meaning": "", "root": "if", "root_meaning": "如果", "suffix": "", "suffix_meaning": ""},
    "about": {"prefix": "ab-", "prefix_meaning": "离开", "root": "out", "root_meaning": "外", "suffix": "", "suffix_meaning": ""},
    "who": {"prefix": "", "prefix_meaning": "", "root": "who", "root_meaning": "谁", "suffix": "", "suffix_meaning": ""},
    "get": {"prefix": "", "prefix_meaning": "", "root": "get", "root_meaning": "得到", "suffix": "", "suffix_meaning": ""},
    "which": {"prefix": "", "prefix_meaning": "", "root": "which", "root_meaning": "哪个", "suffix": "", "suffix_meaning": ""},
    "go": {"prefix": "", "prefix_meaning": "", "root": "go", "root_meaning": "去", "suffix": "", "suffix_meaning": ""},
    "me": {"prefix": "", "prefix_meaning": "", "root": "me", "root_meaning": "我", "suffix": "", "suffix_meaning": ""},
    "when": {"prefix": "", "prefix_meaning": "", "root": "when", "root_meaning": "何时", "suffix": "", "suffix_meaning": ""},
    "make": {"prefix": "", "prefix_meaning": "", "root": "make", "root_meaning": "做", "suffix": "", "suffix_meaning": ""},
    "can": {"prefix": "", "prefix_meaning": "", "root": "can", "root_meaning": "能", "suffix": "", "suffix_meaning": ""},
    "like": {"prefix": "", "prefix_meaning": "", "root": "like", "root_meaning": "像", "suffix": "", "suffix_meaning": ""},
    "time": {"prefix": "", "prefix_meaning": "", "root": "time", "root_meaning": "时间", "suffix": "", "suffix_meaning": ""},
    "no": {"prefix": "", "prefix_meaning": "", "root": "no", "root_meaning": "不", "suffix": "", "suffix_meaning": ""},
    "just": {"prefix": "", "prefix_meaning": "", "root": "just", "root_meaning": "公正", "suffix": "", "suffix_meaning": ""},
    "him": {"prefix": "", "prefix_meaning": "", "root": "him", "root_meaning": "他", "suffix": "", "suffix_meaning": ""},
    "know": {"prefix": "", "prefix_meaning": "", "root": "know", "root_meaning": "知道", "suffix": "", "suffix_meaning": ""},
    "take": {"prefix": "", "prefix_meaning": "", "root": "take", "root_meaning": "拿", "suffix": "", "suffix_meaning": ""},
    "people": {"prefix": "", "prefix_meaning": "", "root": "people", "root_meaning": "人们", "suffix": "", "suffix_meaning": ""},
    "into": {"prefix": "in-", "prefix_meaning": "在内", "root": "to", "root_meaning": "向", "suffix": "", "suffix_meaning": ""},
    "year": {"prefix": "", "prefix_meaning": "", "root": "year", "root_meaning": "年", "suffix": "", "suffix_meaning": ""},
    "your": {"prefix": "", "prefix_meaning": "", "root": "your", "root_meaning": "你的", "suffix": "", "suffix_meaning": ""},
    "good": {"prefix": "", "prefix_meaning": "", "root": "good", "root_meaning": "好", "suffix": "", "suffix_meaning": ""},
    "could": {"prefix": "", "prefix_meaning": "", "root": "could", "root_meaning": "能", "suffix": "", "suffix_meaning": ""},
    "them": {"prefix": "", "prefix_meaning": "", "root": "them", "root_meaning": "他们", "suffix": "", "suffix_meaning": ""},
    "see": {"prefix": "", "prefix_meaning": "", "root": "see", "root_meaning": "看", "suffix": "", "suffix_meaning": ""},
    "other": {"prefix": "oth-", "prefix_meaning": "其他的", "root": "er", "root_meaning": "比较级后缀", "suffix": "-er", "suffix_meaning": "形容词比较级后缀"},
    "than": {"prefix": "", "prefix_meaning": "", "root": "than", "root_meaning": "比", "suffix": "", "suffix_meaning": ""},
    "then": {"prefix": "", "prefix_meaning": "", "root": "then", "root_meaning": "然后", "suffix": "", "suffix_meaning": ""},
    "now": {"prefix": "", "prefix_meaning": "", "root": "now", "root_meaning": "现在", "suffix": "", "suffix_meaning": ""},
    "look": {"prefix": "", "prefix_meaning": "", "root": "look", "root_meaning": "看", "suffix": "", "suffix_meaning": ""},
    "only": {"prefix": "", "prefix_meaning": "", "root": "only", "root_meaning": "只", "suffix": "", "suffix_meaning": ""},
    "come": {"prefix": "", "prefix_meaning": "", "root": "come", "root_meaning": "来", "suffix": "", "suffix_meaning": ""},
    "its": {"prefix": "", "prefix_meaning": "", "root": "its", "root_meaning": "它的", "suffix": "", "suffix_meaning": ""},
    "over": {"prefix": "over-", "prefix_meaning": "在上", "root": "over", "root_meaning": "在…上", "suffix": "", "suffix_meaning": ""},
    "think": {"prefix": "", "prefix_meaning": "", "root": "think", "root_meaning": "想", "suffix": "", "suffix_meaning": ""},
    "also": {"prefix": "al-", "prefix_meaning": "全", "root": "so", "root_meaning": "如此", "suffix": "", "suffix_meaning": ""},
    "back": {"prefix": "", "prefix_meaning": "", "root": "back", "root_meaning": "回", "suffix": "", "suffix_meaning": ""},
    "after": {"prefix": "af-", "prefix_meaning": "在…", "root": "ter", "root_meaning": "次序", "suffix": "", "suffix_meaning": ""},
    "use": {"prefix": "", "prefix_meaning": "", "root": "use", "root_meaning": "使用", "suffix": "", "suffix_meaning": ""},
    "two": {"prefix": "", "prefix_meaning": "", "root": "two", "root_meaning": "二", "suffix": "", "suffix_meaning": ""},
    "how": {"prefix": "", "prefix_meaning": "", "root": "how", "root_meaning": "怎样", "suffix": "", "suffix_meaning": ""},
    "our": {"prefix": "", "prefix_meaning": "", "root": "our", "root_meaning": "我们的", "suffix": "", "suffix_meaning": ""},
    "work": {"prefix": "", "prefix_meaning": "", "root": "work", "root_meaning": "工作", "suffix": "", "suffix_meaning": ""},
    "first": {"prefix": "", "prefix_meaning": "", "root": "first", "root_meaning": "第一", "suffix": "", "suffix_meaning": ""},
    "well": {"prefix": "", "prefix_meaning": "", "root": "well", "root_meaning": "好", "suffix": "", "suffix_meaning": ""},
    "way": {"prefix": "", "prefix_meaning": "", "root": "way", "root_meaning": "路", "suffix": "", "suffix_meaning": ""},
    "even": {"prefix": "e-", "prefix_meaning": "出", "root": "ven", "root_meaning": "来", "suffix": "", "suffix_meaning": ""},
    "new": {"prefix": "", "prefix_meaning": "", "root": "new", "root_meaning": "新", "suffix": "", "suffix_meaning": ""},
    "want": {"prefix": "", "prefix_meaning": "", "root": "want", "root_meaning": "想", "suffix": "", "suffix_meaning": ""},
    "because": {"prefix": "be-", "prefix_meaning": "使", "root": "cause", "root_meaning": "原因", "suffix": "", "suffix_meaning": ""},
    "any": {"prefix": "an-", "prefix_meaning": "一", "root": "y", "root_meaning": "任一", "suffix": "", "suffix_meaning": ""},
    "these": {"prefix": "", "prefix_meaning": "", "root": "these", "root_meaning": "这些", "suffix": "", "suffix_meaning": ""},
    "give": {"prefix": "", "prefix_meaning": "", "root": "give", "root_meaning": "给", "suffix": "", "suffix_meaning": ""},
    "day": {"prefix": "", "prefix_meaning": "", "root": "day", "root_meaning": "日", "suffix": "", "suffix_meaning": ""},
    "most": {"prefix": "", "prefix_meaning": "", "root": "most", "root_meaning": "最多", "suffix": "", "suffix_meaning": ""},
    "us": {"prefix": "", "prefix_meaning": "", "root": "us", "root_meaning": "我们", "suffix": "", "suffix_meaning": ""},
    "is": {"prefix": "", "prefix_meaning": "", "root": "is", "root_meaning": "是", "suffix": "", "suffix_meaning": ""},
    "water": {"prefix": "", "prefix_meaning": "", "root": "water", "root_meaning": "水", "suffix": "", "suffix_meaning": ""},
    "long": {"prefix": "", "prefix_meaning": "", "root": "long", "root_meaning": "长", "suffix": "", "suffix_meaning": ""},
    "find": {"prefix": "", "prefix_meaning": "", "root": "find", "root_meaning": "找", "suffix": "", "suffix_meaning": ""},
    "here": {"prefix": "", "prefix_meaning": "", "root": "here", "root_meaning": "这里", "suffix": "", "suffix_meaning": ""},
    "thing": {"prefix": "", "prefix_meaning": "", "root": "thing", "root_meaning": "东西", "suffix": "", "suffix_meaning": ""},
    "many": {"prefix": "", "prefix_meaning": "", "root": "many", "root_meaning": "多", "suffix": "", "suffix_meaning": ""},
    # === 高频学习词 ===
    "computer": {"prefix": "com-", "prefix_meaning": "一起", "root": "put", "root_meaning": "思考/计算", "suffix": "-er", "suffix_meaning": "名词后缀"},
    "program": {"prefix": "pro-", "prefix_meaning": "向前", "root": "gram", "root_meaning": "书写", "suffix": "", "suffix_meaning": ""},
    "system": {"prefix": "sy-", "prefix_meaning": "一起", "root": "stem", "root_meaning": "站立", "suffix": "-em", "suffix_meaning": "名词后缀"},
    "memory": {"prefix": "mem-", "prefix_meaning": "记忆", "root": "or", "root_meaning": "人/状态", "suffix": "-y", "suffix_meaning": "名词后缀"},
    "technology": {"prefix": "tech-", "prefix_meaning": "技能", "root": "no", "root_meaning": "知识", "suffix": "-logy", "suffix_meaning": "学问"},
    "software": {"prefix": "soft-", "prefix_meaning": "软", "root": "war", "root_meaning": "产品", "suffix": "-e", "suffix_meaning": "名词后缀"},
    "internet": {"prefix": "inter-", "prefix_meaning": "在…之间", "root": "net", "root_meaning": "网", "suffix": "", "suffix_meaning": ""},
    "data": {"prefix": "", "prefix_meaning": "", "root": "data", "root_meaning": "已给", "suffix": "", "suffix_meaning": ""},
    "analysis": {"prefix": "ana-", "prefix_meaning": "向上/分开", "root": "lysis", "root_meaning": "松开", "suffix": "-is", "suffix_meaning": "名词后缀"},
    "language": {"prefix": "lingu-", "prefix_meaning": "语言", "root": "ag", "root_meaning": "行为", "suffix": "-e", "suffix_meaning": "名词后缀"},
    "school": {"prefix": "scho-", "prefix_meaning": "学校", "root": "ol", "root_meaning": "闲暇", "suffix": "", "suffix_meaning": ""},
    "education": {"prefix": "e-", "prefix_meaning": "出", "root": "duc", "root_meaning": "引导", "suffix": "-ation", "suffix_meaning": "名词后缀"},
    "student": {"prefix": "", "prefix_meaning": "", "root": "stud", "root_meaning": "学习", "suffix": "-ent", "suffix_meaning": "名词后缀（人）"},
    "university": {"prefix": "uni-", "prefix_meaning": "一", "root": "vers", "root_meaning": "转", "suffix": "-ity", "suffix_meaning": "名词后缀"},
    "science": {"prefix": "sci-", "prefix_meaning": "知道", "root": "ence", "root_meaning": "名词后缀", "suffix": "", "suffix_meaning": ""},
    "art": {"prefix": "", "prefix_meaning": "", "root": "art", "root_meaning": "技能", "suffix": "", "suffix_meaning": ""},
    "music": {"prefix": "", "prefix_meaning": "", "root": "music", "root_meaning": "缪斯（女神）", "suffix": "", "suffix_meaning": ""},
    "book": {"prefix": "", "prefix_meaning": "", "root": "book", "root_meaning": "山毛榉", "suffix": "", "suffix_meaning": ""},
    "read": {"prefix": "", "prefix_meaning": "", "root": "read", "root_meaning": "商量", "suffix": "", "suffix_meaning": ""},
    "write": {"prefix": "", "prefix_meaning": "", "root": "write", "root_meaning": "划", "suffix": "", "suffix_meaning": ""},
    "story": {"prefix": "", "prefix_meaning": "", "root": "story", "root_meaning": "历史", "suffix": "-y", "suffix_meaning": "名词后缀"},
    "family": {"prefix": "fam-", "prefix_meaning": "家", "root": "il", "root_meaning": "群体", "suffix": "-y", "suffix_meaning": "名词后缀"},
    "world": {"prefix": "", "prefix_meaning": "", "root": "world", "root_meaning": "世界（人/时代）", "suffix": "", "suffix_meaning": ""},
    "life": {"prefix": "", "prefix_meaning": "", "root": "life", "root_meaning": "生命", "suffix": "", "suffix_meaning": ""},
    "health": {"prefix": "heal-", "prefix_meaning": "全", "root": "th", "root_meaning": "状态", "suffix": "", "suffix_meaning": ""},
    "friend": {"prefix": "frien-", "prefix_meaning": "爱", "root": "d", "root_meaning": "名词后缀", "suffix": "", "suffix_meaning": ""},
    "industry": {"prefix": "indu-", "prefix_meaning": "在…上", "root": "str", "root_meaning": "建造", "suffix": "-y", "suffix_meaning": "名词后缀"},
    "business": {"prefix": "busi-", "prefix_meaning": "忙", "root": "ness", "root_meaning": "状态", "suffix": "", "suffix_meaning": ""},
    "community": {"prefix": "com-", "prefix_meaning": "一起", "root": "mun", "root_meaning": "服务/责任", "suffix": "-ity", "suffix_meaning": "名词后缀"},
    "philosophy": {"prefix": "philo-", "prefix_meaning": "爱", "root": "soph", "root_meaning": "智慧", "suffix": "-y", "suffix_meaning": "名词后缀"},
    "psychology": {"prefix": "psycho-", "prefix_meaning": "心灵", "root": "log", "root_meaning": "研究", "suffix": "-y", "suffix_meaning": "名词后缀"},
    "economy": {"prefix": "eco-", "prefix_meaning": "家", "root": "nom", "root_meaning": "管理", "suffix": "-y", "suffix_meaning": "名词后缀"},
    "history": {"prefix": "histo-", "prefix_meaning": "见证", "root": "r", "root_meaning": "连接", "suffix": "-y", "suffix_meaning": "名词后缀"},
    "geography": {"prefix": "geo-", "prefix_meaning": "地", "root": "graph", "root_meaning": "写", "suffix": "-y", "suffix_meaning": "名词后缀"},
    "biology": {"prefix": "bio-", "prefix_meaning": "生命", "root": "log", "root_meaning": "研究", "suffix": "-y", "suffix_meaning": "名词后缀"},
    "philosophy": {"prefix": "philo-", "prefix_meaning": "爱", "root": "soph", "root_meaning": "智慧", "suffix": "-y", "suffix_meaning": "名词后缀"},
    "medicine": {"prefix": "medi-", "prefix_meaning": "中间/治疗", "root": "c", "root_meaning": "名词后缀", "suffix": "-ine", "suffix_meaning": "名词后缀"},
    "engineer": {"prefix": "en-", "prefix_meaning": "在…中", "root": "gine", "root_meaning": "产生", "suffix": "-er", "suffix_meaning": "名词后缀（人）"},
    "company": {"prefix": "com-", "prefix_meaning": "一起", "root": "pan", "root_meaning": "面包", "suffix": "-y", "suffix_meaning": "名词后缀"},
    "service": {"prefix": "ser-", "prefix_meaning": "服务", "root": "vice", "root_meaning": "替代", "suffix": "", "suffix_meaning": ""},
    "market": {"prefix": "mar-", "prefix_meaning": "海/商", "root": "ket", "root_meaning": "集市", "suffix": "", "suffix_meaning": ""},
    "report": {"prefix": "re-", "prefix_meaning": "回", "root": "port", "root_meaning": "带", "suffix": "", "suffix_meaning": ""},
    "answer": {"prefix": "an-", "prefix_meaning": "向/对", "root": "swer", "root_meaning": "发誓", "suffix": "", "suffix_meaning": ""},
    "design": {"prefix": "de-", "prefix_meaning": "向下", "root": "sign", "root_meaning": "记号", "suffix": "", "suffix_meaning": ""},
    "develop": {"prefix": "de-", "prefix_meaning": "向下", "root": "velop", "root_meaning": "包", "suffix": "", "suffix_meaning": ""},
    "discuss": {"prefix": "dis-", "prefix_meaning": "分开", "root": "cuss", "root_meaning": "摇", "suffix": "", "suffix_meaning": ""},
    "decide": {"prefix": "de-", "prefix_meaning": "向下", "root": "cide", "root_meaning": "切", "suffix": "", "suffix_meaning": ""},
    "support": {"prefix": "sup-", "prefix_meaning": "下", "root": "port", "root_meaning": "带", "suffix": "", "suffix_meaning": ""},
    "describe": {"prefix": "de-", "prefix_meaning": "向下", "root": "scrib", "root_meaning": "写", "suffix": "-e", "suffix_meaning": "动词后缀"},
    "apply": {"prefix": "ap-", "prefix_meaning": "向/到", "root": "ply", "root_meaning": "折", "suffix": "", "suffix_meaning": ""},
    "compare": {"prefix": "com-", "prefix_meaning": "一起", "root": "par", "root_meaning": "平等", "suffix": "-e", "suffix_meaning": "动词后缀"},
    "produce": {"prefix": "pro-", "prefix_meaning": "向前", "root": "duc", "root_meaning": "引导", "suffix": "-e", "suffix_meaning": "动词后缀"},
    "achieve": {"prefix": "a-", "prefix_meaning": "到/向", "root": "chiev", "root_meaning": "首领/头", "suffix": "-e", "suffix_meaning": "动词后缀"},
    "perform": {"prefix": "per-", "prefix_meaning": "完全/通过", "root": "form", "root_meaning": "形状", "suffix": "", "suffix_meaning": ""},
    "establish": {"prefix": "e-", "prefix_meaning": "出", "root": "stabl", "root_meaning": "稳定", "suffix": "-ish", "suffix_meaning": "动词后缀"},
    "reduce": {"prefix": "re-", "prefix_meaning": "回", "root": "duc", "root_meaning": "引导", "suffix": "-e", "suffix_meaning": "动词后缀"},
    "interpret": {"prefix": "inter-", "prefix_meaning": "在…之间", "root": "pret", "root_meaning": "价格", "suffix": "", "suffix_meaning": ""},
    "involve": {"prefix": "in-", "prefix_meaning": "在内", "root": "volv", "root_meaning": "转", "suffix": "-e", "suffix_meaning": "动词后缀"},
    "increase": {"prefix": "in-", "prefix_meaning": "在内", "root": "creas", "root_meaning": "增长", "suffix": "-e", "suffix_meaning": "动词后缀"},
    "predict": {"prefix": "pre-", "prefix_meaning": "在前", "root": "dict", "root_meaning": "说", "suffix": "", "suffix_meaning": ""},
    "imagine": {"prefix": "imag-", "prefix_meaning": "图像", "root": "ine", "root_meaning": "名词后缀", "suffix": "", "suffix_meaning": ""},
    "depend": {"prefix": "de-", "prefix_meaning": "向下", "root": "pend", "root_meaning": "挂", "suffix": "", "suffix_meaning": ""},
    "recognize": {"prefix": "re-", "prefix_meaning": "回/再", "root": "cogn", "root_meaning": "知道", "suffix": "-ize", "suffix_meaning": "动词后缀"},
    "require": {"prefix": "re-", "prefix_meaning": "回/再", "root": "quir", "root_meaning": "寻找", "suffix": "-e", "suffix_meaning": "动词后缀"},
    "suggest": {"prefix": "sug-", "prefix_meaning": "上", "root": "gest", "root_meaning": "带", "suffix": "", "suffix_meaning": ""},
    "realize": {"prefix": "real-", "prefix_meaning": "真的", "root": "ize", "root_meaning": "使", "suffix": "", "suffix_meaning": ""},
    "approach": {"prefix": "ap-", "prefix_meaning": "向", "root": "proach", "root_meaning": "近", "suffix": "", "suffix_meaning": ""},
    "consume": {"prefix": "con-", "prefix_meaning": "完全", "root": "sum", "root_meaning": "拿", "suffix": "-e", "suffix_meaning": "动词后缀"},
    "inspire": {"prefix": "in-", "prefix_meaning": "在内", "root": "spir", "root_meaning": "呼吸", "suffix": "-e", "suffix_meaning": "动词后缀"},
    "investigate": {"prefix": "in-", "prefix_meaning": "在内", "root": "vestig", "root_meaning": "足迹", "suffix": "-ate", "suffix_meaning": "动词后缀"},
    "analyze": {"prefix": "ana-", "prefix_meaning": "向上/分开", "root": "lyz", "root_meaning": "松开", "suffix": "-e", "suffix_meaning": "动词后缀"},

    # === 核心 GRE 词（更精拆解）===
    "ephemeral": {
        "prefix": "epi-", "prefix_meaning": "在…之上/短暂",
        "root": "hemer", "root_meaning": "一天（希腊语）",
        "suffix": "-al", "suffix_meaning": "形容词后缀"
    },
    "ubiquitous": {
        "prefix": "ub-", "prefix_meaning": "各处（拉丁语 ubique）",
        "root": "quit", "root_meaning": "各处",
        "suffix": "-ous", "suffix_meaning": "形容词后缀"
    },
    "meticulous": {
        "prefix": "", "prefix_meaning": "",
        "root": "metic", "root_meaning": "害怕/胆小（拉丁语 metus）",
        "suffix": "-ulous", "suffix_meaning": "形容词后缀（充满）"
    },
    "pragmatic": {
        "prefix": "prag-", "prefix_meaning": "行动",
        "root": "mat", "root_meaning": "事/忙（希腊语 pragma）",
        "suffix": "-ic", "suffix_meaning": "形容词后缀"
    },
    "abandon": {
        "prefix": "a-", "prefix_meaning": "在…状态",
        "root": "band", "root_meaning": "命令/权威",
        "suffix": "-on", "suffix_meaning": "名词/动词后缀"
    },
    "abolish": {
        "prefix": "ab-", "prefix_meaning": "离开",
        "root": "ol", "root_meaning": "生长",
        "suffix": "-ish", "suffix_meaning": "动词后缀"
    },
    "abundant": {
        "prefix": "ab-", "prefix_meaning": "从",
        "root": "und", "root_meaning": "波浪",
        "suffix": "-ant", "suffix_meaning": "形容词后缀"
    },
    "accelerate": {
        "prefix": "ac-", "prefix_meaning": "向/到",
        "root": "celer", "root_meaning": "快（拉丁语 celer）",
        "suffix": "-ate", "suffix_meaning": "动词后缀"
    },
    "accumulate": {
        "prefix": "ac-", "prefix_meaning": "向/到",
        "root": "cumul", "root_meaning": "堆",
        "suffix": "-ate", "suffix_meaning": "动词后缀"
    },
    "acknowledge": {
        "prefix": "ac-", "prefix_meaning": "向/到",
        "root": "know", "root_meaning": "知道",
        "suffix": "-ledge", "suffix_meaning": "名词后缀"
    },
    "acquire": {
        "prefix": "ac-", "prefix_meaning": "向/到",
        "root": "quir", "root_meaning": "寻找",
        "suffix": "-e", "suffix_meaning": "动词后缀"
    },
    "adapt": {
        "prefix": "ad-", "prefix_meaning": "向/到",
        "root": "apt", "root_meaning": "适合",
        "suffix": "", "suffix_meaning": ""
    },
    "adequate": {
        "prefix": "ad-", "prefix_meaning": "向/到",
        "root": "equ", "root_meaning": "相等",
        "suffix": "-ate", "suffix_meaning": "形容词后缀"
    },
    "advocate": {
        "prefix": "ad-", "prefix_meaning": "向/到",
        "root": "voc", "root_meaning": "叫（拉丁语 vox）",
        "suffix": "-ate", "suffix_meaning": "动词后缀"
    },
    "aesthetic": {
        "prefix": "aes-", "prefix_meaning": "感觉",
        "root": "thet", "root_meaning": "感觉（希腊语 aisthesis）",
        "suffix": "-ic", "suffix_meaning": "形容词后缀"
    },
    "aggressive": {
        "prefix": "ag-", "prefix_meaning": "向/到",
        "root": "gress", "root_meaning": "走",
        "suffix": "-ive", "suffix_meaning": "形容词后缀"
    },
    "allocate": {
        "prefix": "al-", "prefix_meaning": "向/到",
        "root": "loc", "root_meaning": "地方",
        "suffix": "-ate", "suffix_meaning": "动词后缀"
    },
    "alternative": {
        "prefix": "alter-", "prefix_meaning": "其他的",
        "root": "nat", "root_meaning": "出生",
        "suffix": "-ive", "suffix_meaning": "形容词后缀"
    },
    "ambiguous": {
        "prefix": "ambi-", "prefix_meaning": "两边",
        "root": "ag", "root_meaning": "做/驱动",
        "suffix": "-uous", "suffix_meaning": "形容词后缀"
    },
    "analyze": {
        "prefix": "ana-", "prefix_meaning": "向上/分开",
        "root": "lyz", "root_meaning": "松开",
        "suffix": "-e", "suffix_meaning": "动词后缀"
    },
    "anticipate": {
        "prefix": "anti-", "prefix_meaning": "在前",
        "root": "cip", "root_meaning": "拿",
        "suffix": "-ate", "suffix_meaning": "动词后缀"
    },
    "apparent": {
        "prefix": "ap-", "prefix_meaning": "向/到",
        "root": "par", "root_meaning": "出现",
        "suffix": "-ent", "suffix_meaning": "形容词后缀"
    },
    "appreciate": {
        "prefix": "ap-", "prefix_meaning": "向/到",
        "root": "preci", "root_meaning": "价值",
        "suffix": "-ate", "suffix_meaning": "动词后缀"
    },
    "appropriate": {
        "prefix": "ap-", "prefix_meaning": "向/到",
        "root": "propri", "root_meaning": "自己的",
        "suffix": "-ate", "suffix_meaning": "形容词后缀"
    },
    "arbitrary": {
        "prefix": "ar-", "prefix_meaning": "在…状态",
        "root": "bitr", "root_meaning": "判断",
        "suffix": "-ary", "suffix_meaning": "形容词后缀"
    },
    "artificial": {
        "prefix": "arti-", "prefix_meaning": "技巧/技能",
        "root": "fic", "root_meaning": "做",
        "suffix": "-ial", "suffix_meaning": "形容词后缀"
    },
    "assess": {
        "prefix": "as-", "prefix_meaning": "向/到",
        "root": "sess", "root_meaning": "坐",
        "suffix": "", "suffix_meaning": ""
    },
    "associate": {
        "prefix": "as-", "prefix_meaning": "向/到",
        "root": "soci", "root_meaning": "同伴",
        "suffix": "-ate", "suffix_meaning": "动词后缀"
    },
    "attain": {
        "prefix": "at-", "prefix_meaning": "向/到",
        "root": "tain", "root_meaning": "拿",
        "suffix": "", "suffix_meaning": ""
    },
    "attribute": {
        "prefix": "at-", "prefix_meaning": "向/到",
        "root": "trib", "root_meaning": "给",
        "suffix": "-ute", "suffix_meaning": "名词/动词后缀"
    },
    "cognitive": {
        "prefix": "co-", "prefix_meaning": "一起",
        "root": "gnit", "root_meaning": "知道",
        "suffix": "-ive", "suffix_meaning": "形容词后缀"
    },
    "compelling": {
        "prefix": "com-", "prefix_meaning": "一起/完全",
        "root": "pel", "root_meaning": "推/驱",
        "suffix": "-ling", "suffix_meaning": "形容词后缀"
    },
    "comprehensive": {
        "prefix": "com-", "prefix_meaning": "一起/完全",
        "root": "prehens", "root_meaning": "抓",
        "suffix": "-ive", "suffix_meaning": "形容词后缀"
    },
    "compromise": {
        "prefix": "com-", "prefix_meaning": "一起",
        "root": "promis", "root_meaning": "承诺",
        "suffix": "-e", "suffix_meaning": "名词/动词后缀"
    },
    "compulsory": {
        "prefix": "com-", "prefix_meaning": "一起",
        "root": "puls", "root_meaning": "推/驱",
        "suffix": "-ory", "suffix_meaning": "形容词后缀"
    },
    "conceive": {
        "prefix": "con-", "prefix_meaning": "一起",
        "root": "ceiv", "root_meaning": "拿",
        "suffix": "-e", "suffix_meaning": "动词后缀"
    },
    "concept": {
        "prefix": "con-", "prefix_meaning": "一起",
        "root": "cept", "root_meaning": "拿",
        "suffix": "", "suffix_meaning": ""
    },
    "concrete": {
        "prefix": "con-", "prefix_meaning": "一起",
        "root": "cret", "root_meaning": "生长",
        "suffix": "-e", "suffix_meaning": "形容词后缀"
    },
    "confine": {
        "prefix": "con-", "prefix_meaning": "一起",
        "root": "fin", "root_meaning": "边界",
        "suffix": "-e", "suffix_meaning": "动词后缀"
    },
    "conform": {
        "prefix": "con-", "prefix_meaning": "一起",
        "root": "form", "root_meaning": "形状",
        "suffix": "", "suffix_meaning": ""
    },
    "confront": {
        "prefix": "con-", "prefix_meaning": "一起/对面",
        "root": "front", "root_meaning": "前额",
        "suffix": "", "suffix_meaning": ""
    },
    "consensus": {
        "prefix": "con-", "prefix_meaning": "一起",
        "root": "sens", "root_meaning": "感觉",
        "suffix": "-us", "suffix_meaning": "名词后缀"
    },
    "consequence": {
        "prefix": "con-", "prefix_meaning": "一起",
        "root": "sequ", "root_meaning": "跟随",
        "suffix": "-ence", "suffix_meaning": "名词后缀"
    },
    "conservative": {
        "prefix": "con-", "prefix_meaning": "一起",
        "root": "serv", "root_meaning": "保存",
        "suffix": "-ative", "suffix_meaning": "形容词后缀"
    },
    "consistent": {
        "prefix": "con-", "prefix_meaning": "一起",
        "root": "sist", "root_meaning": "站立",
        "suffix": "-ent", "suffix_meaning": "形容词后缀"
    },
    "contemporary": {
        "prefix": "con-", "prefix_meaning": "一起",
        "root": "tempor", "root_meaning": "时间",
        "suffix": "-ary", "suffix_meaning": "形容词后缀"
    },
    "contradict": {
        "prefix": "contra-", "prefix_meaning": "反对",
        "root": "dict", "root_meaning": "说",
        "suffix": "", "suffix_meaning": ""
    },
    "controversial": {
        "prefix": "contro-", "prefix_meaning": "反对",
        "root": "vers", "root_meaning": "转",
        "suffix": "-ial", "suffix_meaning": "形容词后缀"
    },
    "conventional": {
        "prefix": "con-", "prefix_meaning": "一起",
        "root": "vent", "root_meaning": "来",
        "suffix": "-ion-al", "suffix_meaning": "形容词后缀"
    },
    "convey": {
        "prefix": "con-", "prefix_meaning": "一起",
        "root": "vey", "root_meaning": "路（拉丁语 via）",
        "suffix": "", "suffix_meaning": ""
    },
    "convince": {
        "prefix": "con-", "prefix_meaning": "完全",
        "root": "vinc", "root_meaning": "征服",
        "suffix": "-e", "suffix_meaning": "动词后缀"
    },
    "corrode": {
        "prefix": "cor-", "prefix_meaning": "完全",
        "root": "rod", "root_meaning": "咬",
        "suffix": "-e", "suffix_meaning": "动词后缀"
    },
    "crucial": {
        "prefix": "cruc-", "prefix_meaning": "十字（crux 十字/关键）",
        "root": "i", "root_meaning": "连接",
        "suffix": "-al", "suffix_meaning": "形容词后缀"
    },
    "cultivate": {
        "prefix": "cult-", "prefix_meaning": "耕种（拉丁语 colere）",
        "root": "iv", "root_meaning": "连接",
        "suffix": "-ate", "suffix_meaning": "动词后缀"
    },
    "decline": {
        "prefix": "de-", "prefix_meaning": "向下",
        "root": "clin", "root_meaning": "倾斜",
        "suffix": "-e", "suffix_meaning": "动词后缀"
    },
    "deduce": {
        "prefix": "de-", "prefix_meaning": "向下",
        "root": "duc", "root_meaning": "引导",
        "suffix": "-e", "suffix_meaning": "动词后缀"
    },
    "deficiency": {
        "prefix": "de-", "prefix_meaning": "向下/缺乏",
        "root": "fic", "root_meaning": "做",
        "suffix": "-iency", "suffix_meaning": "名词后缀"
    },
    "demonstrate": {
        "prefix": "de-", "prefix_meaning": "完全",
        "root": "monstr", "root_meaning": "显示",
        "suffix": "-ate", "suffix_meaning": "动词后缀"
    },
    "derive": {
        "prefix": "de-", "prefix_meaning": "向下",
        "root": "riv", "root_meaning": "河",
        "suffix": "-e", "suffix_meaning": "动词后缀"
    },
    "deteriorate": {
        "prefix": "de-", "prefix_meaning": "向下",
        "root": "terior", "root_meaning": "更坏",
        "suffix": "-ate", "suffix_meaning": "动词后缀"
    },
    "deviate": {
        "prefix": "de-", "prefix_meaning": "离开",
        "root": "vi", "root_meaning": "路（拉丁语 via）",
        "suffix": "-ate", "suffix_meaning": "动词后缀"
    },
    "diminish": {
        "prefix": "di-", "prefix_meaning": "完全",
        "root": "min", "root_meaning": "小",
        "suffix": "-ish", "suffix_meaning": "动词后缀"
    },
    "discriminate": {
        "prefix": "dis-", "prefix_meaning": "分开",
        "root": "crimin", "root_meaning": "区分",
        "suffix": "-ate", "suffix_meaning": "动词后缀"
    },
    "diverse": {
        "prefix": "di-", "prefix_meaning": "分开",
        "root": "vers", "root_meaning": "转",
        "suffix": "-e", "suffix_meaning": "形容词后缀"
    },
    "dominant": {
        "prefix": "dom-", "prefix_meaning": "主人（拉丁语 dominus）",
        "root": "in", "root_meaning": "在…里",
        "suffix": "-ant", "suffix_meaning": "形容词后缀"
    },
    "dramatic": {
        "prefix": "dra-", "prefix_meaning": "行动（希腊语 drama）",
        "root": "mat", "root_meaning": "事",
        "suffix": "-ic", "suffix_meaning": "形容词后缀"
    },
    "dynamic": {
        "prefix": "dyn-", "prefix_meaning": "力量（希腊语 dynamis）",
        "root": "am", "root_meaning": "名词后缀",
        "suffix": "-ic", "suffix_meaning": "形容词后缀"
    },
    "elaborate": {
        "prefix": "e-", "prefix_meaning": "出",
        "root": "labor", "root_meaning": "劳动",
        "suffix": "-ate", "suffix_meaning": "形容词后缀"
    },
    "eliminate": {
        "prefix": "e-", "prefix_meaning": "出",
        "root": "limin", "root_meaning": "门槛",
        "suffix": "-ate", "suffix_meaning": "动词后缀"
    },
    "emerge": {
        "prefix": "e-", "prefix_meaning": "出",
        "root": "merg", "root_meaning": "沉",
        "suffix": "-e", "suffix_meaning": "动词后缀"
    },
    "empirical": {
        "prefix": "em-", "prefix_meaning": "在内",
        "root": "piric", "root_meaning": "经验（拉丁语 empiricus）",
        "suffix": "-al", "suffix_meaning": "形容词后缀"
    },
    "enhance": {
        "prefix": "en-", "prefix_meaning": "使/在内",
        "root": "hanc", "root_meaning": "高",
        "suffix": "-e", "suffix_meaning": "动词后缀"
    },
    "enormous": {
        "prefix": "e-", "prefix_meaning": "出",
        "root": "norm", "root_meaning": "规则",
        "suffix": "-ous", "suffix_meaning": "形容词后缀"
    },
    "ensure": {
        "prefix": "en-", "prefix_meaning": "使",
        "root": "sur", "root_meaning": "确定",
        "suffix": "-e", "suffix_meaning": "动词后缀"
    },
    "equivalent": {
        "prefix": "equi-", "prefix_meaning": "相等",
        "root": "val", "root_meaning": "价值",
        "suffix": "-ent", "suffix_meaning": "形容词后缀"
    },
    "evolve": {
        "prefix": "e-", "prefix_meaning": "出",
        "root": "volv", "root_meaning": "转",
        "suffix": "-e", "suffix_meaning": "动词后缀"
    },
    "exceed": {
        "prefix": "ex-", "prefix_meaning": "出/超过",
        "root": "ceed", "root_meaning": "走",
        "suffix": "", "suffix_meaning": ""
    },
    "explicit": {
        "prefix": "ex-", "prefix_meaning": "出",
        "root": "plic", "root_meaning": "折叠",
        "suffix": "-it", "suffix_meaning": "形容词后缀"
    },
    "exploit": {
        "prefix": "ex-", "prefix_meaning": "出",
        "root": "ploit", "root_meaning": "折叠",
        "suffix": "", "suffix_meaning": ""
    },
    "facilitate": {
        "prefix": "fac-", "prefix_meaning": "容易",
        "root": "lit", "root_meaning": "做",
        "suffix": "-ate", "suffix_meaning": "动词后缀"
    },
    "fluctuate": {
        "prefix": "flu-", "prefix_meaning": "流动",
        "root": "ctu", "root_meaning": "波",
        "suffix": "-ate", "suffix_meaning": "动词后缀"
    },
    "fundamental": {
        "prefix": "fund-", "prefix_meaning": "基础（拉丁语 fundus）",
        "root": "ament", "root_meaning": "名词后缀",
        "suffix": "-al", "suffix_meaning": "形容词后缀"
    },
    "genuine": {
        "prefix": "gen-", "prefix_meaning": "出生/天生的",
        "root": "uine", "root_meaning": "名词后缀",
        "suffix": "", "suffix_meaning": ""
    },
    "hypothesis": {
        "prefix": "hypo-", "prefix_meaning": "在…下",
        "root": "thesis", "root_meaning": "放置",
        "suffix": "", "suffix_meaning": ""
    },
    "implement": {
        "prefix": "im-", "prefix_meaning": "在内",
        "root": "ple", "root_meaning": "填满",
        "suffix": "-ment", "suffix_meaning": "名词后缀"
    },
    "implicit": {
        "prefix": "im-", "prefix_meaning": "在内",
        "root": "plic", "root_meaning": "折叠",
        "suffix": "-it", "suffix_meaning": "形容词后缀"
    },
    "incentive": {
        "prefix": "in-", "prefix_meaning": "在内",
        "root": "cent", "root_meaning": "唱歌/激励",
        "suffix": "-ive", "suffix_meaning": "名词/形容词后缀"
    },
    "inevitable": {
        "prefix": "in-", "prefix_meaning": "不",
        "root": "vit", "root_meaning": "避免",
        "suffix": "-able", "suffix_meaning": "形容词后缀"
    },
    "infrastructure": {
        "prefix": "infra-", "prefix_meaning": "在下",
        "root": "struct", "root_meaning": "建造",
        "suffix": "-ure", "suffix_meaning": "名词后缀"
    },
    "inherent": {
        "prefix": "in-", "prefix_meaning": "在内",
        "root": "her", "root_meaning": "粘附",
        "suffix": "-ent", "suffix_meaning": "形容词后缀"
    },
    "innovation": {
        "prefix": "in-", "prefix_meaning": "在内",
        "root": "nov", "root_meaning": "新",
        "suffix": "-ation", "suffix_meaning": "名词后缀"
    },
    "integrate": {
        "prefix": "in-", "prefix_meaning": "完整",
        "root": "tegr", "root_meaning": "接触（拉丁语 tangere）",
        "suffix": "-ate", "suffix_meaning": "动词后缀"
    },
    "interpret": {
        "prefix": "inter-", "prefix_meaning": "在…之间",
        "root": "pret", "root_meaning": "价格/价值",
        "suffix": "", "suffix_meaning": ""
    },
    "intervene": {
        "prefix": "inter-", "prefix_meaning": "在…之间",
        "root": "ven", "root_meaning": "来",
        "suffix": "-e", "suffix_meaning": "动词后缀"
    },
    "intrinsic": {
        "prefix": "in-", "prefix_meaning": "在内",
        "root": "trin", "root_meaning": "三/内部",
        "suffix": "-sic", "suffix_meaning": "形容词后缀"
    },
    "justify": {
        "prefix": "just-", "prefix_meaning": "公正（拉丁语 justus）",
        "root": "ify", "root_meaning": "做",
        "suffix": "", "suffix_meaning": ""
    },
    "legitimate": {
        "prefix": "leg-", "prefix_meaning": "法律",
        "root": "itim", "root_meaning": "最/极端",
        "suffix": "-ate", "suffix_meaning": "形容词后缀"
    },
    "manipulate": {
        "prefix": "man-", "prefix_meaning": "手",
        "root": "ipul", "root_meaning": "填满",
        "suffix": "-ate", "suffix_meaning": "动词后缀"
    },
    "margin": {
        "prefix": "mar-", "prefix_meaning": "边",
        "root": "gin", "root_meaning": "名词后缀",
        "suffix": "", "suffix_meaning": ""
    },
    "maximize": {
        "prefix": "max-", "prefix_meaning": "最大",
        "root": "im", "root_meaning": "最",
        "suffix": "-ize", "suffix_meaning": "动词后缀"
    },
    "mechanism": {
        "prefix": "mech-", "prefix_meaning": "机器",
        "root": "an", "root_meaning": "名词后缀",
        "suffix": "-ism", "suffix_meaning": "名词后缀"
    },
    "mediate": {
        "prefix": "medi-", "prefix_meaning": "中间",
        "root": "at", "root_meaning": "名词后缀",
        "suffix": "-e", "suffix_meaning": "动词后缀"
    },
    "modify": {
        "prefix": "mod-", "prefix_meaning": "方式",
        "root": "ify", "root_meaning": "做",
        "suffix": "", "suffix_meaning": ""
    },
    "monitor": {
        "prefix": "mon-", "prefix_meaning": "警告（拉丁语 monere）",
        "root": "it", "root_meaning": "名词后缀",
        "suffix": "-or", "suffix_meaning": "名词后缀（人）"
    },
    "neglect": {
        "prefix": "neg-", "prefix_meaning": "不",
        "root": "lect", "root_meaning": "选择",
        "suffix": "", "suffix_meaning": ""
    },
    "objective": {
        "prefix": "ob-", "prefix_meaning": "向/对",
        "root": "ject", "root_meaning": "扔",
        "suffix": "-ive", "suffix_meaning": "形容词后缀"
    },
    "obstacle": {
        "prefix": "ob-", "prefix_meaning": "向/对",
        "root": "stac", "root_meaning": "站立",
        "suffix": "-le", "suffix_meaning": "名词后缀"
    },
    "offset": {
        "prefix": "of-", "prefix_meaning": "离开",
        "root": "set", "root_meaning": "放置",
        "suffix": "", "suffix_meaning": ""
    },
    "ongoing": {
        "prefix": "on-", "prefix_meaning": "在…上",
        "root": "go", "root_meaning": "走",
        "suffix": "-ing", "suffix_meaning": "现在分词后缀"
    },
    "optimal": {
        "prefix": "op-", "prefix_meaning": "最佳（拉丁语 optimus）",
        "root": "tim", "root_meaning": "最",
        "suffix": "-al", "suffix_meaning": "形容词后缀"
    },
    "orient": {
        "prefix": "or-", "prefix_meaning": "升起（拉丁语 oriri）",
        "root": "ent", "root_meaning": "名词后缀",
        "suffix": "", "suffix_meaning": ""
    },
    "paradigm": {
        "prefix": "para-", "prefix_meaning": "并排/示例",
        "root": "digm", "root_meaning": "显示",
        "suffix": "", "suffix_meaning": ""
    },
    "parameter": {
        "prefix": "para-", "prefix_meaning": "在旁边",
        "root": "meter", "root_meaning": "测量",
        "suffix": "", "suffix_meaning": ""
    },
    "persist": {
        "prefix": "per-", "prefix_meaning": "完全",
        "root": "sist", "root_meaning": "站立",
        "suffix": "", "suffix_meaning": ""
    },
    "phenomenon": {
        "prefix": "pheno-", "prefix_meaning": "显示",
        "root": "men", "root_meaning": "名词后缀",
        "suffix": "-on", "suffix_meaning": "名词后缀"
    },
    "potential": {
        "prefix": "pot-", "prefix_meaning": "能（拉丁语 potis）",
        "root": "enti", "root_meaning": "名词后缀",
        "suffix": "-al", "suffix_meaning": "形容词后缀"
    },
    "precede": {
        "prefix": "pre-", "prefix_meaning": "在前",
        "root": "ced", "root_meaning": "走",
        "suffix": "-e", "suffix_meaning": "动词后缀"
    },
    "precise": {
        "prefix": "pre-", "prefix_meaning": "在前",
        "root": "cis", "root_meaning": "切",
        "suffix": "-e", "suffix_meaning": "形容词后缀"
    },
    "predominant": {
        "prefix": "pre-", "prefix_meaning": "在前",
        "root": "domin", "root_meaning": "主人",
        "suffix": "-ant", "suffix_meaning": "形容词后缀"
    },
    "presume": {
        "prefix": "pre-", "prefix_meaning": "在前",
        "root": "sum", "root_meaning": "拿",
        "suffix": "-e", "suffix_meaning": "动词后缀"
    },
    "prevail": {
        "prefix": "pre-", "prefix_meaning": "超过",
        "root": "vail", "root_meaning": "强壮",
        "suffix": "", "suffix_meaning": ""
    },
    "principal": {
        "prefix": "prin-", "prefix_meaning": "第一（拉丁语 princeps）",
        "root": "cip", "root_meaning": "拿",
        "suffix": "-al", "suffix_meaning": "形容词后缀"
    },
    "principle": {
        "prefix": "prin-", "prefix_meaning": "第一",
        "root": "cipl", "root_meaning": "拿",
        "suffix": "-e", "suffix_meaning": "名词后缀"
    },
    "priority": {
        "prefix": "pri-", "prefix_meaning": "在前（拉丁语 prior）",
        "root": "or", "root_meaning": "更",
        "suffix": "-ity", "suffix_meaning": "名词后缀"
    },
    "profound": {
        "prefix": "pro-", "prefix_meaning": "向前/深",
        "root": "fund", "root_meaning": "底",
        "suffix": "", "suffix_meaning": ""
    },
    "prohibit": {
        "prefix": "pro-", "prefix_meaning": "向前",
        "root": "hibit", "root_meaning": "拿",
        "suffix": "", "suffix_meaning": ""
    },
    "prominent": {
        "prefix": "pro-", "prefix_meaning": "向前",
        "root": "min", "root_meaning": "伸出",
        "suffix": "-ent", "suffix_meaning": "形容词后缀"
    },
    "promote": {
        "prefix": "pro-", "prefix_meaning": "向前",
        "root": "mot", "root_meaning": "移动",
        "suffix": "-e", "suffix_meaning": "动词后缀"
    },
    "prospect": {
        "prefix": "pro-", "prefix_meaning": "向前",
        "root": "spect", "root_meaning": "看",
        "suffix": "", "suffix_meaning": ""
    },
    "radical": {
        "prefix": "rad-", "prefix_meaning": "根（拉丁语 radix）",
        "root": "ic", "root_meaning": "名词后缀",
        "suffix": "-al", "suffix_meaning": "形容词后缀"
    },
    "rational": {
        "prefix": "rat-", "prefix_meaning": "理由（拉丁语 ratio）",
        "root": "ion", "root_meaning": "名词后缀",
        "suffix": "-al", "suffix_meaning": "形容词后缀"
    },
    "regulate": {
        "prefix": "reg-", "prefix_meaning": "规则（拉丁语 regula）",
        "root": "ul", "root_meaning": "小",
        "suffix": "-ate", "suffix_meaning": "动词后缀"
    },
    "reinforce": {
        "prefix": "re-", "prefix_meaning": "再",
        "root": "inforce", "root_meaning": "力",
        "suffix": "-e", "suffix_meaning": "动词后缀"
    },
    "relevant": {
        "prefix": "re-", "prefix_meaning": "回",
        "root": "lev", "root_meaning": "轻",
        "suffix": "-ant", "suffix_meaning": "形容词后缀"
    },
    "reluctant": {
        "prefix": "re-", "prefix_meaning": "反对",
        "root": "luct", "root_meaning": "斗争",
        "suffix": "-ant", "suffix_meaning": "形容词后缀"
    },
    "resolve": {
        "prefix": "re-", "prefix_meaning": "回/再",
        "root": "solv", "root_meaning": "松开",
        "suffix": "-e", "suffix_meaning": "动词后缀"
    },
    "restore": {
        "prefix": "re-", "prefix_meaning": "回",
        "root": "stor", "root_meaning": "站立",
        "suffix": "-e", "suffix_meaning": "动词后缀"
    },
    "restrict": {
        "prefix": "re-", "prefix_meaning": "回",
        "root": "strict", "root_meaning": "拉紧",
        "suffix": "", "suffix_meaning": ""
    },
    "retain": {
        "prefix": "re-", "prefix_meaning": "回",
        "root": "tain", "root_meaning": "拿",
        "suffix": "", "suffix_meaning": ""
    },
    "reveal": {
        "prefix": "re-", "prefix_meaning": "回/去除",
        "root": "veal", "root_meaning": "面纱",
        "suffix": "", "suffix_meaning": ""
    },
    "reverse": {
        "prefix": "re-", "prefix_meaning": "回",
        "root": "vers", "root_meaning": "转",
        "suffix": "-e", "suffix_meaning": "动词/形容词后缀"
    },
    "rigid": {
        "prefix": "rig-", "prefix_meaning": "僵硬（拉丁语 rigere）",
        "root": "id", "root_meaning": "形容词后缀",
        "suffix": "", "suffix_meaning": ""
    },
    "scenario": {
        "prefix": "scen-", "prefix_meaning": "场景",
        "root": "ari", "root_meaning": "名词后缀",
        "suffix": "-o", "suffix_meaning": "名词后缀"
    },
    "scheme": {
        "prefix": "schem-", "prefix_meaning": "形状（希腊语 schema）",
        "root": "e", "root_meaning": "名词后缀",
        "suffix": "", "suffix_meaning": ""
    },
    "scope": {
        "prefix": "sco-", "prefix_meaning": "看",
        "root": "p", "root_meaning": "名词后缀",
        "suffix": "-e", "suffix_meaning": "名词后缀"
    },
    "sector": {
        "prefix": "sect-", "prefix_meaning": "切",
        "root": "or", "root_meaning": "名词后缀（人/物）",
        "suffix": "", "suffix_meaning": ""
    },
    "significant": {
        "prefix": "sign-", "prefix_meaning": "记号（拉丁语 signum）",
        "root": "ific", "root_meaning": "做",
        "suffix": "-ant", "suffix_meaning": "形容词后缀"
    },
    "simulate": {
        "prefix": "simul-", "prefix_meaning": "一起/像（similis）",
        "root": "at", "root_meaning": "名词后缀",
        "suffix": "-e", "suffix_meaning": "动词后缀"
    },
    "sole": {
        "prefix": "sol-", "prefix_meaning": "单独",
        "root": "e", "root_meaning": "形容词后缀",
        "suffix": "", "suffix_meaning": ""
    },
    "specify": {
        "prefix": "spec-", "prefix_meaning": "看",
        "root": "ify", "root_meaning": "做",
        "suffix": "", "suffix_meaning": ""
    },
    "sphere": {
        "prefix": "spher-", "prefix_meaning": "球（希腊语 sphaira）",
        "root": "e", "root_meaning": "名词后缀",
        "suffix": "", "suffix_meaning": ""
    },
    "spontaneous": {
        "prefix": "spon-", "prefix_meaning": "承诺（拉丁语 spondere）",
        "root": "tane", "root_meaning": "自愿",
        "suffix": "-ous", "suffix_meaning": "形容词后缀"
    },
    "stable": {
        "prefix": "sta-", "prefix_meaning": "站立",
        "root": "b", "root_meaning": "稳定",
        "suffix": "-le", "suffix_meaning": "形容词后缀"
    },
    "stimulate": {
        "prefix": "stimul-", "prefix_meaning": "刺（拉丁语 stimulus）",
        "root": "at", "root_meaning": "动词后缀",
        "suffix": "-e", "suffix_meaning": "动词后缀"
    },
    "strategy": {
        "prefix": "strat-", "prefix_meaning": "军队（希腊语 strategos）",
        "root": "eg", "root_meaning": "名词后缀",
        "suffix": "-y", "suffix_meaning": "名词后缀"
    },
    "subsequent": {
        "prefix": "sub-", "prefix_meaning": "在下",
        "root": "sequ", "root_meaning": "跟随",
        "suffix": "-ent", "suffix_meaning": "形容词后缀"
    },
    "substitute": {
        "prefix": "sub-", "prefix_meaning": "在下",
        "root": "stit", "root_meaning": "站立",
        "suffix": "-ute", "suffix_meaning": "动词/名词后缀"
    },
    "sufficient": {
        "prefix": "suf-", "prefix_meaning": "在下面",
        "root": "fic", "root_meaning": "做",
        "suffix": "-ient", "suffix_meaning": "形容词后缀"
    },
    "superior": {
        "prefix": "super-", "prefix_meaning": "在上面",
        "root": "ior", "root_meaning": "比较级后缀",
        "suffix": "", "suffix_meaning": ""
    },
    "sustain": {
        "prefix": "sus-", "prefix_meaning": "在下",
        "root": "tain", "root_meaning": "拿",
        "suffix": "", "suffix_meaning": ""
    },
    "temporary": {
        "prefix": "tempor-", "prefix_meaning": "时间（拉丁语 tempus）",
        "root": "ari", "root_meaning": "名词后缀",
        "suffix": "-y", "suffix_meaning": "形容词后缀"
    },
    "transform": {
        "prefix": "trans-", "prefix_meaning": "横过/改变",
        "root": "form", "root_meaning": "形状",
        "suffix": "", "suffix_meaning": ""
    },
    "trigger": {
        "prefix": "trig-", "prefix_meaning": "拉（拉丁语 trahere）",
        "root": "g", "root_meaning": "名词后缀",
        "suffix": "-er", "suffix_meaning": "名词后缀"
    },
    "ultimate": {
        "prefix": "ul-", "prefix_meaning": "超过（拉丁语 ultra）",
        "root": "tim", "root_meaning": "最",
        "suffix": "-ate", "suffix_meaning": "形容词后缀"
    },
    "undergo": {
        "prefix": "under-", "prefix_meaning": "在下",
        "root": "go", "root_meaning": "走",
        "suffix": "", "suffix_meaning": ""
    },
    "undermine": {
        "prefix": "under-", "prefix_meaning": "在下",
        "root": "min", "root_meaning": "矿",
        "suffix": "-e", "suffix_meaning": "动词后缀"
    },
    "unique": {
        "prefix": "uni-", "prefix_meaning": "一",
        "root": "que", "root_meaning": "形容词后缀（法语借形）",
        "suffix": "", "suffix_meaning": ""
    },
    "utilize": {
        "prefix": "uti-", "prefix_meaning": "用（拉丁语 uti）",
        "root": "l", "root_meaning": "小",
        "suffix": "-ize", "suffix_meaning": "动词后缀"
    },
    "valid": {
        "prefix": "val-", "prefix_meaning": "强壮（拉丁语 valere）",
        "root": "id", "root_meaning": "形容词后缀",
        "suffix": "", "suffix_meaning": ""
    },
    "vary": {
        "prefix": "vari-", "prefix_meaning": "变化（拉丁语 varius）",
        "root": "fy", "root_meaning": "做",
        "suffix": "", "suffix_meaning": ""
    },
    "viable": {
        "prefix": "vi-", "prefix_meaning": "生命（拉丁语 vita）",
        "root": "able", "root_meaning": "能",
        "suffix": "", "suffix_meaning": ""
    },
    "virtual": {
        "prefix": "virt-", "prefix_meaning": "德/能力（拉丁语 virtus）",
        "root": "u", "root_meaning": "连接",
        "suffix": "-al", "suffix_meaning": "形容词后缀"
    },
    "visible": {
        "prefix": "vis-", "prefix_meaning": "看",
        "root": "ible", "root_meaning": "能",
        "suffix": "", "suffix_meaning": ""
    },
    "widespread": {
        "prefix": "wide-", "prefix_meaning": "宽",
        "root": "spread", "root_meaning": "展开",
        "suffix": "", "suffix_meaning": ""
    },
}


def get_root(headword: str) -> Affix | None:
    """获取单词的词根词缀拆解（不区分大小写）"""
    entry = ROOT_DATA.get(headword.lower().strip())
    if entry and entry.get('root'):
        return entry
    return None


def analyze_word(headword: str) -> Affix | None:
    """统一的词根词缀分析入口。

    1. 优先用手工校订过的词表（质量最高）
    2. 查不到时用词根词缀引擎自动拆解（覆盖面广）
    """
    key = headword.lower().strip()
    try:
        from app.core.affix import STOPWORDS, decompose
    except Exception:
        STOPWORDS, decompose = set(), None

    # 虚词没有词根词缀可言，直接不给
    if key in STOPWORDS or len(key) < 4:
        return None

    curated = get_root(key)
    if curated:
        return curated

    if decompose is None:
        return None
    try:
        parts = decompose(key)
    except Exception:
        return None
    if not parts:
        return None
    if not (parts.get('prefix') or parts.get('root') or parts.get('suffix')):
        return None
    return parts
