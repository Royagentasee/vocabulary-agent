/**
 * 阅读理解 API
 */
import { config, fetchWithFallback } from '../config'

export interface ReadingChoice {
  label: string
  text: string
}

export interface ReadingQuestion {
  question: string
  choices: ReadingChoice[]
  correct_label: string
  explanation: string
}

export interface ReadingResult {
  summary: string
  questions: ReadingQuestion[]
  is_mock: boolean
}

export async function generateReading(
  passage: string,
  numQuestions: number = 3,
  level: string = 'medium',
): Promise<ReadingResult> {
  const proxyUrl = '/api/ai/reading'
  const directUrl = config.aiGateway
    ? `${config.aiGateway}/api/ai/reading`
    : proxyUrl

  const resp = await fetchWithFallback(proxyUrl, directUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ passage, num_questions: numQuestions, level }),
  })

  if (!resp.ok) {
    const body = await resp.text().catch(() => '')
    throw new Error(`阅读理解生成失败 ${resp.status}: ${body.slice(0, 100)}`)
  }
  return resp.json()
}

/* ============ 官方真题库 ============ */

export interface BankItem {
  id: string
  exam: string
  source: string
  testNo: number | null
  module: number | null
  questionNo: number | null
  passage: string
  question: string
  choices: ReadingChoice[]
  correctLabel: string
  explanation: string
}

export interface BankResult {
  items: BankItem[]
  total: number
  exam: string
  source: string
}

export async function fetchReadingBank(
  params: { limit?: number; offset?: number; shuffle?: boolean } = {},
): Promise<BankResult> {
  const qs = new URLSearchParams()
  qs.set('limit', String(params.limit ?? 10))
  if (params.offset) qs.set('offset', String(params.offset))
  if (params.shuffle) qs.set('shuffle', 'true')

  const path = `/api/reading/bank?${qs.toString()}`
  const directUrl = config.aiGateway ? `${config.aiGateway}${path}` : path

  const resp = await fetchWithFallback(path, directUrl, { method: 'GET' })
  if (!resp.ok) throw new Error(`真题库加载失败 ${resp.status}`)
  return resp.json()
}