import { View, Text } from '@tarojs/components'
import { colors, radius, spacing } from '../styles/tokens'

interface WordCardProps {
  headword: string
  ipa?: string
  revealed?: boolean
  senses?: Array<{ definitionCn: string; definitionEn?: string }>
  children?: React.ReactNode
}

/**
 * 单词卡片（复习页核心组件）
 */
export function WordCard({ headword, ipa, revealed, senses, children }: WordCardProps) {
  return (
    <View
      style={{
        backgroundColor: colors.bg.card,
        borderRadius: radius.xl,
        padding: spacing.huge,
        alignItems: 'center',
        boxShadow: `0 4px 24px ${colors.shadow.subtle}`,
      }}
    >
      <Text
        style={{
          fontSize: 48,
          fontWeight: '600',
          letterSpacing: -1,
          display: 'block',
          color: colors.ink[900],
        }}
      >
        {headword}
      </Text>
      {ipa && (
        <Text
          style={{
            fontFamily: 'monospace',
            color: colors.ink[500],
            marginTop: spacing.md,
            display: 'block',
            fontSize: 14,
          }}
        >
          {ipa}
        </Text>
      )}

      {revealed && senses && (
        <View style={{ marginTop: spacing.xl, alignItems: 'center' }}>
          <Text style={{ fontSize: 22, color: colors.ink[900], display: 'block', textAlign: 'center' }}>
            {senses.map((s) => s.definitionCn).join('；')}
          </Text>
          {senses[0]?.definitionEn && (
            <Text
              style={{
                fontSize: 13,
                color: colors.ink[500],
                fontStyle: 'italic',
                marginTop: spacing.sm,
                display: 'block',
                textAlign: 'center',
              }}
            >
              {senses[0].definitionEn}
            </Text>
          )}
        </View>
      )}

      {children}
    </View>
  )
}