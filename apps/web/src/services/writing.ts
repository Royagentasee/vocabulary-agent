/**
 * 写作助手 API
 */
import { config, fetchWithFallback } from '../config'

export interface WritingResult {
  topic: string
  title: string
  content: string
  used_words: string[]
  is_mock: boolean
}

export async function generateWriting(
  topic: string,
  words: string[] = [],
  style: string = 'academic',
  length: number = 150,
  instruction: string = '',
  taskLabel: string = '',
): Promise<WritingResult> {
  const proxyUrl = '/api/ai/writing'
  const directUrl = config.aiGateway
    ? `${config.aiGateway}/api/ai/writing`
    : proxyUrl

  const resp = await fetchWithFallback(proxyUrl, directUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      topic,
      words,
      style,
      length,
      instruction,
      task_label: taskLabel,
    }),
  })

  if (!resp.ok) {
    const body = await resp.text().catch(() => '')
    throw new Error(`写作生成失败 ${resp.status}: ${body.slice(0, 100)}`)
  }
  return resp.json()
}

/* ============ 官方写作真题库 ============ */

export interface WritingPrompt {
  id: string
  exam: string
  taskType: string
  taskLabel: string
  prompt: string
  instruction: string
  source: string
  sourceUrl: string
}

export interface WritingPromptResult {
  items: WritingPrompt[]
  total: number
  exam: string
  source: string
}

export async function fetchWritingPrompts(
  params: { limit?: number; taskType?: string; shuffle?: boolean } = {},
): Promise<WritingPromptResult> {
  const qs = new URLSearchParams()
  qs.set('limit', String(params.limit ?? 10))
  if (params.taskType) qs.set('task_type', params.taskType)
  if (params.shuffle) qs.set('shuffle', 'true')

  const path = `/api/writing/prompts?${qs.toString()}`
  const directUrl = config.aiGateway ? `${config.aiGateway}${path}` : path

  const resp = await fetchWithFallback(path, directUrl, { method: 'GET' })
  if (!resp.ok) throw new Error(`写作真题库加载失败 ${resp.status}`)
  return resp.json()
}
