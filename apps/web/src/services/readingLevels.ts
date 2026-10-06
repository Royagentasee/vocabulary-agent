/**
 * 分级阅读（初中 / 高中 / 大学）
 */
import { config, fetchWithFallback } from '../config'

export type LevelId = 'junior' | 'senior' | 'college' | ''

export interface LevelItem {
  id: string
  level: LevelId
  levelName: string
  exam: string
  title: string
  titleZh: string
  topic: string
  wordCount: number
  excerpt: string
  questionCount: number
}

export interface LevelChoice {
  label: string
  text: string
}

export interface LevelQuestion {
  question: string
  questionType?: string
  choices: LevelChoice[]
  correctLabel: string
  explanation: string
}

export interface LevelDetail extends Omit<LevelItem, 'excerpt' | 'questionCount'> {
  passage: string
  questions: LevelQuestion[]
}

export interface LevelStats {
  total: number
  questionCount: number
  byLevel: { level: LevelId; name: string; count: number; words: number; exam: string }[]
  source: string
}

const BASE = '/api/reading/levels'

async function get<T>(path: string): Promise<T> {
  const direct = config.aiGateway ? `${config.aiGateway}${path}` : path
  const resp = await fetchWithFallback(path, direct, { method: 'GET' })
  if (!resp.ok) throw new Error(`请求失败 ${resp.status}`)
  return resp.json()
}

export async function fetchLevelStats(): Promise<LevelStats> {
  return get<LevelStats>(`${BASE}/stats`)
}

export async function fetchLevelTopics(level: LevelId): Promise<string[]> {
  const d = await get<{ topics: string[] }>(`${BASE}/topics${level ? `?level=${level}` : ''}`)
  return d.topics || []
}

export async function fetchLevelItems(params: {
  level?: LevelId
  topic?: string
  limit?: number
  offset?: number
  shuffle?: boolean
} = {}): Promise<{ items: LevelItem[]; total: number }> {
  const qs = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') qs.set(k, String(v))
  })
  return get<{ items: LevelItem[]; total: number }>(`${BASE}?${qs}`)
}

export async function fetchLevelDetail(id: string): Promise<LevelDetail> {
  return get<LevelDetail>(`${BASE}/${encodeURIComponent(id)}`)
}
