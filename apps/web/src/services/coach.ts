/**
 * AI 学习教练
 */
import { config, fetchWithFallback } from '../config'

export interface CoachMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface CoachAction {
  type: 'set_exam' | 'set_daily_goal' | 'goto'
  examType?: string
  date?: string
  target?: string
  value?: number
  route?: string
  label?: string
}

export interface CoachReply {
  reply: string
  actions: CoachAction[]
}

export async function coachChat(
  messages: CoachMessage[],
  context: Record<string, any>,
): Promise<CoachReply> {
  const path = '/api/coach/chat'
  const resp = await fetchWithFallback(
    path,
    config.aiGateway ? `${config.aiGateway}${path}` : path,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: messages.map((m) => ({ role: m.role, content: m.content.slice(0, 2000) })),
        context,
      }),
    },
  )
  if (!resp.ok) {
    const body = await resp.text().catch(() => '')
    throw new Error(`教练暂时联系不上 (${resp.status}) ${body.slice(0, 80)}`)
  }
  return resp.json()
}

/** 常见问题快捷入口 */
export const QUICK_ASKS = [
  '我雅思想考 7 分，还剩 60 天，该怎么安排？',
  '我词汇量不够，背单词总是忘，怎么办？',
  '听力听不懂，是词汇问题还是方法问题？',
  '帮我看下我的数据，现在最该补什么？',
  '口语不敢开口，有什么快速提升的办法？',
  '每天只有 30 分钟，怎么安排效率最高？',
]
