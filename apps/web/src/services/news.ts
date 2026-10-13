/**
 * 国外新闻（可听）
 */
import { config, fetchWithFallback } from '../config'

export interface NewsItem {
  id: string
  source: string
  sourceName: string
  flag: string
  level: string
  title: string
  summary: string
  link: string
  pubDate: string
  audio: string
  image: string
}

export interface NewsSource {
  key: string
  name: string
  desc: string
  level: string
  flag: string
}

function api(path: string): string {
  return config.aiGateway ? `${config.aiGateway}${path}` : path
}

export async function fetchNews(source = '', limit = 60): Promise<NewsItem[]> {
  const p = `/api/news?limit=${limit}${source ? `&source=${encodeURIComponent(source)}` : ''}`
  try {
    const resp = await fetchWithFallback(p, api(p), { method: 'GET' })
    if (!resp.ok) return []
    const d = await resp.json()
    return d?.items ?? []
  } catch {
    return []
  }
}

export async function fetchSources(): Promise<NewsSource[]> {
  try {
    const resp = await fetchWithFallback('/api/news/sources', api('/api/news/sources'), { method: 'GET' })
    if (!resp.ok) return []
    const d = await resp.json()
    return d?.items ?? []
  } catch {
    return []
  }
}

/** 相对时间：3 小时前 / 昨天 */
export function timeAgo(pub: string): string {
  if (!pub) return ''
  try {
    const d = new Date(pub)
    if (isNaN(d.getTime())) return ''
    const diff = Date.now() - d.getTime()
    const min = Math.floor(diff / 60000)
    if (min < 1) return '刚刚'
    if (min < 60) return `${min} 分钟前`
    const h = Math.floor(min / 60)
    if (h < 24) return `${h} 小时前`
    const day = Math.floor(h / 24)
    if (day === 1) return '昨天'
    if (day < 30) return `${day} 天前`
    return `${d.getMonth() + 1}-${d.getDate()}`
  } catch {
    return ''
  }
}

export interface NewsTranslation {
  translation: string
  summary: string
  vocabulary: { word: string; meaning: string }[]
}

/** 把新闻摘要译成中文 */
export async function translateNews(text: string): Promise<NewsTranslation | null> {
  try {
    const resp = await fetchWithFallback('/api/news/translate', api('/api/news/translate'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
    if (!resp.ok) throw new Error(String(resp.status))
    return await resp.json()
  } catch (e) {
    console.warn('[news] 翻译失败', e)
    return null
  }
}
