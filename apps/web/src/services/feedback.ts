/**
 * 题目报错
 *
 * 用户发现题目答案错了 / 解析有问题时提交，作者在后台修正。
 * 只上报题目本身的信息，不采集设备指纹或 IP。
 */
import { config, fetchWithFallback, getUserId } from '@/config'

export interface ReportPayload {
  kind: 'grammar' | 'reading' | 'listening' | 'quiz'
  question: string
  options?: string[]
  /** 我们标定的正确答案 */
  correct?: string
  /** 用户认为的正确答案 */
  chosen?: string
  /** 知识点 / 文章标题 */
  topic?: string
  note?: string
}

export interface ReportItem {
  id: number
  kind: string
  kindLabel: string
  topic: string
  question: string
  options: string[]
  correct: string
  chosen: string
  note: string
  times: number
  status: string
  created_at: string
  handled_at: string
}

function pair(p: string): [string, string] {
  return [p, config.aiGateway ? `${config.aiGateway}${p}` : p]
}

/** 提交一条报错 */
export async function reportQuestion(payload: ReportPayload): Promise<boolean> {
  try {
    const [a, b] = pair('/api/feedback/report')
    const resp = await fetchWithFallback(a, b, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': getUserId() || '',
      },
      body: JSON.stringify({
        kind: payload.kind,
        question: payload.question,
        options: payload.options || [],
        correct: payload.correct || '',
        chosen: payload.chosen || '',
        topic: payload.topic || '',
        note: payload.note || '',
      }),
    })
    return resp.ok
  } catch (e) {
    console.warn('[feedback] 提交失败', e)
    return false
  }
}

/** 后台：拉取报错列表（需要作者密钥，config 会自动带上） */
export async function fetchReports(
  status: 'open' | 'fixed' | 'ignored' | 'all' = 'open',
): Promise<{ items: ReportItem[]; total: number; stats?: Record<string, number> }> {
  const [a, b] = pair(`/api/feedback/reports?status=${status}&limit=200`)
  const resp = await fetchWithFallback(a, b, { method: 'GET' })
  if (resp.status === 403) throw new Error('FORBIDDEN')
  if (!resp.ok) throw new Error(String(resp.status))
  return await resp.json()
}

/** 后台：把报错标记为已修 / 忽略 */
export async function setReportStatus(
  id: number,
  status: 'open' | 'fixed' | 'ignored',
): Promise<boolean> {
  const [a, b] = pair(`/api/feedback/reports/${id}/status?status=${status}`)
  const resp = await fetchWithFallback(a, b, { method: 'POST' })
  return resp.ok
}
