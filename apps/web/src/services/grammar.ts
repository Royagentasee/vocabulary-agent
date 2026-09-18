/**
 * 语法学习 API
 */
import { config, fetchWithFallback } from '../config'

export interface GrammarTopic {
  id: string
  title: string
  titleEn: string
  description: string
  difficulty: string
  examTags: string[]
}

export interface GrammarChoice {
  label: string
  text: string
}

export interface GrammarRule {
  rule: string
  example: string
  example_translation: string
}

export interface GrammarExample {
  sentence: string
  translation: string
}

export interface GrammarQuestion {
  question: string
  choices: GrammarChoice[]
  correct_label: string
  explanation: string
}

export interface GrammarResult {
  topic: string
  title_en: string
  explanation: string
  rules: GrammarRule[]
  examples: GrammarExample[]
  questions: GrammarQuestion[]
  is_mock: boolean
}

export async function fetchGrammarTopics(): Promise<GrammarTopic[]> {
  const path = '/api/grammar/topics'
  const directUrl = config.aiGateway ? `${config.aiGateway}${path}` : path
  const resp = await fetchWithFallback(path, directUrl, { method: 'GET' })
  if (!resp.ok) throw new Error(`语法知识点加载失败 ${resp.status}`)
  const data = await resp.json()
  return data?.items ?? []
}

export async function generateGrammar(
  topic: string,
  titleEn: string,
  numQuestions: number = 4,
): Promise<GrammarResult> {
  const path = '/api/grammar/generate'
  const directUrl = config.aiGateway ? `${config.aiGateway}${path}` : path
  const resp = await fetchWithFallback(path, directUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic, title_en: titleEn, num_questions: numQuestions }),
  })
  if (!resp.ok) {
    const body = await resp.text().catch(() => '')
    throw new Error(`语法讲解生成失败 ${resp.status}: ${body.slice(0, 100)}`)
  }
  return resp.json()
}
