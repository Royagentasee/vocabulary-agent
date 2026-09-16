import { useState } from 'react'
import { View, Text, ScrollView, Pressable, TextInput } from 'react-native'
import { Rating, rate } from '../stores/learnStore'
import { useLearnState } from '../stores/useLearnState'

export function PracticeScreen() {
  const { queue, index } = useLearnState()
  const [mode, setMode] = useState<'recall' | 'spell' | 'cloze'>('recall')
  const [spellInput, setSpellInput] = useState('')
  const [revealed, setRevealed] = useState(false)
  const [spellCorrect, setSpellCorrect] = useState<boolean | null>(null)

  const current = queue[index]
  const finished = !current || index >= queue.length

  if (finished) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text style={{ fontSize: 32, marginBottom: 12 }}>🎉</Text>
        <Text style={{ fontSize: 22, fontWeight: '600' }}>今日复习完成</Text>
      </View>
    )
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#f7f7f8' }} contentContainerStyle={{ padding: 24 }}>
      {/* 模式切换 */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
        {(['recall', 'spell', 'cloze'] as const).map((m) => (
          <Pressable
            key={m}
            onPress={() => {
              setMode(m)
              setRevealed(false)
              setSpellInput('')
              setSpellCorrect(null)
            }}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 6,
              borderRadius: 999,
              backgroundColor: mode === m ? '#111111' : '#ffffff',
              borderWidth: 1,
              borderColor: mode === m ? '#111111' : '#eeeef0',
            }}
          >
            <Text style={{ color: mode === m ? '#ffffff' : '#6b7280', fontSize: 13 }}>
              {m === 'recall' ? '看英忆中' : m === 'spell' ? '拼写听写' : '例句填空'}
            </Text>
          </Pressable>
        ))}
      </View>

      {mode === 'recall' && (
        <RecallBlock word={current.word} onRate={(r) => rate(r)} />
      )}
      {mode === 'spell' && (
        <SpellBlock
          word={current.word}
          userInput={spellInput}
          setUserInput={setSpellInput}
          revealed={revealed}
          setRevealed={setRevealed}
          isCorrect={spellCorrect}
          setIsCorrect={setSpellCorrect}
          onRate={(r) => rate(r)}
        />
      )}
      {mode === 'cloze' && (
        <ClozeBlock word={current.word} revealed={revealed} setRevealed={setRevealed} onRate={(r) => rate(r)} />
      )}
    </ScrollView>
  )
}

function RecallBlock({ word, onRate }: any) {
  const [r, setR] = useState(false)
  return (
    <View style={{ backgroundColor: '#ffffff', borderRadius: 24, padding: 40, alignItems: 'center', borderWidth: 1, borderColor: '#eeeef0' }}>
      <Text style={{ fontSize: 48, fontWeight: '600' }}>{word.headword}</Text>
      <Text style={{ fontSize: 14, color: '#6b7280', fontFamily: 'monospace', marginTop: 12 }}>{word.ipa}</Text>
      {!r ? (
        <Pressable onPress={() => setR(true)} style={{ marginTop: 32, backgroundColor: '#111111', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 }}>
          <Text style={{ color: '#ffffff' }}>显示释义</Text>
        </Pressable>
      ) : (
        <View style={{ width: '100%', alignItems: 'center' }}>
          <Text style={{ fontSize: 20, marginTop: 24 }}>{word.senses.map((s: any) => s.definitionCn).join('；')}</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 24, alignSelf: 'stretch' }}>
            <RateBtn label="忘记" color="#fef2f2" text="#b91c1c" onPress={() => onRate(Rating.Again)} />
            <RateBtn label="困难" color="#fffbeb" text="#b45309" onPress={() => onRate(Rating.Hard)} />
            <RateBtn label="良好" color="#eff6ff" text="#1d4ed8" onPress={() => onRate(Rating.Good)} />
            <RateBtn label="简单" color="#ecfdf5" text="#047857" onPress={() => onRate(Rating.Easy)} />
          </View>
        </View>
      )}
    </View>
  )
}

function SpellBlock({ word, userInput, setUserInput, revealed, setRevealed, isCorrect, setIsCorrect, onRate }: any) {
  const handleSubmit = () => {
    setRevealed(true)
    setIsCorrect(userInput.trim().toLowerCase() === word.headword.toLowerCase())
  }
  return (
    <View style={{ backgroundColor: '#ffffff', borderRadius: 24, padding: 32, borderWidth: 1, borderColor: '#eeeef0' }}>
      <Text style={{ fontSize: 14, color: '#6b7280', textAlign: 'center' }}>根据释义与音标，写出单词</Text>
      <Text style={{ fontSize: 22, textAlign: 'center', marginTop: 24 }}>{word.senses.map((s: any) => s.definitionCn).join('；')}</Text>
      <Text style={{ fontSize: 14, color: '#6b7280', fontFamily: 'monospace', textAlign: 'center', marginTop: 8 }}>{word.ipa}</Text>

      <TextInput
        placeholder="请输入单词"
        value={userInput}
        onChangeText={setUserInput}
        editable={!revealed}
        autoCapitalize="none"
        autoCorrect={false}
        style={{
          marginTop: 24,
          padding: 12,
          backgroundColor: '#f7f7f8',
          borderRadius: 12,
          fontSize: 16,
          textAlign: 'center',
        }}
      />

      {!revealed ? (
        <Pressable
          onPress={handleSubmit}
          disabled={userInput.trim().length === 0}
          style={{
            marginTop: 16,
            backgroundColor: userInput.trim().length === 0 ? '#6b7280' : '#111111',
            paddingVertical: 12,
            borderRadius: 12,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: '#ffffff' }}>提交</Text>
        </Pressable>
      ) : (
        <View>
          <View style={{ marginTop: 16, padding: 12, backgroundColor: isCorrect ? '#ecfdf5' : '#fef2f2', borderRadius: 8, alignItems: 'center' }}>
            <Text style={{ color: isCorrect ? '#047857' : '#b91c1c', fontWeight: '600' }}>
              {isCorrect ? '✓ 正确' : `✗ 正确：${word.headword}`}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
            <RateBtn label="不认识" color="#fef2f2" text="#b91c1c" onPress={() => onRate(Rating.Again)} style={{ flex: 1 }} />
            <RateBtn label="记住了" color="#eff6ff" text="#1d4ed8" onPress={() => onRate(Rating.Good)} style={{ flex: 1 }} />
          </View>
        </View>
      )}
    </View>
  )
}

function ClozeBlock({ word, revealed, setRevealed, onRate }: any) {
  const clozeSentence = word.examples[0]?.sentence?.replace(
    new RegExp(`\\b${word.headword}\\w*\\b`, 'i'),
    '____',
  )
  return (
    <View style={{ backgroundColor: '#ffffff', borderRadius: 24, padding: 32, borderWidth: 1, borderColor: '#eeeef0' }}>
      <Text style={{ fontSize: 14, color: '#6b7280', textAlign: 'center' }}>根据语境填空</Text>
      <Text style={{ fontSize: 18, lineHeight: 32, marginTop: 32 }}>{clozeSentence}</Text>
      {!revealed ? (
        <Pressable onPress={() => setRevealed(true)} style={{ marginTop: 24, paddingVertical: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#eeeef0' }}>
          <Text>显示答案</Text>
        </Pressable>
      ) : (
        <View>
          <View style={{ marginTop: 16, padding: 12, backgroundColor: '#dbeafe', borderRadius: 8, alignItems: 'center' }}>
            <Text style={{ color: '#1d4ed8', fontWeight: '600' }}>{word.headword}</Text>
          </View>
          <Text style={{ fontSize: 14, color: '#6b7280', marginTop: 16 }}>{word.examples[0]?.translation}</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
            <RateBtn label="不会" color="#fef2f2" text="#b91c1c" onPress={() => onRate(Rating.Again)} style={{ flex: 1 }} />
            <RateBtn label="困难" color="#fffbeb" text="#b45309" onPress={() => onRate(Rating.Hard)} style={{ flex: 1 }} />
            <RateBtn label="良好" color="#eff6ff" text="#1d4ed8" onPress={() => onRate(Rating.Good)} style={{ flex: 1 }} />
            <RateBtn label="简单" color="#ecfdf5" text="#047857" onPress={() => onRate(Rating.Easy)} style={{ flex: 1 }} />
          </View>
        </View>
      )}
    </View>
  )
}

function RateBtn({ label, color, text, onPress, style }: any) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        {
          paddingVertical: 12,
          borderRadius: 12,
          backgroundColor: color,
          alignItems: 'center',
        },
        style,
      ]}
    >
      <Text style={{ color: text, fontWeight: '500' }}>{label}</Text>
    </Pressable>
  )
}