import { View } from '@tarojs/components'
import type { CSSProperties } from 'react'
import { colors, radius, spacing } from '../styles/tokens'

interface CardProps {
  children: React.ReactNode
  elevated?: boolean
  padding?: keyof typeof spacing
  onClick?: () => void
  style?: CSSProperties
}

/**
 * 通用卡片组件
 *
 * elevated=true 时显示悬浮阴影（用于强调卡片）
 */
export function Card({ children, elevated, padding = 'xl', onClick, style }: CardProps) {
  return (
    <View
      onClick={onClick}
      style={{
        backgroundColor: colors.bg.card,
        borderRadius: radius.lg,
        padding: spacing[padding],
        marginBottom: spacing.md,
        boxShadow: elevated ? `0 4px 16px ${colors.shadow.elevated}` : `0 1px 2px ${colors.shadow.subtle}`,
        transition: 'all 240ms cubic-bezier(0.16, 1, 0.3, 1)',
        ...style,
      }}
    >
      {children}
    </View>
  )
}