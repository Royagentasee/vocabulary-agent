/**
 * 演示数据生成器
 *
 * 在"我的 → 演示模式"中可一键启用，让首页/统计页有真实学习数据，
 * 方便截图 / 演示。
 */
import Taro from '@tarojs/taro'
import { createFSRS, Rating } from '@vocab-agent/sdk-fsrs'
import type { FSRSCardState, Word } from '@vocab-agent/types'
import { MOCK_WORDS } from './words'

const DEMO_FLAG = 'vocab-agent-demo-mode'

interface DemoState {
  enabled: boolean
  todayLearned: number
  todayReviewed: number
  wrongWords: Word[]
}

export function enableDemoMode(): void {
  const scheduler = createFSRS()

  // 模拟"学过的词"和"复习过的词"
  const wrongWords = MOCK_WORDS.slice(0, 2)
  const queue = MOCK_WORDS.map((word) => {
    const card: FSRSCardState = scheduler.newCard()
    // 模拟已经复习过几次
    let current = card
    for (let i = 0; i < 2; i++) {
      current = scheduler.review(current, Rating.Good).card
    }
    return { word, card: current }
  })

  Taro.setStorageSync('vocab-agent-state', {
    currentWordbookId: 'wb-gre-core',
    queue,
    index: 0,
    todayLearned: 6,
    todayReviewed: 8,
    wrongWords,
  })

  Taro.setStorageSync(DEMO_FLAG, true)
  Taro.showToast({ title: '演示数据已加载', icon: 'success' })
}

export function disableDemoMode(): void {
  Taro.removeStorageSync('vocab-agent-state')
  Taro.removeStorageSync(DEMO_FLAG)
  Taro.showToast({ title: '已退出演示模式', icon: 'success' })
}

export function isDemoMode(): boolean {
  return Taro.getStorageSync(DEMO_FLAG) === true
}