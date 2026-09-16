import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { Rating, nextWord, rate } from '@/stores/learnStore'
import { useLearnState } from '@/stores/useLearnState'
import { explainWord, AIExplanation } from '@/services/ai'
import { useT } from '@/i18n'
import { Card } from '@/components/Card'
import { WordCard } from '@/components/WordCard'
import { Button } from '@/components/Button'
import { RateButton } from '@/components/RateButton'
import { QuizPanel } from '@/components/QuizPanel'
import { colors, spacing, typography } from '@/styles/tokens'

export default function Review() {
  const { queue, index, currentWordbookId } = useLearnState()
  const [revealed, setRevealed] = useState(false)
  const [aiExplanation, setAiExplanation] = useState<AIExplanation | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const t = useT()

  if (!currentWordbookId) {
    return (
      <View style={{ padding: spacing.xl, alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <Text style={{ color: colors.ink[500], marginBottom: spacing.lg, display: 'block' }}>
          {t.review.selectWordbook}
        </Text>
        <Button onClick={() => Taro.navigateTo({ url: '/pages/wordbooks/index' })}>
          {t.review.goSelect}
        </Button>
      </View>
    )
  }

  if (queue.length === 0 || index >= queue.length) {
    return (
      <View style={{ padding: spacing.xl, alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <Text style={{ fontSize: 32, display: 'block' }}>🎉</Text>
        <Text style={{ fontSize: 22, fontWeight: 600, marginTop: spacing.md, display: 'block' }}>
          {t.review.finished}
        </Text>
        <Text style={{ ...typography.body, color: colors.ink[500], marginTop: spacing.sm, display: 'block' }}>
          {t.review.finishedHint(queue.length)}
        </Text>
      </View>
    )
  }

  const current = queue[index]

  const handleRate = (r: Rating) => {
    rate(r)
    setRevealed(false)
    setAiExplanation(null)
    nextWord()
  }

  const handleAskAI = async () => {
    setAiLoading(true)
    try {
      const result = await explainWord(current.word.headword)
      setAiExplanation(result)
    } catch (e) {
      Taro.showToast({ title: 'AI 解释失败', icon: 'none' })
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <View style={{ padding: spacing.xl, minHeight: '100vh', backgroundColor: colors.bg.page }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.lg }}>
        <Text style={{ ...typography.body, color: colors.ink[500] }}>
          {index + 1} / {queue.length}
        </Text>
        <Text style={{ ...typography.caption, color: colors.ink[500], fontFamily: 'monospace' }}>
          {current.card.state}
        </Text>
      </View>

      <WordCard
        headword={current.word.headword}
        ipa={current.word.ipa}
        revealed={revealed}
        senses={current.word.senses}
      >
        {!revealed ? (
          <Button block onClick={() => setRevealed(true)} style={{ marginTop: spacing.huge }}>
            {t.review.showMeaning}
          </Button>
        ) : (
          <View style={{ alignSelf: 'stretch', marginTop: spacing.xl }}>
            {!aiExplanation && !aiLoading && (
              <Button variant="secondary" block onClick={handleAskAI}>
                {t.review.askAI}
              </Button>
            )}
            {aiLoading && (
              <Text style={{ textAlign: 'center', color: colors.ink[500], marginTop: spacing.lg, display: 'block' }}>
                {t.review.aiThinking}
              </Text>
            )}
            {aiExplanation && (
              <View
                style={{
                  marginTop: spacing.lg,
                  padding: spacing.lg,
                  backgroundColor: colors.accent.soft,
                  borderRadius: 12,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <Text>✨</Text>
                  <Text style={{ color: colors.accent.deep, fontWeight: 600 }}>{t.review.aiTitle}</Text>
                </View>
                {aiExplanation.etymology && (
                  <Text style={{ marginTop: spacing.sm, fontSize: 13 }}>
                    <Text style={{ color: colors.ink[500] }}>词根 / Etymology: </Text>
                    {aiExplanation.etymology}
                  </Text>
                )}
                {aiExplanation.memory_tip && (
                  <Text style={{ marginTop: spacing.sm, fontSize: 14 }}>{aiExplanation.memory_tip}</Text>
                )}
              </View>
            )}

            <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xl }}>
              <RateButton label={t.review.again} variant="again" onClick={() => handleRate(Rating.Again)} />
              <RateButton label={t.review.hard} variant="hard" onClick={() => handleRate(Rating.Hard)} />
              <RateButton label={t.review.good} variant="good" onClick={() => handleRate(Rating.Good)} />
              <RateButton label={t.review.easy} variant="easy" onClick={() => handleRate(Rating.Easy)} />
            </View>
          </View>
        )}
      </WordCard>

      {revealed && (
        <View style={{ marginTop: spacing.lg }}>
          <QuizPanel headword={current.word.headword} />
        </View>
      )}

      {revealed && current.word.examples[0] && (
        <Card style={{ marginTop: spacing.lg }}>
          <Text
            style={{
              fontSize: 11,
              color: colors.ink[500],
              textTransform: 'uppercase',
              letterSpacing: 1.5,
              marginBottom: spacing.sm,
              display: 'block',
            }}
          >
            {t.review.example}
          </Text>
          <Text style={{ fontSize: 14, display: 'block' }}>{current.word.examples[0].sentence}</Text>
          <Text style={{ fontSize: 14, color: colors.ink[500], marginTop: spacing.xs, display: 'block' }}>
            {current.word.examples[0].translation}
          </Text>
          {current.word.examples[0].source && (
            <Text style={{ fontSize: 11, color: colors.ink[500], marginTop: spacing.sm, display: 'block', fontStyle: 'italic' }}>
              — {current.word.examples[0].source}
            </Text>
          )}
        </Card>
      )}
    </View>
  )
}