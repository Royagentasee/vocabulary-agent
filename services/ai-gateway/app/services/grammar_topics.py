"""语法知识点库（备考雅思/托福/GRE/SAT 的核心语法）

按「词类 → 时态语态 → 句子结构 → 从句 → 非谓语 → 虚拟/特殊句式 → 进阶写作语法」
的顺序排列，同类相邻，由易到难。
"""

TOPICS: list[dict] = [
    # ============ 词类 ============
    {'id': 'articles', 'title': '冠词', 'titleEn': 'Articles',
     'description': 'a/an/the 的用法与零冠词', 'difficulty': 'easy',
     'category': '词类', 'examTags': ['IELTS', 'TOEFL']},
    {'id': 'pronouns', 'title': '代词', 'titleEn': 'Pronouns',
     'description': '人称/物主/反身/指示/不定代词的指代', 'difficulty': 'easy',
     'category': '词类', 'examTags': ['IELTS', 'TOEFL', 'SAT']},
    {'id': 'prepositions', 'title': '介词', 'titleEn': 'Prepositions',
     'description': '常见介词的固定搭配与易混辨析', 'difficulty': 'medium',
     'category': '词类', 'examTags': ['IELTS', 'TOEFL']},
    {'id': 'modal-verbs', 'title': '情态动词', 'titleEn': 'Modal Verbs',
     'description': 'can/may/must/should 等的语义与推测用法', 'difficulty': 'medium',
     'category': '词类', 'examTags': ['IELTS', 'TOEFL']},

    # ============ 时态与语态 ============
    {'id': 'tenses', 'title': '时态', 'titleEn': 'Verb Tenses',
     'description': '一般/进行/完成时态的用法与时间状语搭配', 'difficulty': 'easy',
     'category': '时态与语态', 'examTags': ['IELTS', 'TOEFL', 'SAT']},
    {'id': 'passive-voice', 'title': '被动语态', 'titleEn': 'Passive Voice',
     'description': '各时态的被动结构，主动被动转换', 'difficulty': 'easy',
     'category': '时态与语态', 'examTags': ['IELTS', 'TOEFL']},
    {'id': 'conditionals', 'title': '条件句', 'titleEn': 'Conditionals',
     'description': '零/一/二/三条件句与混合条件句', 'difficulty': 'medium',
     'category': '时态与语态', 'examTags': ['IELTS', 'TOEFL', 'GRE']},

    # ============ 句子结构 ============
    {'id': 'subject-verb-agreement', 'title': '主谓一致', 'titleEn': 'Subject-Verb Agreement',
     'description': '主语与谓语在数上保持一致，尤其是有插入语时', 'difficulty': 'medium',
     'category': '句子结构', 'examTags': ['IELTS', 'TOEFL', 'GRE', 'SAT']},

    # ============ 从句 ============
    {'id': 'relative-clauses', 'title': '定语从句', 'titleEn': 'Relative Clauses',
     'description': '关系代词/关系副词的选用，限定与非限定', 'difficulty': 'medium',
     'category': '从句', 'examTags': ['IELTS', 'TOEFL', 'GRE', 'SAT']},
    {'id': 'noun-clauses', 'title': '名词性从句', 'titleEn': 'Noun Clauses',
     'description': '主语/宾语/表语/同位语从句', 'difficulty': 'medium',
     'category': '从句', 'examTags': ['IELTS', 'TOEFL', 'GRE']},
    {'id': 'adverbial-clauses', 'title': '状语从句', 'titleEn': 'Adverbial Clauses',
     'description': '时间/条件/让步/原因/结果等从句', 'difficulty': 'medium',
     'category': '从句', 'examTags': ['IELTS', 'TOEFL', 'GRE']},
    {'id': 'relative-omission', 'title': '从句的省略与简化', 'titleEn': 'Clause Reduction',
     'description': '定语从句省略、分词替换从句等', 'difficulty': 'hard',
     'category': '从句', 'examTags': ['GRE', 'SAT']},

    # ============ 非谓语动词 ============
    {'id': 'non-finite', 'title': '非谓语动词', 'titleEn': 'Non-finite Verbs',
     'description': '动名词 / 不定式 / 分词的用法与区别', 'difficulty': 'hard',
     'category': '非谓语动词', 'examTags': ['IELTS', 'TOEFL', 'GRE', 'SAT']},
    {'id': 'participles', 'title': '分词作状语', 'titleEn': 'Participial Phrases',
     'description': '现在/过去分词作状语与逻辑主语', 'difficulty': 'hard',
     'category': '非谓语动词', 'examTags': ['GRE', 'SAT']},

    # ============ 虚拟与特殊句式 ============
    {'id': 'subjunctive', 'title': '虚拟语气', 'titleEn': 'Subjunctive Mood',
     'description': 'if 虚拟条件句、wish、建议类动词后的虚拟', 'difficulty': 'hard',
     'category': '虚拟与特殊句式', 'examTags': ['IELTS', 'TOEFL', 'GRE', 'SAT']},
    {'id': 'emphasis', 'title': '强调句', 'titleEn': 'Emphatic Sentences',
     'description': 'It is ... that ... 强调结构', 'difficulty': 'medium',
     'category': '虚拟与特殊句式', 'examTags': ['IELTS', 'TOEFL', 'GRE']},
    {'id': 'inversion', 'title': '倒装句', 'titleEn': 'Inversion',
     'description': '部分倒装与完全倒装（否定词/only 开头等）', 'difficulty': 'hard',
     'category': '虚拟与特殊句式', 'examTags': ['GRE', 'SAT']},

    # ============ 进阶写作语法 ============
    {'id': 'comparison', 'title': '比较结构', 'titleEn': 'Comparison',
     'description': '比较级/最高级、倍数表达、as...as', 'difficulty': 'medium',
     'category': '进阶写作语法', 'examTags': ['IELTS', 'TOEFL', 'GRE']},
    {'id': 'parallelism', 'title': '平行结构', 'titleEn': 'Parallelism',
     'description': '并列成分结构一致（写作高频考点）', 'difficulty': 'medium',
     'category': '进阶写作语法', 'examTags': ['IELTS', 'TOEFL', 'GRE', 'SAT']},
    {'id': 'conjunctions', 'title': '连词与衔接', 'titleEn': 'Conjunctions & Transitions',
     'description': '并列/从属连词与逻辑衔接词', 'difficulty': 'medium',
     'category': '进阶写作语法', 'examTags': ['IELTS', 'TOEFL', 'GRE', 'SAT']},
]
