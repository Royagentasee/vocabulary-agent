/**
 * 词条搜索 API 客户端
 */
import { config } from '../config'

export interface WordSearchResult {
  id: string
  headword: string
  translation: string
  ipa: string
  pos: string[]
}

export async function searchWords(query: string, limit = 20): Promise<WordSearchResult[]> {
  try {
    const resp = await fetch(
      `${config.searchPath}/search?q=${encodeURIComponent(query)}&limit=${limit}`,
    )
    if (!resp.ok) return []
    const data = await resp.json()
    return (data.items || []).map((w: any) => ({
      id: w.id,
      headword: w.headword,
      translation: w.translation,
      ipa: w.ipa,
      pos: w.pos || [],
    }))
  } catch (e) {
    console.warn('searchWords failed:', e)
    return []
  }
}

export async function getWordDetail(headword: string) {
  try {
    const resp = await fetch(`${config.searchPath}/${encodeURIComponent(headword)}`)
    if (!resp.ok) return null
    return await resp.json()
  } catch {
    return null
  }
}