/**
 * Desktop 端 settings 服务（用 Tauri Store 持久化）
 */
import { invoke } from '@tauri-apps/api/tauri'

interface AppSettings {
  theme?: 'light' | 'dark'
  language?: 'zh-CN' | 'en-US'
  dailyGoal?: number
}

export const settings = {
  async get(): Promise<AppSettings> {
    try {
      return await invoke<AppSettings>('get_settings')
    } catch {
      return {}
    }
  },

  async set(s: AppSettings): Promise<void> {
    try {
      await invoke('set_settings', { settings: s })
    } catch (e) {
      console.warn('Set settings failed:', e)
    }
  },
}