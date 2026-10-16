/**
 * 写作素材库
 *
 * 真题和 AI 批改解决「写什么」和「写得对不对」，
 * 但中国学生最缺的是「怎么起笔、怎么连接、怎么用高级表达」。
 * 这里按功能归类，考试时可以直接套。
 */

export interface SentenceGroup {
  title: string
  emoji: string
  desc: string
  items: { en: string; zh: string; note?: string }[]
}

/* ============ 1. 模板句型（按段落功能） ============ */

export const SENTENCE_GROUPS: SentenceGroup[] = [
  {
    title: '开头段',
    emoji: '🚪',
    desc: '把话题引入，给出立场',
    items: [
      { en: 'It is widely acknowledged that ...', zh: '人们普遍认为……', note: '万能开头' },
      { en: 'In recent years, ... has sparked heated debate.', zh: '近年来，……引发了激烈讨论' },
      { en: 'Whether ... is a matter of considerable controversy.', zh: '……是否……是一个颇具争议的问题' },
      { en: 'While some argue that ..., I believe ...', zh: '虽然有人认为……，但我认为……', note: '亮明立场' },
      { en: 'The issue of ... has drawn increasing public attention.', zh: '……问题日益受到公众关注' },
      { en: 'There is a growing awareness that ...', zh: '人们越来越意识到……' },
    ],
  },
  {
    title: '论点句',
    emoji: '💡',
    desc: '一段的核心观点，必须具体',
    items: [
      { en: 'The primary reason for this is that ...', zh: '主要原因是……' },
      { en: 'A compelling argument in favour of ... is that ...', zh: '支持……的一个有力论据是……' },
      { en: 'This can be attributed to the fact that ...', zh: '这可以归因于……' },
      { en: 'Chief among these is ...', zh: '其中最主要的是……' },
      { en: 'What matters most is not ... but ...', zh: '最重要的不是……而是……', note: '对比强调' },
    ],
  },
  {
    title: '举例论证',
    emoji: '📌',
    desc: '把抽象观点落地',
    items: [
      { en: 'A case in point is ...', zh: '一个典型的例子是……' },
      { en: 'This is well illustrated by ...', zh: '……很好地说明了这一点' },
      { en: 'Take ... as an example.', zh: '以……为例' },
      { en: 'Consider the case of ..., which ...', zh: '考虑……的情况，它……' },
      { en: 'Statistics indicate that ...', zh: '统计数据表明……', note: '慎用，除非真有数据' },
    ],
  },
  {
    title: '让步与反驳',
    emoji: '⚖️',
    desc: '承认对方观点再反驳，得分点',
    items: [
      { en: 'Admittedly, ..., but this does not mean that ...', zh: '诚然……，但这并不意味着……' },
      { en: 'While it is true that ..., it is also worth noting that ...', zh: '虽然……属实，但同样值得注意的是……' },
      { en: 'Critics may argue that ..., yet ...', zh: '批评者可能认为……，然而……' },
      { en: 'This argument, however, overlooks the fact that ...', zh: '然而这一论点忽略了……' },
      { en: 'Granted that ..., the benefits still outweigh ...', zh: '即使……，好处仍大于……' },
    ],
  },
  {
    title: '结论段',
    emoji: '🏁',
    desc: '总结+升华，不要引入新观点',
    items: [
      { en: 'In conclusion, ...', zh: '总之……' },
      { en: 'To sum up, it is clear that ...', zh: '总而言之，很明显……' },
      { en: 'Taking all these factors into account, ...', zh: '综合考虑这些因素……' },
      { en: 'It is therefore reasonable to conclude that ...', zh: '因此可以合理得出结论……' },
      { en: 'Only by ... can we ...', zh: '只有通过……我们才能……', note: '倒装，加分' },
      { en: 'It is high time that we took action to ...', zh: '是时候采取行动……了' },
    ],
  },
]

/* ============ 2. 连接词（按逻辑关系） ============ */

export const LINKERS: { type: string; emoji: string; basic: string[]; better: string[] }[] = [
  {
    type: '递进 / 补充',
    emoji: '➕',
    basic: ['and', 'also', 'besides'],
    better: ['moreover', 'furthermore', 'in addition', 'what is more', 'not only ... but also'],
  },
  {
    type: '转折 / 对比',
    emoji: '↩️',
    basic: ['but', 'however'],
    better: ['nevertheless', 'nonetheless', 'conversely', 'on the contrary', 'whereas', 'by contrast'],
  },
  {
    type: '因果',
    emoji: '➡️',
    basic: ['so', 'because'],
    better: ['consequently', 'as a result', 'therefore', 'thus', 'owing to', 'give rise to'],
  },
  {
    type: '举例',
    emoji: '📎',
    basic: ['for example'],
    better: ['for instance', 'to illustrate', 'a case in point', 'namely', 'such as'],
  },
  {
    type: '让步',
    emoji: '🤝',
    basic: ['although'],
    better: ['even though', 'admittedly', 'it is true that', 'granted that', 'despite the fact that'],
  },
  {
    type: '总结',
    emoji: '🎯',
    basic: ['in a word'],
    better: ['in conclusion', 'to sum up', 'overall', 'all things considered', 'in short'],
  },
  {
    type: '顺序',
    emoji: '🔢',
    basic: ['first', 'second'],
    better: ['to begin with', 'subsequently', 'ultimately', 'prior to this'],
  },
]

/* ============ 3. 高分替换词 ============ */

export const UPGRADES: { basic: string; better: string[] }[] = [
  { basic: 'important', better: ['crucial', 'vital', 'essential', 'indispensable', 'paramount'] },
  { basic: 'very good', better: ['excellent', 'outstanding', 'remarkable', 'superb'] },
  { basic: 'very bad', better: ['appalling', 'detrimental', 'deplorable', 'disastrous'] },
  { basic: 'a lot of', better: ['a considerable number of', 'numerous', 'a substantial amount of'] },
  { basic: 'many people', better: ['a growing number of people', 'a significant proportion of the population'] },
  { basic: 'think', better: ['maintain', 'contend', 'assert', 'hold the view that'] },
  { basic: 'show', better: ['demonstrate', 'illustrate', 'reveal', 'indicate'] },
  { basic: 'get', better: ['obtain', 'acquire', 'attain', 'secure'] },
  { basic: 'help', better: ['facilitate', 'contribute to', 'be conducive to'] },
  { basic: 'cause', better: ['give rise to', 'result in', 'trigger', 'bring about'] },
  { basic: 'problem', better: ['issue', 'predicament', 'dilemma', 'obstacle'] },
  { basic: 'solve', better: ['address', 'tackle', 'resolve', 'remedy'] },
  { basic: 'big', better: ['substantial', 'considerable', 'significant', 'enormous'] },
  { basic: 'change', better: ['transform', 'alter', 'modify', 'shift'] },
  { basic: 'need', better: ['require', 'necessitate', 'call for'] },
  { basic: 'because of', better: ['owing to', 'on account of', 'by virtue of', 'as a consequence of'] },
  { basic: 'in my opinion', better: ['from my perspective', 'to my mind', 'as far as I am concerned'] },
  { basic: 'I think', better: ['I am convinced that', 'I would argue that', 'It seems to me that'] },
]

/* ============ 4. 万能论证角度 ============ */

export const ANGLES: { name: string; emoji: string; desc: string; questions: string[] }[] = [
  {
    name: '个人层面',
    emoji: '👤',
    desc: '对个人的能力、健康、心态的影响',
    questions: ['能提升什么能力？', '对身心健康有何影响？', '长期看让人变得更好还是更差？'],
  },
  {
    name: '社会层面',
    emoji: '🏙️',
    desc: '对社会关系、公平、文化的影响',
    questions: ['会加剧还是缩小差距？', '对人际关系有何影响？', '会不会冲击传统文化？'],
  },
  {
    name: '经济层面',
    emoji: '💰',
    desc: '成本、效率、就业',
    questions: ['成本谁来承担？', '能提高效率吗？', '会创造还是消灭岗位？'],
  },
  {
    name: '科技层面',
    emoji: '🔬',
    desc: '可行性、长期风险',
    questions: ['技术上可行吗？', '有什么长期风险？', '会不会被滥用？'],
  },
  {
    name: '环境层面',
    emoji: '🌱',
    desc: '可持续性、资源消耗',
    questions: ['资源消耗如何？', '可持续吗？', '有无替代方案？'],
  },
  {
    name: '教育层面',
    emoji: '🎓',
    desc: '对学习方式和机会的影响',
    questions: ['对学习效率有何影响？', '是否扩大教育机会？', '会不会削弱某方面能力？'],
  },
]

/* ============ 5. 各部分建议篇幅（雅思 Task 2 / 托福独立写作） ============ */

export const STRUCTURE = {
  ielts: {
    name: '雅思 Task 2（≥250 词，40 分钟）',
    parts: [
      { part: '开头段', words: '35-45', time: '5 分钟', tip: '改写题目 + 明确立场，别照抄题目' },
      { part: '主体段 1', words: '90-100', time: '10 分钟', tip: '一个论点 + 解释 + 例子' },
      { part: '主体段 2', words: '90-100', time: '10 分钟', tip: '第二个论点，角度要和第一段不同' },
      { part: '结论段', words: '35-45', time: '5 分钟', tip: '总结两个论点，不要引入新观点' },
      { part: '检查', words: '—', time: '10 分钟', tip: '查主谓一致、单复数、时态' },
    ],
  },
  toefl: {
    name: '托福独立写作（≥300 词，30 分钟）',
    parts: [
      { part: '开头段', words: '50-60', time: '4 分钟', tip: '背景 + 明确立场' },
      { part: '主体段 1', words: '110-130', time: '8 分钟', tip: '理由 + 细节 + 例证' },
      { part: '主体段 2', words: '110-130', time: '8 分钟', tip: '第二个理由，可用让步加强' },
      { part: '结论段', words: '40-50', time: '3 分钟', tip: '重申立场 + 简要总结' },
      { part: '检查', words: '—', time: '7 分钟', tip: '重点查拼写和动词形式' },
    ],
  },
}

/* ============ 6. 常见扣分点 ============ */

export const PITFALLS: { bad: string; good: string; why: string }[] = [
  { bad: 'In my opinion, I think ...', good: 'In my opinion, ...', why: '重复表达，扣分' },
  { bad: 'Nowadays, with the development of society ...', good: '直接切入具体话题', why: '空话套话，考官看腻了' },
  { bad: 'Every coin has two sides.', good: '替代：The issue is more nuanced than it appears.', why: '模板句用烂了' },
  { bad: 'I very very like it.', good: 'I am extremely fond of it.', why: 'very 不能叠用' },
  { bad: 'People is ...', good: 'People are ...', why: '主谓一致，最常扣的语法分' },
  { bad: 'According to me, ...', good: 'In my view, ...', why: 'according to 不接自己' },
  { bad: 'The reason is because ...', good: 'The reason is that ...', why: 'reason 后接 that' },
  { bad: 'discuss about the topic', good: 'discuss the topic', why: 'discuss 是及物动词' },
]
