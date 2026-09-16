/**
 * AI 网关 API 调用（带 fallback）
 */
import type { AIExplanationResponse } from '@vocab-agent/types'
import { config, fetchWithFallback } from '../config'

export async function explainWord(
  headword: string,
  context?: string,
): Promise<AIExplanationResponse> {
  // proxy 路径 + 直连路径
  const proxyUrl = '/api/ai/explain'
  const directUrl = config.aiGateway
    ? `${config.aiGateway}/api/ai/explain`
    : proxyUrl

  console.log(`[AI] explain "${headword}"`)

  const resp = await fetchWithFallback(proxyUrl, directUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ headword, context }),
  })

  if (!resp.ok) {
    const body = await resp.text().catch(() => '')
    console.error(`[AI] HTTP ${resp.status}: ${body.slice(0, 200)}`)
    throw new Error(`AI 解释失败 ${resp.status}: ${body.slice(0, 100)}`)
  }

  const data = await resp.json()
  console.log(`[AI] OK: ${data.headword}`)
  return {
    explanation: data.memory_tip || data.etymology,
    etymology: data.etymology,
    rootAffix: data.root_affix ?? null,
    examples: data.examples?.map((e: { sentence: string }) => e.sentence) ?? [],
    difficulty: data.difficulty,
  }
}