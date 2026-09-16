/**
 * 词库 / 词书数据
 *
 * 支持两种模式：
 * 1. MOCK 模式（默认）：内置 8 词，适合 MVP / 演示
 * 2. BUNDLE 模式：使用 ECDICT 真实词库（5000 词）
 *    启用方法：
 *      a) 下载 ECDICT CSV: https://github.com/skywind3000/ECDICT/releases
 *      b) python -m tools.seed-data.ecdict_to_bundle
 *      c) 把下方 `USE_BUNDLE` 改为 true
 */
import type { Word } from '@vocab-agent/types'

export const USE_BUNDLE = false

// 同步加载 mock（保证类型稳定）
import { MOCK_WORDS as MOCK_WORDS_DATA } from './words-mock'

export const MOCK_WORDS: Word[] = MOCK_WORDS_DATA

// BUNDLE 模式需要单独从 words-bundle.ts 异步加载
export async function loadWordsAsync(): Promise<Word[]> {
  if (USE_BUNDLE) {
    try {
      const mod = await import('./words-bundle')
      // @ts-ignore - dynamic import
      return mod.WORDS_BUNDLE as Word[]
    } catch (e) {
      console.warn('Failed to load words-bundle, falling back to mock', e)
    }
  }
  return MOCK_WORDS_DATA
}

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
    wordCount: 49,
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
]

export async function fetchWords(excludeIds?: string[]): Promise<Word[]> {
  // 优先从后端随机取 20 个新词（排除已学）；失败 fallback 到内置词
  const API_BASE = 'http://192.168.227.29:8000'  // 开发时用电脑 IP
  try {
    const excludeParam = excludeIds?.length
      ? `&exclude=${encodeURIComponent(excludeIds.join(','))}`
      : ''
    const resp = await fetch(`${API_BASE}/api/words/random?limit=20${excludeParam}`)
    if (resp.ok) {
      const data = await resp.json()
      const items = data?.items ?? []
      if (items.length > 0) {
        return items.map((w: any) => ({
          id: String(w.id),
          headword: w.headword,
          pos: w.pos ?? [],
          ipa: w.ipa ?? '',
          audioUrl: '',
          senses: [{
            pos: (w.pos?.[0]) ?? 'n',
            definitionEn: w.translation_en ?? '',
            definitionCn: w.translation ?? w.headword,
          }],
          etymology: '',
          collocations: [],
          examTags: [],
          examples: [],
        }))
      }
    }
  } catch (e) {
    console.warn('[words] 从后端取词失败，fallback 到内置词:', e)
  }
  return loadWordsAsync()
}

export async function fetchWordbooks() {
  return Promise.resolve(MOCK_WORDBOOKS)
}