import { Button as TaroButton } from '@tarojs/components'
import type { CSSProperties } from 'react'
import { colors, radius, spacing } from '../styles/tokens'

interface ButtonProps {
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  block?: boolean
  disabled?: boolean
  onClick?: () => void
  style?: CSSProperties
}

const variantStyles = {
  primary: {
    backgroundColor: colors.ink[900],
    color: '#ffffff',
    border: 'none',
  },
  secondary: {
    backgroundColor: colors.bg.card,
    color: colors.ink[900],
    border: `1px solid ${colors.ink[100]}`,
  },
  ghost: {
    backgroundColor: 'transparent',
    color: colors.ink[500],
    border: 'none',
  },
}

const sizeStyles = {
  sm: { paddingVertical: 6, paddingHorizontal: 12, fontSize: 13 },
  md: { paddingVertical: 10, paddingHorizontal: 16, fontSize: 14 },
  lg: { paddingVertical: 14, paddingHorizontal: 24, fontSize: 16 },
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  block,
  disabled,
  onClick,
  style,
}: ButtonProps) {
  const v = variantStyles[variant]
  const s = sizeStyles[size]
  return (
    <TaroButton
      onClick={onClick}
      disabled={disabled}
      style={{
        ...v,
        ...s,
        width: block ? '100%' : 'auto',
        borderRadius: radius.md,
        fontWeight: 500,
        opacity: disabled ? 0.5 : 1,
        transition: 'all 150ms cubic-bezier(0.16, 1, 0.3, 1)',
        ...style,
      }}
    >
      {children}
    </TaroButton>
  )
}