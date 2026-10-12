/**
 * 付款申报 API（用户端）
 */
import { config, fetchWithFallback, getUserId } from '../config'

export interface Claim {
  id: number
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  handled_at: string
  days: number
  note: string
}

function api(path: string): string {
  return config.aiGateway ? `${config.aiGateway}${path}` : path
}

export async function submitClaim(note: string, amount = 9.9): Promise<Claim | null> {
  const uid = getUserId()
  const path = `/api/payment/claim?user_id=${encodeURIComponent(uid)}`
  const resp = await fetchWithFallback(path, api(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ note, amount }),
  })
  if (!resp.ok) throw new Error(`提交失败 ${resp.status}`)
  const d = await resp.json()
  return d?.claim ?? null
}

export async function fetchMyClaim(): Promise<Claim | null> {
  const uid = getUserId()
  const path = `/api/payment/claim?user_id=${encodeURIComponent(uid)}`
  try {
    const resp = await fetchWithFallback(path, api(path), { method: 'GET' })
    if (!resp.ok) return null
    const d = await resp.json()
    return d?.claim ?? null
  } catch {
    return null
  }
}

/* ============ 作者端 ============ */

function adminHeaders(): Record<string, string> {
  const token = (() => {
    try {
      return localStorage.getItem('va-admin-token') || ''
    } catch {
      return ''
    }
  })()
  return { 'Content-Type': 'application/json', 'X-Admin-Token': token }
}

export interface ClaimRow extends Claim {
  user_id: string
  sync_code: string
  amount: number
}

export interface PaymentStats {
  claims: { pending: number; approved: number; rejected: number; revenue: number }
  codes: { total: number; used: number; unused: number }
  price: number
}

export async function fetchClaims(status = 'pending'): Promise<{ items: ClaimRow[]; stats: PaymentStats }> {
  const path = `/api/payment/claims?status=${encodeURIComponent(status)}`
  const resp = await fetchWithFallback(path, api(path), { method: 'GET', headers: adminHeaders() })
  if (!resp.ok) throw new Error(resp.status === 403 ? '需要作者权限' : `加载失败 ${resp.status}`)
  return resp.json()
}

export async function approveClaim(id: number, days = 30): Promise<any> {
  const path = `/api/payment/claims/${id}/approve`
  const resp = await fetchWithFallback(path, api(path), {
    method: 'POST',
    headers: adminHeaders(),
    body: JSON.stringify({ days }),
  })
  if (!resp.ok) {
    const b = await resp.json().catch(() => ({}))
    throw new Error((b as any)?.detail || `开通失败 ${resp.status}`)
  }
  return resp.json()
}

export async function rejectClaim(id: number): Promise<any> {
  const path = `/api/payment/claims/${id}/reject`
  const resp = await fetchWithFallback(path, api(path), { method: 'POST', headers: adminHeaders() })
  if (!resp.ok) throw new Error(`驳回失败 ${resp.status}`)
  return resp.json()
}

export async function createCodes(count: number, days = 30, note = ''): Promise<any> {
  const path = '/api/entitlement/codes'
  const resp = await fetchWithFallback(path, api(path), {
    method: 'POST',
    headers: adminHeaders(),
    body: JSON.stringify({ count, days, note }),
  })
  if (!resp.ok) throw new Error(`生成失败 ${resp.status}`)
  return resp.json()
}

export async function fetchPaymentStats(): Promise<PaymentStats> {
  const path = '/api/payment/stats'
  const resp = await fetchWithFallback(path, api(path), { method: 'GET', headers: adminHeaders() })
  if (!resp.ok) throw new Error(`加载失败 ${resp.status}`)
  return resp.json()
}
