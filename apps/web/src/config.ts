/**
 * 应用配置
 *
 * AI 网关访问策略：
 * 1. 优先用 Vite proxy（同源，无 CORS）
 * 2. 如果失败，自动 fallback 到直连 AI 网关
 *
 * 环境变量：
 *   VITE_AI_GATEWAY - 强制指定 AI 网关地址（手机访问用）
 */
const ENV_AI_GATEWAY = import.meta.env.VITE_AI_GATEWAY ?? ''

export const config = {
  /**
   * 是否启用 proxy 模式
   * - 默认 true：先走 Vite proxy
   * - false：直连 AI 网关
   */
  useProxy: true,

  // AI 网关地址（用于 fallback 和直连）
  aiGateway: ENV_AI_GATEWAY,

  get apiBase(): string {
    return this.useProxy ? '/api' : `${this.aiGateway}/api`
  },

  get explainUrl(): string {
    return `${this.apiBase}/ai/explain`
  },

  get searchUrl(): string {
    return `${this.apiBase}/words`
  },

  get analyzeUrl(): string {
    return `${this.apiBase}/analyze-mistake`
  },

  get dialogueUrl(): string {
    return `${this.apiBase}/dialogue`
  },
}

/**
 * 读取本地账号 id（用于后端做 AI 额度计数与会员判定）
 * 直接读 localStorage，避免与 stores 形成循环依赖
 */
export function getUserId(): string {
  try {
    const raw = localStorage.getItem('va-user')
    if (raw) {
      const u = JSON.parse(raw)
      if (u?.id) return String(u.id)
    }
  } catch {
    /* ignore */
  }
  return ''
}

function withAuthHeaders(options: RequestInit): RequestInit {
  const uid = getUserId()
  if (!uid) return options
  const headers = new Headers(options.headers || {})
  if (!headers.has('X-User-Id')) headers.set('X-User-Id', uid)
  return { ...options, headers }
}

/** 额度用尽时广播事件，由 quotaStore 弹出升级引导 */
function notifyQuotaExceeded(resp: Response): void {
  if (resp.status !== 429) return
  resp
    .clone()
    .json()
    .then((d: any) => {
      const detail = d?.detail
      if (detail?.code === 'QUOTA_EXCEEDED') {
        window.dispatchEvent(new CustomEvent('va:quota-exceeded', { detail }))
      }
    })
    .catch(() => {})
}

/**
 * 带 fallback 的 fetch
 *
 * 1. 先用 proxy 路径
 * 2. 失败则用直连路径
 * 3. 都失败则抛错
 *
 * 注意：4xx（如 429 额度用尽）属于「服务端已正常应答」，必须原样返回，
 * 不能再 fallback 重试 —— 否则会重复扣额度。
 */
export async function fetchWithFallback(
  proxyPath: string,
  directPath: string,
  options: RequestInit = {},
): Promise<Response> {
  const opts = withAuthHeaders(options)

  // 1. 试 proxy
  try {
    const resp = await fetch(proxyPath, opts)
    notifyQuotaExceeded(resp)
    if (resp.ok || (resp.status >= 400 && resp.status < 500)) return resp
    console.warn(`[API] Proxy ${proxyPath} failed: ${resp.status}`)
  } catch (e: any) {
    console.warn(`[API] Proxy ${proxyPath} network error: ${e?.message}`)
  }

  // 2. Fallback 直连
  if (config.aiGateway) {
    try {
      const resp = await fetch(directPath, opts)
      notifyQuotaExceeded(resp)
      if (resp.ok || (resp.status >= 400 && resp.status < 500)) {
        console.log(`[API] Fallback ${directPath} OK`)
        return resp
      }
      console.warn(`[API] Direct ${directPath} failed: ${resp.status}`)
      return resp
    } catch (e: any) {
      console.error(`[API] Direct ${directPath} network error: ${e?.message}`)
      throw new Error(`Both proxy and direct API failed: ${e?.message}`)
    }
  }

  throw new Error('No AI gateway available (set VITE_AI_GATEWAY)')
}