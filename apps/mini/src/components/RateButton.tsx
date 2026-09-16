import { View } from '@tarojs/components'
import { colors, radius, spacing, typography } from '../styles/tokens'

interface RateButtonProps {
  label: string
  variant: 'again' | 'hard' | 'good' | 'easy'
  onClick: () => void
}

const variantStyles = {
  again: { bg: '#fef2f2', text: '#b91c1c', hint: '< 1d' },
  hard: { bg: '#fffbeb', text: '#b45309', hint: '2d' },
  good: { bg: '#eff6ff', text: '#1d4ed8', hint: '4d' },
  easy: { bg: '#ecfdf5', text: '#047857', hint: '7d' },
}

export function RateButton({ label, variant, onClick }: RateButtonProps) {
  const v = variantStyles[variant]
  return (
    <View
      onClick={onClick}
      style={{
        flex: 1,
        backgroundColor: v.bg,
        color: v.text,
        paddingVertical: spacing.md,
        borderRadius: radius.md,
        alignItems: 'center',
        transition: 'all 150ms cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <View style={{ fontWeight: 600, fontSize: 14, color: v.text }}>{label}</View>
      <View style={{ fontSize: 11, color: v.text, marginTop: 2, opacity: 0.6 }}>{v.hint}</View>
    </View>
  )
}