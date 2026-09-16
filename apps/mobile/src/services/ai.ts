/**
 * AI 解释 API
 */
export interface AIExplanation {
  headword: string
  ipa: string
  etymology: string
  memory_tip: string
  difficulty: 'easy' | 'medium' | 'hard'
  examples: Array<{ sentence: string; translation: string }>
}

const API_BASE = 'https://your-ai-gateway-domain.com'

export async function explainWord(headword: string): Promise<AIExplanation> {
  const resp = await fetch(`${API_BASE}/api/ai/explain`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ headword }),
  })
  if (!resp.ok) throw new Error(`AI 解释失败 ${resp.status}`)
  return resp.json()
}