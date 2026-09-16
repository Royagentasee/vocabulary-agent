import { View, Text } from '@tarojs/components'
import { colors, radius, spacing, typography } from '../styles/tokens'

interface StatCardProps {
  label: string
  value: number | string
  trend?: 'up' | 'down' | 'flat'
  hint?: string
}

export function StatCard({ label, value, trend, hint }: StatCardProps) {
  return (
    <View
      style={{
        backgroundColor: colors.bg.card,
        borderRadius: radius.lg,
        padding: spacing.xl,
        flex: 1,
        boxShadow: `0 1px 2px ${colors.shadow.subtle}`,
      }}
    >
      <Text style={{ ...typography.display, fontSize: 32, display: 'block' }}>{value}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.xs }}>
        <Text style={{ ...typography.caption, color: colors.ink[500] }}>{label}</Text>
        {trend && (
          <Text style={{ marginLeft: 4, fontSize: 12 }}>
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '·'}
          </Text>
        )}
      </View>
      {hint && (
        <Text style={{ ...typography.caption, color: colors.ink[500], marginTop: spacing.xs, display: 'block' }}>
          {hint}
        </Text>
      )}
    </View>
  )
}