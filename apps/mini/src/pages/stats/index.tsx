import { View, Text, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useLearnState } from '@/stores/useLearnState'
import { StatCard } from '@/components/StatCard'
import { Card } from '@/components/Card'
import { colors, spacing, typography, radius } from '@/styles/tokens'
import { useT } from '@/i18n'

export default function Stats() {
  const { todayLearned, todayReviewed, wrongWords, queue } = useLearnState()
  const total = queue.length
  const progress = total > 0 ? Math.round((todayReviewed / total) * 100) : 0
  const t = useT()

  return (
    <ScrollView style={{ minHeight: '100vh', backgroundColor: colors.bg.page, padding: spacing.xl }}>
      <Text style={{ fontSize: 28, fontWeight: 600, marginBottom: spacing.xs, display: 'block' }}>
        {t.stats.title}
      </Text>
      <Text style={{ ...typography.body, color: colors.ink[500], marginBottom: spacing.xl, display: 'block' }}>
        {t.stats.subtitle}
      </Text>

      <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg }}>
        <StatCard label={t.stats.todayNew} value={todayLearned} />
        <StatCard label={t.stats.todayReview} value={todayReviewed} />
        <StatCard label={t.stats.wrongCount} value={wrongWords.length} />
      </View>

      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm }}>
          <Text style={{ fontWeight: 600 }}>{t.stats.progress}</Text>
          <Text style={{ ...typography.body, color: colors.ink[500] }}>{progress}%</Text>
        </View>
        <View
          style={{
            width: '100%',
            height: 8,
            backgroundColor: colors.ink[100],
            borderRadius: radius.full,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              height: '100%',
              backgroundColor: colors.ink[900],
              width: `${progress}%`,
              transition: 'all 400ms cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          />
        </View>
      </Card>

      <Card>
        <View
          onClick={() => Taro.navigateTo({ url: '/pages/analysis/index' })}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 17, fontWeight: 600, display: 'block' }}>✨ AI 错因分析</Text>
            <Text style={{ ...typography.caption, color: colors.ink[500], marginTop: 4, display: 'block' }}>
              智能分析错题模式 + 针对性建议
            </Text>
          </View>
          <Text style={{ color: colors.ink[500], fontSize: 24 }}>›</Text>
        </View>
      </Card>

      {wrongWords.length > 0 && (
        <Card>
          <Text style={{ fontWeight: 600, marginBottom: spacing.md, display: 'block' }}>{t.stats.wrongList}</Text>
          {wrongWords.map((w) => (
            <View
              key={w.id}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                paddingVertical: spacing.sm,
                borderBottomWidth: 1,
                borderBottomColor: colors.ink[100],
              }}
            >
              <Text style={{ fontFamily: 'monospace' }}>{w.headword}</Text>
              <Text style={{ ...typography.caption, color: colors.ink[500] }}>
                {w.senses.map((s) => s.definitionCn).join('；')}
              </Text>
            </View>
          ))}
        </Card>
      )}
    </ScrollView>
  )
}