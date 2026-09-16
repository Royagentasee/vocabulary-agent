import { useState } from 'react'
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native'
import { Rating, nextWord, rate } from '../stores/learnStore'
import { useLearnState } from '../stores/useLearnState'
import { explainWord, AIExplanation } from '../services/ai'

export function ReviewScreen() {
  const { queue, index, currentWordbookId } = useLearnState()
  const [revealed, setRevealed] = useState(false)
  const [aiExplanation, setAiExplanation] = useState<AIExplanation | null>(null)
  const [aiLoading, setAiLoading] = useState(false)

  if (!currentWordbookId) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text style={{ color: '#6b7280', marginBottom: 16 }}>请先选择词书</Text>
        <Text style={{ color: '#111111' }}>← 返回首页选词</Text>
      </View>
    )
  }

  if (queue.length === 0 || index >= queue.length) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text style={{ fontSize: 32, marginBottom: 12 }}>🎉</Text>
        <Text style={{ fontSize: 22, fontWeight: '600' }}>今日复习完成</Text>
        <Text style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>共 {queue.length} 张卡片</Text>
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
      setAiExplanation({ memory_tip: '调用失败，请稍后重试', headword: current.word.headword, ipa: '', etymology: '', difficulty: 'medium', examples: [] })
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#f7f7f8' }} contentContainerStyle={{ padding: 24 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
        <Text style={{ fontSize: 14, color: '#6b7280' }}>{index + 1} / {queue.length}</Text>
        <Text style={{ fontSize: 12, color: '#6b7280', fontFamily: 'monospace' }}>{current.card.state}</Text>
      </View>

      <View style={{ backgroundColor: '#ffffff', borderRadius: 24, padding: 40, alignItems: 'center' }}>
        <Text style={{ fontSize: 48, fontWeight: '600', letterSpacing: -1 }}>{current.word.headword}</Text>
        <Text style={{ fontSize: 14, color: '#6b7280', fontFamily: 'monospace', marginTop: 12 }}>
          {current.word.ipa}
        </Text>

        {!revealed ? (
          <Pressable
            onPress={() => setRevealed(true)}
            style={{
              marginTop: 32,
              backgroundColor: '#111111',
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 12,
            }}
          >
            <Text style={{ color: '#ffffff', fontWeight: '500' }}>显示释义</Text>
          </Pressable>
        ) : (
          <View style={{ width: '100%', alignItems: 'center' }}>
            <Text style={{ fontSize: 20, marginTop: 24 }}>{current.word.senses.map((s) => s.definitionCn).join('；')}</Text>
            <Text style={{ fontSize: 13, color: '#6b7280', fontStyle: 'italic', marginTop: 8 }}>
              {current.word.senses[0]?.definitionEn}
            </Text>

            {!aiExplanation && !aiLoading && (
              <Pressable
                onPress={handleAskAI}
                style={{
                  marginTop: 24,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: '#eeeef0',
                }}
              >
                <Text style={{ color: '#111111' }}>✨ 让 AI 解释</Text>
              </Pressable>
            )}

            {aiLoading && (
              <ActivityIndicator style={{ marginTop: 24 }} />
            )}

            {aiExplanation && (
              <View style={{ marginTop: 24, padding: 16, backgroundColor: '#dbeafe', borderRadius: 12, alignSelf: 'stretch' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text>✨</Text>
                  <Text style={{ color: '#1d4ed8', fontWeight: '600' }}>AI 解读</Text>
                </View>
                {aiExplanation.etymology && (
                  <Text style={{ marginTop: 8, fontSize: 13 }}>
                    <Text style={{ color: '#6b7280' }}>词根：</Text>
                    {aiExplanation.etymology}
                  </Text>
                )}
                {aiExplanation.memory_tip && (
                  <Text style={{ marginTop: 8, fontSize: 14 }}>{aiExplanation.memory_tip}</Text>
                )}
              </View>
            )}

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 24, alignSelf: 'stretch' }}>
              <RateButton label="忘记" color="#fef2f2" textColor="#b91c1c" onPress={() => handleRate(Rating.Again)} />
              <RateButton label="困难" color="#fffbeb" textColor="#b45309" onPress={() => handleRate(Rating.Hard)} />
              <RateButton label="良好" color="#eff6ff" textColor="#1d4ed8" onPress={() => handleRate(Rating.Good)} />
              <RateButton label="简单" color="#ecfdf5" textColor="#047857" onPress={() => handleRate(Rating.Easy)} />
            </View>
          </View>
        )}
      </View>

      {revealed && current.word.examples[0] && (
        <View style={{ backgroundColor: '#ffffff', borderRadius: 16, padding: 20, marginTop: 12 }}>
          <Text style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
            EXAMPLE
          </Text>
          <Text style={{ fontSize: 14 }}>{current.word.examples[0].sentence}</Text>
          <Text style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>{current.word.examples[0].translation}</Text>
        </View>
      )}
    </ScrollView>
  )
}

function RateButton({ label, color, textColor, onPress }: { label: string; color: string; textColor: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: color,
        alignItems: 'center',
      }}
    >
      <Text style={{ color: textColor, fontWeight: '500' }}>{label}</Text>
    </Pressable>
  )
}