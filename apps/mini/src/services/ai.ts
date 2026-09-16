/**
 * AI 网关 API 调用
 *
 * 微信小程序中需要在小程序后台配置 request 合法域名：
 *   mp.weixin.qq.com → 开发管理 → 开发设置 → 服务器域名
 * 开发期可以勾选"不校验合法域名"
 */
export interface AIExplanation {
  headword: string
  ipa: string
  etymology: string
  memory_tip: string
  difficulty: 'easy' | 'medium' | 'hard'
  examples: Array<{ sentence: string; translation: string }>
}

const API_BASE = 'https://your-ai-gateway-domain.com' // 替换成实际域名

export async function explainWord(
  headword: string,
  context?: string,
): Promise<AIExplanation> {
  const resp = await fetch(`${API_BASE}/api/ai/explain`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ headword, context }),
  })
  if (!resp.ok) {
    throw new Error(`AI 解释失败 ${resp.status}`)
  }
  return await resp.json()
}