/**
 * Vocabulary Agent 设计系统 · Tokens
 *
 * 科技极简风：黑白主色 + 蓝色点缀 + 大量留白
 * 字号梯度：12 / 13 / 14 / 17 / 20 / 28 / 48
 * 圆角梯度：8 / 12 / 16 / 24
 * 阴影梯度：none / subtle / elevated
 */
export const colors = {
  // 基础色
  ink: {
    50: '#f7f7f8',
    100: '#eeeef0',
    200: '#d1d5db',
    500: '#6b7280',
    900: '#111111',
  },
  // 品牌色
  accent: {
    DEFAULT: '#3b82f6',
    soft: '#dbeafe',
    deep: '#1d4ed8',
  },
  // 语义色
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  // 背景
  bg: {
    page: '#f7f7f8',
    card: '#ffffff',
    elevated: '#ffffff',
    overlay: 'rgba(0,0,0,0.5)',
  },
  // 阴影
  shadow: {
    subtle: 'rgba(17, 17, 17, 0.04)',
    elevated: 'rgba(17, 17, 17, 0.08)',
  },
} as const

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  huge: 48,
} as const

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
} as const

export const typography = {
  display: {
    fontSize: 48,
    fontWeight: '600' as const,
    letterSpacing: -1,
  },
  title: {
    fontSize: 28,
    fontWeight: '600' as const,
    letterSpacing: -0.5,
  },
  heading: {
    fontSize: 20,
    fontWeight: '600' as const,
  },
  body: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 1.6,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
  },
} as const

export const motion = {
  // 缓动曲线
  ease: {
    out: 'cubic-bezier(0.16, 1, 0.3, 1)',
    in: 'cubic-bezier(0.7, 0, 0.84, 0)',
    inOut: 'cubic-bezier(0.65, 0, 0.35, 1)',
  },
  // 时长（ms）
  duration: {
    fast: 150,
    normal: 240,
    slow: 400,
  },
} as const

export const tokens = { colors, spacing, radius, typography, motion }
export type Tokens = typeof tokens