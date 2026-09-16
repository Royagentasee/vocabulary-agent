/**
 * Admin API 客户端
 */
const API_BASE = '/api/admin'

let authToken: string | null = null

export function setAuthToken(token: string | null) {
  authToken = token
  if (token) {
    localStorage.setItem('admin-token', token)
  } else {
    localStorage.removeItem('admin-token')
  }
}

export function getAuthToken(): string | null {
  if (authToken) return authToken
  authToken = localStorage.getItem('admin-token')
  return authToken
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken()
  const resp = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  })
  if (!resp.ok) {
    if (resp.status === 401) {
      setAuthToken(null)
      window.location.href ='/login'
    }
    const err = await resp.text()
    throw new Error(`HTTP ${resp.status}: ${err}`)
  }
  return resp.json()
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<{ access_token: string; user: any }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    me: () => request<any>('/auth/me'),
  },
  wordbooks: {
    list: (page = 1, pageSize = 20, status?: string) =>
      request<{ items: any[]; total: number }>(`/wordbooks?page=${page}&pageSize=${pageSize}${status ? `&status=${status}` : ''}`),
    stats: () => request<any[]>('/wordbooks/stats'),
    create: (data: any) =>
      request<any>('/wordbooks', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) =>
      request<any>(`/wordbooks/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    remove: (id: string) =>
      request<{ id: string }>(`/wordbooks/${id}`, { method: 'DELETE' }),
  },
  users: {
    list: (page = 1, pageSize = 20) =>
      request<{ items: any[]; total: number }>(`/users?page=${page}&pageSize=${pageSize}`),
    stats: () => request<{ total: number; todayNew: number }>('/users/stats'),
  },
  analytics: {
    overview: () => request<any>('/analytics/overview'),
    activeUsers: (days = 30) =>
      request<Array<{ date: string; count: number }>>(`/analytics/active-users?days=${days}`),
    // 高级分析
    funnel: (days = 30) =>
      request<{ period: string; stages: Array<{ name: string; count: number; conversion: number }> }>(`/analytics/funnel?days=${days}`),
    cohortRetention: (weeks = 8) =>
      request<Array<{ cohort: string; size: number; retention: Array<{ week: number; rate: number; active_users: number }> }>>(`/analytics/retention/cohort?weeks=${weeks}`),
    retentionCurve: () =>
      request<{ intervals: string[]; retention_rates: number[] }>('/analytics/retention/curve'),
    featureAdoption: () =>
      request<Array<{ feature: string; used: number; eligible_users: number; adoption_rate: number }>>('/analytics/adoption'),
    revenue: (months = 6) =>
      request<{ total_revenue: number; paying_users: number; arpu: number; monthly: Array<{ month: string; revenue: number; paying: number }> }>(`/analytics/revenue?months=${months}`),
  },
  settings: {
    get: () => request<Record<string, string>>('/settings'),
    set: (data: Record<string, string>) =>
      request<Record<string, string>>('/settings', { method: 'PUT', body: JSON.stringify(data) }),
  },
}