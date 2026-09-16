/**
 * AI 出题 API 客户端（小程序端）
 */
const API_BASE = 'https://your-ai-gateway-domain.com' // 替换为实际域名

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

export async function generateQuiz(
  headword: string,
  difficulty: string = 'medium',
  context?: string,
): Promise<Quiz> {
  const resp = await fetch(`${API_BASE}/api/ai/quiz/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ headword, difficulty, context }),
  })
  if (!resp.ok) {
    throw new Error(`AI 出题失败 ${resp.status}`)
  }
  return resp.json()
}