/**
 * AI 出题 API 客户端
 */
import { config, fetchWithFallback } from '../config'

export interface QuizChoice {
  label: string
  text: string
}

export interface Quiz {
  headword: string
  sentence: string
  choices: QuizChoice[]
  correct_label: string
  explanation: string
  difficulty: string
}

/**
 * 生成针对单词的完形填空题
 */
export async function generateQuiz(
  headword: string,
  difficulty: string = 'medium',
  context?: string,
): Promise<Quiz> {
  const proxyUrl = '/api/ai/quiz/generate'
  const directUrl = config.aiGateway
    ? `${config.aiGateway}/api/ai/quiz/generate`
    : proxyUrl

  const resp = await fetchWithFallback(proxyUrl, directUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ headword, difficulty, context }),
  })

  if (!resp.ok) {
    const body = await resp.text().catch(() => '')
    throw new Error(`AI 出题失败 ${resp.status}: ${body.slice(0, 100)}`)
  }

  return resp.json()
}