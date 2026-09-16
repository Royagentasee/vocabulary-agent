import { useState } from 'react'
import { View, Text, Button } from '@tarojs/components'
import { generateQuiz, Quiz } from '@/services/quiz'
import { colors, radius, spacing } from '@/styles/tokens'

interface QuizPanelProps {
  headword: string
}

export function QuizPanel({ headword }: QuizPanelProps) {
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const [answered, setAnswered] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = async () => {
    setLoading(true)
    setError(null)
    setSelected(null)
    setAnswered(false)
    setQuiz(null)
    try {
      const result = await generateQuiz(headword)
      setQuiz(result)
    } catch (e: any) {
      setError(e?.message || '出题失败')
    } finally {
      setLoading(false)
    }
  }

  const handleSelect = (label: string) => {
    if (answered) return
    setSelected(label)
    setAnswered(true)
  }

  return (
    <View
      style={{
        marginTop: spacing.lg,
        padding: spacing.lg,
        backgroundColor: '#fffbeb',
        borderRadius: radius.md,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <Text>🎯</Text>
        <Text style={{ fontWeight: 600, color: '#b45309' }}>AI 出题</Text>
      </View>

      {!quiz && !loading && !error && (
        <Button
          onClick={handleGenerate}
          style={{
            marginTop: spacing.md,
            backgroundColor: '#ffffff',
            color: '#b45309',
            border: '1px solid #fde68a',
            borderRadius: radius.md,
            fontSize: 14,
          }}
        >
          用「{headword}」出一题
        </Button>
      )}

      {loading && (
        <Text style={{ display: 'block', marginTop: spacing.md, color: '#b45309', fontSize: 13 }}>
          AI 出题中...
        </Text>
      )}

      {error && (
        <Text style={{ display: 'block', marginTop: spacing.md, color: colors.danger, fontSize: 13 }}>
          {error}
        </Text>
      )}

      {quiz && (
        <>
          <View style={{ marginTop: spacing.md }}>
            <Text style={{ fontSize: 15, lineHeight: 1.7, color: colors.ink[900] }}>
              {quiz.sentence}
            </Text>
          </View>

          <View style={{ marginTop: spacing.md, display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
            {quiz.choices.map((c) => {
              const isCorrect = answered && c.label === quiz.correct_label
              const isWrong = answered && selected === c.label && c.label !== quiz.correct_label
              const isSelected = selected === c.label
              return (
                <View
                  key={c.label}
                  onClick={() => handleSelect(c.label)}
                  style={{
                    padding: spacing.md,
                    borderRadius: radius.sm,
                    backgroundColor: isCorrect
                      ? '#ecfdf5'
                      : isWrong
                      ? '#fef2f2'
                      : isSelected
                      ? '#fef3c7'
                      : '#ffffff',
                    border: `1px solid ${
                      isCorrect ? '#6ee7b7' : isWrong ? '#fca5a5' : isSelected ? '#fbbf24' : '#eeeef0'
                    }`,
                    opacity: answered && !isCorrect && !isWrong ? 0.5 : 1,
                  }}
                >
                  <Text style={{ fontSize: 14 }}>
                    <Text style={{ fontWeight: 600, marginRight: spacing.sm }}>{c.label}.</Text>
                    {c.text}
                    {isCorrect && ' ✓'}
                    {isWrong && ' ✗'}
                  </Text>
                </View>
              )
            })}
          </View>

          {answered && (
            <View
              style={{
                marginTop: spacing.md,
                padding: spacing.md,
                backgroundColor: 'rgba(255,255,255,0.7)',
                borderRadius: radius.sm,
              }}
            >
              <Text style={{ fontSize: 12, color: colors.ink[500], lineHeight: 1.6 }}>
                {quiz.explanation}
              </Text>
            </View>
          )}

          {answered && (
            <View
              onClick={handleGenerate}
              style={{
                marginTop: spacing.md,
                alignItems: 'center',
                paddingVertical: spacing.sm,
              }}
            >
              <Text style={{ color: colors.ink[500], fontSize: 13 }}>↻ 再来一题</Text>
            </View>
          )}
        </>
      )}
    </View>
  )
}