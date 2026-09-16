/**
 * A/B Test SDK（客户端）
 *
 * 特性：
 * - 哈希分桶（同一用户始终落在同一组）
 * - 强制灰度（按比例分配）
 * - 强制白名单 / 黑名单
 * - 本地持久化（同一会话内一致）
 * - 事件埋点上报
 */

export type Variant = 'control' | 'A' | 'B' | 'C' | 'D'

export interface ExperimentConfig {
  key: string
  description?: string
  /** 各变体的权重（默认 50/50） */
  weights?: Partial<Record<Variant, number>>
  /** 强制分配白名单（userKey -> variant） */
  forceList?: Record<string, Variant>
  /** 是否启用（默认 true） */
  enabled?: boolean
  /** 灰度比例（0-100，默认 100） */
  rolloutPercentage?: number
}

export interface AssignmentResult {
  variant: Variant
  source: 'forced' | 'hashed' | 'rollout_excluded' | 'disabled'
  experimentKey: string
}

const STORAGE_KEY = 'vocab-agent-ab-assignments'

class ABTestClient {
  private assignments: Map<string, Variant> = new Map()
  private listeners: Array<(event: ABEvent) => void> = []

  constructor() {
    this.load()
  }

  private load() {
    try {
      const cached = localStorage.getItem(STORAGE_KEY)
      if (cached) {
        const parsed = JSON.parse(cached)
        this.assignments = new Map(Object.entries(parsed))
      }
    } catch {}
  }

  private save() {
    try {
      const obj = Object.fromEntries(this.assignments)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(obj))
    } catch {}
  }

  /**
   * 哈希分桶：基于 userKey + experimentKey 哈希，确保同一用户始终落在同一桶
   */
  assign(experiment: ExperimentConfig, userKey: string): AssignmentResult {
    // 1. 强制列表优先
    if (experiment.forceList?.[userKey]) {
      const variant = experiment.forceList[userKey]!
      this.setAssignment(experiment.key, variant)
      return { variant, source: 'forced', experimentKey: experiment.key }
    }

    // 2. 已有分配，重复返回
    const existing = this.assignments.get(experiment.key)
    if (existing) {
      return { variant: existing, source: 'hashed', experimentKey: experiment.key }
    }

    // 3. 未启用 → control
    if (experiment.enabled === false) {
      return { variant: 'control', source: 'disabled', experimentKey: experiment.key }
    }

    // 4. 灰度检查
    const rollout = experiment.rolloutPercentage ?? 100
    if (!this.inRollout(userKey, experiment.key, rollout)) {
      return { variant: 'control', source: 'rollout_excluded', experimentKey: experiment.key }
    }

    // 5. 按权重哈希分桶
    const variant = this.bucketize(userKey, experiment.key, experiment.weights ?? {})
    this.setAssignment(experiment.key, variant)
    return { variant, source: 'hashed', experimentKey: experiment.key }
  }

  /**
   * 获取已分配的变体（如果未分配则返回 control）
   */
  getVariant(experimentKey: string): Variant {
    return this.assignments.get(experimentKey) ?? 'control'
  }

  /**
   * 强制设置（用于本地调试）
   */
  override(experimentKey: string, variant: Variant) {
    this.setAssignment(experimentKey, variant)
  }

  /**
   * 清除所有分配
   */
  reset() {
    this.assignments.clear()
    this.save()
  }

  /**
   * 记录曝光事件
   */
  trackExposure(experiment: ExperimentConfig, variant: Variant) {
    this.emit({
      type: 'exposure',
      experimentKey: experiment.key,
      variant,
      timestamp: Date.now(),
    })
  }

  /**
   * 记录转化事件
   */
  track(experimentKey: string, eventName: string, properties?: Record<string, any>) {
    this.emit({
      type: 'event',
      experimentKey,
      eventName,
      properties,
      variant: this.getVariant(experimentKey),
      timestamp: Date.now(),
    })
  }

  /**
   * 订阅事件
   */
  onEvent(listener: (event: ABEvent) => void) {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener)
    }
  }

  private setAssignment(key: string, variant: Variant) {
    this.assignments.set(key, variant)
    this.save()
  }

  private hash(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const chr = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + chr
      hash |= 0  // Convert to 32bit integer
    }
    return Math.abs(hash)
  }

  private inRollout(userKey: string, experimentKey: string, percentage: number): boolean {
    if (percentage >= 100) return true
    if (percentage <= 0) return false
    const h = this.hash(`${userKey}:${experimentKey}:rollout`)
    return h % 100 < percentage
  }

  private bucketize(userKey: string, experimentKey: string, weights: Partial<Record<Variant, number>>): Variant {
    // 过滤掉 control（control 由未启用/灰度外触发，不在 bucketize 中）
    const variants: Variant[] = ['A', 'B', 'C', 'D']
    const w: Record<Variant, number> = {
      control: 0,
      A: weights.A ?? 50,
      B: weights.B ?? 50,
      C: weights.C ?? 0,
      D: weights.D ?? 0,
    }
    const total = variants.reduce((sum, v) => sum + w[v], 0)
    if (total === 0) return 'control'

    const h = this.hash(`${userKey}:${experimentKey}:bucket`)
    const bucket = h % total
    let acc = 0
    for (const v of variants) {
      acc += w[v]
      if (bucket < acc) return v
    }
    return 'A'
  }

  private emit(event: ABEvent) {
    this.listeners.forEach((l) => {
      try { l(event) } catch {}
    })
  }
}

export interface ABEvent {
  type: 'exposure' | 'event'
  experimentKey: string
  variant?: Variant
  eventName?: string
  properties?: Record<string, any>
  timestamp: number
}

let _client: ABTestClient | null = null

export function getABClient(): ABTestClient {
  if (!_client) _client = new ABTestClient()
  return _client
}

/**
 * 便捷 hook：获取变体
 */
export function useVariant(experiment: ExperimentConfig, userKey: string): Variant {
  const client = getABClient()
  const result = client.assign(experiment, userKey)
  client.trackExposure(experiment, result.variant)
  return result.variant
}

// ============ 预定义实验 ============

export const EXPERIMENTS = {
  /** 复习页 AI 解释展示方式 */
  AI_EXPLAIN_LAYOUT: {
    key: 'ai_explain_layout',
    description: 'AI 解释展示布局（A=折叠 B=侧边栏 C=内联）',
    weights: { A: 33, B: 33, C: 34 },
  } as ExperimentConfig,

  /** 评分按钮颜色 */
  RATE_BUTTON_COLORS: {
    key: 'rate_button_colors',
    description: '评分按钮配色（A=暖色 B=冷色）',
    weights: { A: 50, B: 50 },
  } as ExperimentConfig,

  /** 首页引导文案 */
  HOME_INTRO_VARIANT: {
    key: 'home_intro_variant',
    description: '首页引导文案（A=简洁 B=激励 C=数据）',
    weights: { A: 33, B: 33, C: 34 },
  } as ExperimentConfig,

  /** 新用户学习模式推荐 */
  NEW_USER_DEFAULT_MODE: {
    key: 'new_user_default_mode',
    description: '新用户默认背词模式（A=看英忆中 B=拼写 C=例句填空）',
    weights: { A: 50, B: 25, C: 25 },
  } as ExperimentConfig,
}