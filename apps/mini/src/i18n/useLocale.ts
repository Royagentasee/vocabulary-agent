/**
 * i18n hook：基于 Taro.Storage 的语言切换
 */
import { useEffect, useState } from 'react'
import Taro from '@tarojs/taro'
import { translations, SUPPORTED_LOCALES } from './locales'
import type { Locale, Translations } from './locales'

const STORAGE_KEY = 'vocab-agent-locale'

let currentLocale: Locale = 'zh-CN'
const listeners = new Set<() => void>()

function loadFromStorage() {
  try {
    const cached = Taro.getStorageSync(STORAGE_KEY) as Locale | ''
    if (cached && SUPPORTED_LOCALES.some((l) => l.code === cached)) {
      currentLocale = cached
    }
  } catch {
    // ignore
  }
}
loadFromStorage()

export function getLocale(): Locale {
  return currentLocale
}

export function setLocale(locale: Locale) {
  currentLocale = locale
  try {
    Taro.setStorageSync(STORAGE_KEY, locale)
  } catch {
    // ignore
  }
  listeners.forEach((l) => l())
}

export function getT(): Translations {
  return translations[currentLocale]
}

export function useT(): Translations {
  const [, setVersion] = useState(0)
  useEffect(() => {
    const unsubscribe = listeners as unknown as Set<() => void>
    const listener = () => setVersion((v) => v + 1)
    unsubscribe.add(listener)
    return () => {
      unsubscribe.delete(listener)
    }
  }, [])
  return getT()
}

export { SUPPORTED_LOCALES }
export type { Locale }