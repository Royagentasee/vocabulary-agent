/**
 * 词库 / 词书 API 调用
 *
 * MVP 阶段暂用前端 mock，正式后端就绪后替换。
 */
import type { Word, RootAffix } from '@vocab-agent/types'

// 内置的高频词示例（mock 数据，等 seed 脚本就绪后改为 fetch）
export const MOCK_WORDS: Word[] = [
  {
    id: 'w1',
    headword: 'ephemeral',
    pos: ['adj'],
    ipa: '/ɪˈfem.ər.əl/',
    audioUrl: '',
    senses: [
      { pos: 'adj', definitionEn: 'lasting for a very short time', definitionCn: '短暂的；瞬息的' },
    ],
    etymology: '希腊语 ephemeros（仅活一天）',
    collocations: ['ephemeral pleasure', 'ephemeral fame'],
    examTags: [
      { exam: 'IELTS', level: '7+', frequency: 0.6 },
      { exam: 'GRE', frequency: 0.8 },
    ],
    examples: [
      { sentence: 'Fashions are ephemeral: classics are eternal.', translation: '时尚易逝，经典永存。', source: 'Cambridge IELTS 14' },
    ],
  },
  {
    id: 'w2',
    headword: 'ubiquitous',
    pos: ['adj'],
    ipa: '/juːˈbɪk.wɪ.təs/',
    audioUrl: '',
    senses: [
      { pos: 'adj', definitionEn: 'present, appearing, or found everywhere', definitionCn: '无处不在的' },
    ],
    etymology: '拉丁语 ubique（无处不在）',
    collocations: ['ubiquitous presence', 'ubiquitous smartphones'],
    examTags: [
      { exam: 'IELTS', level: '7+', frequency: 0.7 },
      { exam: 'TOEFL', frequency: 0.5 },
    ],
    examples: [
      { sentence: 'Smartphones have become ubiquitous in modern life.', translation: '智能手机在现代生活中已无处不在。' },
    ],
  },
  {
    id: 'w3',
    headword: 'meticulous',
    pos: ['adj'],
    ipa: '/məˈtɪk.jə.ləs/',
    audioUrl: '',
    senses: [
      { pos: 'adj', definitionEn: 'showing great attention to detail', definitionCn: '一丝不苟的；细致的' },
    ],
    etymology: '拉丁语 metus（恐惧）+ icosus（充满的）',
    collocations: ['meticulous preparation', 'meticulous record'],
    examTags: [
      { exam: 'GRE', frequency: 0.9 },
      { exam: 'TOEFL', frequency: 0.6 },
    ],
    examples: [
      { sentence: 'The report was the result of meticulous research.', translation: '这份报告是细致研究的成果。' },
    ],
  },
  {
    id: 'w4',
    headword: 'pragmatic',
    pos: ['adj'],
    ipa: '/præɡˈmæt.ɪk/',
    audioUrl: '',
    senses: [
      { pos: 'adj', definitionEn: 'dealing with things sensibly and realistically', definitionCn: '务实的；实际的' },
    ],
    etymology: '希腊语 pragmatikos（办事的）',
    collocations: ['pragmatic approach', 'pragmatic solution'],
    examTags: [
      { exam: 'IELTS', level: '6.5+', frequency: 0.5 },
      { exam: 'GRE', frequency: 0.7 },
    ],
    examples: [
      { sentence: 'A pragmatic leader focuses on what works.', translation: '务实的领导者专注于有效的事。' },
    ],
  },
  {
    id: 'w5',
    headword: 'resilient',
    pos: ['adj'],
    ipa: '/rɪˈzɪl.i.ənt/',
    audioUrl: '',
    senses: [
      { pos: 'adj', definitionEn: 'able to recover quickly from difficulties', definitionCn: '有韧性的；能迅速恢复的' },
    ],
    etymology: '拉丁语 resilire（弹回）',
    collocations: ['resilient economy', 'resilient child'],
    examTags: [
      { exam: 'TOEFL', frequency: 0.7 },
      { exam: 'IELTS', level: '7+', frequency: 0.6 },
    ],
    examples: [
      { sentence: 'Children are remarkably resilient.', translation: '孩子们的适应力惊人。' },
    ],
  },
  {
    id: 'w6',
    headword: 'scrutinize',
    pos: ['v'],
    ipa: '/ˈskruː.tə.naɪz/',
    audioUrl: '',
    senses: [
      { pos: 'v', definitionEn: 'to examine very carefully', definitionCn: '详细检查；仔细审查' },
    ],
    etymology: '法语 scrutin（细查）',
    collocations: ['scrutinize the data', 'scrutinize a proposal'],
    examTags: [
      { exam: 'GRE', frequency: 0.8 },
    ],
    examples: [
      { sentence: 'The auditor scrutinized every transaction.', translation: '审计员仔细审查了每一笔交易。' },
    ],
  },
  {
    id: 'w7',
    headword: 'ambivalent',
    pos: ['adj'],
    ipa: '/æmˈbɪv.ə.lənt/',
    audioUrl: '',
    senses: [
      { pos: 'adj', definitionEn: 'having mixed feelings', definitionCn: '矛盾的；有矛盾情绪的' },
    ],
    etymology: 'ambi-（两）+ valent（强烈）',
    collocations: ['feel ambivalent', 'ambivalent attitude'],
    examTags: [
      { exam: 'GRE', frequency: 0.9 },
    ],
    examples: [
      { sentence: 'She was ambivalent about moving abroad.', translation: '她对出国心存矛盾。' },
    ],
  },
  {
    id: 'w8',
    headword: 'concise',
    pos: ['adj'],
    ipa: '/kənˈsaɪs/',
    audioUrl: '',
    senses: [
      { pos: 'adj', definitionEn: 'giving a lot of information clearly and in a few words', definitionCn: '简明的；简洁的' },
    ],
    etymology: '拉丁语 concidere（切短）',
    collocations: ['concise summary', 'concise answer'],
    examTags: [
      { exam: 'IELTS', level: '6+', frequency: 0.8 },
    ],
    examples: [
      { sentence: 'Please keep your answer concise.', translation: '请简洁回答。' },
    ],
  },
]

export const MOCK_WORDBOOKS = [
  {
    id: 'wb-high5000',
    name: '高频 5000 词',
    description: '覆盖雅思 / 托福核心高频词',
    examTag: 'GENERAL',
    wordCount: 5000,
    coverColor: '#3b82f6',
  },
  {
    id: 'wb-gre-core',
    name: 'GRE 核心词汇',
    description: '高频 GRE 词汇精选',
    examTag: 'GRE',
    wordCount: 1500,
    coverColor: '#111111',
  },
  {
    id: 'wb-ielts-7',
    name: '雅思 7+ 词汇',
    description: '冲 7 分必备',
    examTag: 'IELTS',
    wordCount: 2500,
    coverColor: '#10b981',
  },
] as const

export async function fetchWords(excludeIds?: string[], limit: number = 20): Promise<Word[]> {
  // 从后端随机取 limit 个新词（排除已学过的）；失败时 fallback 到 mock
  try {
    const excludeParam = excludeIds?.length
      ? `&exclude=${encodeURIComponent(excludeIds.join(','))}`
      : ''
    const resp = await fetch(`/api/words/random?limit=${limit}${excludeParam}`)
    if (resp.ok) {
      const data = await resp.json()
      const items = data?.items ?? []
      if (items.length > 0) {
        return items.map((w: any) => toWord(w))
      }
    }
  } catch (e) {
    console.warn('[words] 从后端取词失败，fallback 到 mock:', e)
  }
  return MOCK_WORDS
}

/** 单独取词根词缀拆解（老数据/缓存里没有 rootAffix 时兜底） */
export async function fetchRootAffix(headword: string): Promise<RootAffix | null> {
  try {
    const resp = await fetch(`/api/words/root-affix?headword=${encodeURIComponent(headword)}`)
    if (!resp.ok) return null
    const data = await resp.json()
    return data?.rootAffix ?? null
  } catch {
    return null
  }
}

/** 把后端返回的词条映射为前端 Word 类型 */
function toWord(w: any): Word {  return {
    id: String(w.id),
    headword: w.headword,
    pos: w.pos ?? [],
    ipa: w.ipa ?? '',
    audioUrl: w.audioUrl ?? '',
    senses: [
      {
        pos: (w.pos?.[0]) ?? 'n',
        definitionEn: w.translation_en ?? '',
        definitionCn: w.translation ?? w.headword,
      },
    ],
    etymology: w.etymology ?? '',
    collocations: w.collocations ?? [],
    examTags: w.examTags ?? [],
    examples: w.examples ?? [],
    rootAffix: w.rootAffix ?? null,
    translation: w.translation ?? '',
  }
}

export interface MeaningChoice {
  label: string
  text: string
}

export interface MeaningQuiz {
  headword: string
  ipa: string
  pos: string[]
  choices: MeaningChoice[]
  correct_label: string
  definition_en: string
}

/** 获取"选意思"4 选 1 选择题 */
export async function fetchMeaningQuiz(headword: string): Promise<MeaningQuiz | null> {
  try {
    const resp = await fetch(`/api/words/meaning-quiz?headword=${encodeURIComponent(headword)}`)
    if (resp.ok) {
      return await resp.json()
    }
  } catch (e) {
    console.warn('[words] 获取选意思失败:', e)
  }
  return null
}

export async function fetchWordbooks() {
  return Promise.resolve(MOCK_WORDBOOKS)
}
