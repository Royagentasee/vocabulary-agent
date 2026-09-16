/**
 * LLM 统一 SDK
 * 封装 DeepSeek / 智谱 GLM / OpenAI 等多家模型，提供一致的调用接口。
 */
import OpenAI from 'openai'

export type LLMProvider = 'deepseek' | 'zhipu' | 'openai'

export interface LLMConfig {
  provider: LLMProvider
  apiKey: string
  baseURL?: string
  model: string
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatOptions {
  temperature?: number
  maxTokens?: number
  stream?: boolean
}

const DEFAULT_BASE_URL: Record<LLMProvider, string> = {
  deepseek: 'https://api.deepseek.com/v1',
  zhipu: 'https://open.bigmodel.cn/api/paas/v4',
  openai: 'https://api.openai.com/v1',
}

export function createLLMClient(config: LLMConfig) {
  const client = new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL ?? DEFAULT_BASE_URL[config.provider],
  })

  return {
    async chat(messages: ChatMessage[], options: ChatOptions = {}) {
      const resp = await client.chat.completions.create({
        model: config.model,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 1024,
        stream: options.stream ?? false,
      })
      return resp.choices[0]?.message?.content ?? ''
    },

    async *stream(messages: ChatMessage[], options: ChatOptions = {}) {
      const stream = await client.chat.completions.create({
        model: config.model,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 1024,
        stream: true,
      })
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content
        if (delta) yield delta
      }
    },
  }
}
