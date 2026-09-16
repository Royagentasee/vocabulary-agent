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
 * 带 fallback 的 fetch
 *
 * 1. 先用 proxy 路径
 * 2. 失败则用直连路径
 * 3. 都失败则抛错
 */
export async function fetchWithFallback(
  proxyPath: string,
  directPath: string,
  options: RequestInit = {},
): Promise<Response> {
  // 1. 试 proxy
  try {
    const resp = await fetch(proxyPath, options)
    if (resp.ok) return resp
    console.warn(`[API] Proxy ${proxyPath} failed: ${resp.status}`)
  } catch (e: any) {
    console.warn(`[API] Proxy ${proxyPath} network error: ${e?.message}`)
  }

  // 2. Fallback 直连
  if (config.aiGateway) {
    try {
      const resp = await fetch(directPath, options)
      if (resp.ok) {
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