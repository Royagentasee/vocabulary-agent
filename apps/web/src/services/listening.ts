/**
 * 听力练习 API
 */
import { config, fetchWithFallback } from '../config'

export interface ListeningChoice {
  label: string
  text: string
}

export interface ListeningQuestion {
  question: string
  choices: ListeningChoice[]
  correct_label: string
  explanation: string
}

export interface ListeningPassage {
  id: string
  exam: string
  type: string
  title: string
  passage: string
  word_count: number
  questions: ListeningQuestion[]
}

export interface ListeningResult {
  items: ListeningPassage[]
  total: number
}

const TYPE_LABEL: Record<string, string> = {
  lecture: '讲座',
  conversation: '对话',
  monologue: '独白',
  discussion: '讨论',
}

export function listeningTypeLabel(type: string): string {
  return TYPE_LABEL[type] ?? type
}

export async function fetchListeningPassages(
  params: { exam?: string; shuffle?: boolean } = {},
): Promise<ListeningPassage[]> {
  const qs = new URLSearchParams()
  if (params.exam) qs.set('exam', params.exam)
  if (params.shuffle) qs.set('shuffle', 'true')

  const path = `/api/listening/passages?${qs.toString()}`
  const directUrl = config.aiGateway ? `${config.aiGateway}${path}` : path
  const resp = await fetchWithFallback(path, directUrl, { method: 'GET' })
  if (!resp.ok) throw new Error(`听力题库加载失败 ${resp.status}`)
  const data = await resp.json()
  return data?.items ?? []
}
