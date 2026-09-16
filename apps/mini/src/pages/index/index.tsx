import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useLearnState } from '@/stores/useLearnState'
import { StatCard } from '@/components/StatCard'
import { Card } from '@/components/Card'
import { colors, radius, spacing, typography } from '@/styles/tokens'
import { useT } from '@/i18n'

export default function Index() {
  const { todayLearned, todayReviewed, wrongWords } = useLearnState()
  const t = useT()

  return (
    <View
      style={{
        minHeight: '100vh',
        backgroundColor: colors.bg.page,
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.huge,
        paddingBottom: spacing.xxl,
      }}
    >
      {/* Greeting */}
      <View style={{ marginBottom: spacing.xxl }}>
        <Text style={{ ...typography.title, color: colors.ink[900], display: 'block' }}>
          {t.home.greeting} 👋
        </Text>
        <Text
          style={{
            ...typography.body,
            color: colors.ink[500],
            marginTop: spacing.sm,
            display: 'block',
          }}
        >
          {t.home.subtitle}
        </Text>
      </View>

      {/* Stat cards */}
      <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.xl }}>
        <StatCard label={t.home.todayNew} value={todayLearned} />
        <StatCard label={t.home.todayReview} value={todayReviewed} />
        <StatCard label={t.home.wrongCount} value={wrongWords.length} />
      </View>

      {/* Quick actions */}
      <Card onClick={() => Taro.navigateTo({ url: '/pages/wordbooks/index' })}>
        <Text style={{ fontSize: 17, fontWeight: 600, color: colors.ink[900], display: 'block' }}>
          {t.home.startLearning}
        </Text>
        <Text style={{ ...typography.caption, color: colors.ink[500], marginTop: 4, display: 'block' }}>
          {t.home.startLearningHint}
        </Text>
      </Card>

      <Card onClick={() => Taro.navigateTo({ url: '/pages/review/index' })}>
        <Text style={{ fontSize: 17, fontWeight: 600, color: colors.ink[900], display: 'block' }}>
          {t.home.continueReview}
        </Text>
        <Text style={{ ...typography.caption, color: colors.ink[500], marginTop: 4, display: 'block' }}>
          {t.home.continueReviewHint}
        </Text>
      </Card>

      <Card onClick={() => Taro.navigateTo({ url: '/pages/practice/index' })}>
        <Text style={{ fontSize: 17, fontWeight: 600, color: colors.ink[900], display: 'block' }}>
          {t.home.practice}
        </Text>
        <Text style={{ ...typography.caption, color: colors.ink[500], marginTop: 4, display: 'block' }}>
          {t.home.practiceHint}
        </Text>
      </Card>

      <Card onClick={() => Taro.navigateTo({ url: '/pages/dialogue/index' })} elevated>
        <Text style={{ fontSize: 17, fontWeight: 600, color: colors.ink[900], display: 'block' }}>
          🎙️ AI 口语陪练
        </Text>
        <Text style={{ ...typography.caption, color: colors.ink[500], marginTop: 4, display: 'block' }}>
          5 种场景 · 实时纠错 · 综合评分
        </Text>
      </Card>
    </View>
  )
}