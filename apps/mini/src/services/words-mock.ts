/**
 * 词库 / 词书数据
 *
 * 支持两种模式：
 * 1. MOCK 模式（默认）：内置 8 词，适合 MVP / 演示
 * 2. BUNDLE 模式：使用 ECDICT 真实词库（5000 词）
 *    启用方法：
 *      a) 运行 `python -m tools.seed-data.ecdict_to_bundle` 生成 words-bundle.ts
 *      b) 把下方 `USE_BUNDLE` 改为 true
 *    注意：BUNDLE 模式会增加小程序包体积约 1-2MB，建议用分包加载
 */
import type { Word } from '@vocab-agent/types'

export const USE_BUNDLE = false  // ← 改为 true 启用真实词库

import { MOCK_WORDS } from './words-mock'
// import { WORDS_BUNDLE } from './words-bundle'  // BUNDLE 模式启用后取消注释

export const MOCK_WORDS: Word[] = USE_BUNDLE
  ? // @ts-ignore - 运行时存在
    (await import('./words-bundle')).WORDS_BUNDLE
  : (await import('./words-mock')).MOCK_WORDS

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

export async function fetchWords(): Promise<Word[]> {
  return Promise.resolve(MOCK_WORDS)
}

export async function fetchWordbooks() {
  return Promise.resolve(MOCK_WORDBOOKS)
}