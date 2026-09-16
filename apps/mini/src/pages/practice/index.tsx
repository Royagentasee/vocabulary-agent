import { useState, useEffect, useMemo } from 'react'
import { View, Text, Input, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import type { Word } from '@vocab-agent/types'
import { fetchWords } from '@/services/words'
import { Rating, rate } from '@/stores/learnStore'
import { useLearnState } from '@/stores/useLearnState'

type Mode = 'recall' | 'spell' | 'cloze' | 'ai_dialog'

interface Props {
  initialMode?: Mode
}

/**
 * 多种背词模式：
 * - recall（看英忆中）：默认
 * - spell（拼写听写）：看中文释义 + 音标，输入英文
 * - cloze（例句填空）：例句挖空，填词
 * - ai_dialog（AI 对话）：保留入口，V1.0 实现
 */
export default function Practice({ initialMode = 'recall' }: Props) {
  const { queue, index } = useLearnState()
  const [mode, setMode] = useState<Mode>(initialMode)
  const [userInput, setUserInput] = useState('')
  const [revealed, setRevealed] = useState(false)
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)

  const current = queue[index]
  const finished = !current || index >= queue.length

  // 切模式时重置
  useEffect(() => {
    setUserInput('')
    setRevealed(false)
    setIsCorrect(null)
  }, [mode, index])

  if (finished) {
    return (
      <View className="container">
        <View className="card" style={{ textAlign: 'center' }}>
          <Text style={{ fontSize: '32px', display: 'block' }}>🎉</Text>
          <Text className="title" style={{ marginTop: '12px' }}>
            今日复习完成
          </Text>
          <Button
            className="btn"
            style={{ marginTop: '20px' }}
            onClick={() => Taro.navigateBack()}
          >
            返回
          </Button>
        </View>
      </View>
    )
  }

  return (
    <View className="container">
      <View style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
        <Text style={{ fontSize: '14px', color: '#6b7280' }}>
          {index + 1} / {queue.length}
        </Text>
        <Text style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase' }}>
          {mode}
        </Text>
      </View>

      {/* 模式切换 */}
      <View style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {(['recall', 'spell', 'cloze'] as Mode[]).map((m) => (
          <View
            key={m}
            onClick={() => setMode(m)}
            style={{
              padding: '6px 14px',
              borderRadius: '999px',
              background: mode === m ? '#111111' : '#ffffff',
              color: mode === m ? '#ffffff' : '#6b7280',
              fontSize: '13px',
              border: mode === m ? 'none' : '1px solid #eeeef0',
            }}
          >
            {m === 'recall' ? '看英忆中' : m === 'spell' ? '拼写听写' : '例句填空'}
          </View>
        ))}
      </View>

      {mode === 'recall' && <RecallMode word={current.word} />}
      {mode === 'spell' && (
        <SpellMode
          word={current.word}
          userInput={userInput}
          setUserInput={setUserInput}
          revealed={revealed}
          setRevealed={setRevealed}
          isCorrect={isCorrect}
          setIsCorrect={setIsCorrect}
        />
      )}
      {mode === 'cloze' && (
        <ClozeMode word={current.word} />
      )}
    </View>
  )
}

// =================== Recall 看英忆中 ===================
function RecallMode({ word }: { word: Word }) {
  const [revealed, setRevealed] = useState(false)

  return (
    <View className="card" style={{ padding: '40px 24px' }}>
      <Text className="word-title">{word.headword}</Text>
      <Text className="word-ipa">{word.ipa}</Text>

      {!revealed ? (
        <Button
          className="btn"
          style={{ marginTop: '40px', width: '100%' }}
          onClick={() => setRevealed(true)}
        >
          显示释义
        </Button>
      ) : (
        <View style={{ marginTop: '32px' }}>
          <Text className="word-sense">
            {word.senses.map((s) => s.definitionCn).join('；')}
          </Text>
          <Text className="word-sense-en">{word.senses[0]?.definitionEn}</Text>

          <View className="btn-row">
            <Button className="rate-btn rate-red" onClick={() => handleRate(Rating.Again)}>
              忘记
            </Button>
            <Button className="rate-btn rate-amber" onClick={() => handleRate(Rating.Hard)}>
              困难
            </Button>
            <Button className="rate-btn rate-blue" onClick={() => handleRate(Rating.Good)}>
              良好
            </Button>
            <Button className="rate-btn rate-emerald" onClick={() => handleRate(Rating.Easy)}>
              简单
            </Button>
          </View>
        </View>
      )}
    </View>
  )
}

function handleRate(r: Rating) {
  rate(r)
}

// =================== Spell 拼写听写 ===================
function SpellMode({
  word,
  userInput,
  setUserInput,
  revealed,
  setRevealed,
  isCorrect,
  setIsCorrect,
}: {
  word: Word
  userInput: string
  setUserInput: (v: string) => void
  revealed: boolean
  setRevealed: (v: boolean) => void
  isCorrect: boolean | null
  setIsCorrect: (v: boolean | null) => void
}) {
  const handleSubmit = () => {
    setRevealed(true)
    setIsCorrect(userInput.trim().toLowerCase() === word.headword.toLowerCase())
  }

  return (
    <View className="card" style={{ padding: '32px 24px' }}>
      <Text style={{ fontSize: '14px', color: '#6b7280', textAlign: 'center', display: 'block' }}>
        根据释义与音标，写出单词
      </Text>
      <Text style={{ fontSize: '22px', textAlign: 'center', display: 'block', marginTop: '24px' }}>
        {word.senses.map((s) => s.definitionCn).join('；')}
      </Text>
      <Text className="word-ipa">{word.ipa}</Text>

      <Input
        className="spell-input"
        placeholder="请输入单词"
        value={userInput}
        onInput={(e) => setUserInput(e.detail.value)}
        disabled={revealed}
        style={{
          marginTop: '24px',
          padding: '12px 16px',
          background: '#f7f7f8',
          borderRadius: '12px',
          fontSize: '16px',
          textAlign: 'center',
          border: isCorrect === false ? '1px solid #ef4444' : '1px solid #eeeef0',
        }}
      />

      {!revealed ? (
        <Button
          className="btn"
          style={{ marginTop: '16px', width: '100%' }}
          onClick={handleSubmit}
          disabled={userInput.trim().length === 0}
        >
          提交
        </Button>
      ) : (
        <View style={{ marginTop: '16px' }}>
          <View
            style={{
              padding: '12px',
              background: isCorrect ? '#ecfdf5' : '#fef2f2',
              borderRadius: '8px',
              textAlign: 'center',
              color: isCorrect ? '#047857' : '#b91c1c',
            }}
          >
            <Text style={{ fontWeight: 600 }}>
              {isCorrect ? '✓ 正确' : '✗ 正确拼写：' + word.headword}
            </Text>
          </View>

          <View className="btn-row">
            <Button className="rate-btn rate-red" onClick={() => handleRate(Rating.Again)}>
              不认识
            </Button>
            <Button className="rate-btn rate-blue" onClick={() => handleRate(Rating.Good)}>
              记住了
            </Button>
          </View>
        </View>
      )}
    </View>
  )
}

// =================== Cloze 例句填空 ===================
function ClozeMode({ word }: { word: Word }) {
  const [revealed, setRevealed] = useState(false)

  const clozeSentence = useMemo(() => {
    if (!word.examples[0]) return ''
    return word.examples[0].sentence.replace(
      new RegExp(`\\b${word.headword}\\w*\\b`, 'i'),
      '____',
    )
  }, [word])

  if (!word.examples[0]) {
    return (
      <View className="card" style={{ textAlign: 'center' }}>
        <Text style={{ color: '#6b7280' }}>该单词暂无例句</Text>
        <Button
          className="btn"
          style={{ marginTop: '16px' }}
          onClick={() => setRevealed(true)}
        >
          显示答案
        </Button>
      </View>
    )
  }

  return (
    <View className="card" style={{ padding: '32px 24px' }}>
      <Text style={{ fontSize: '14px', color: '#6b7280', textAlign: 'center', display: 'block' }}>
        根据语境，在空格里填入正确的单词
      </Text>

      <Text style={{ fontSize: '18px', lineHeight: '1.8', marginTop: '32px', display: 'block' }}>
        {clozeSentence}
      </Text>

      {!revealed ? (
        <Button
          className="btn btn-secondary"
          style={{ marginTop: '24px', width: '100%' }}
          onClick={() => setRevealed(true)}
        >
          显示答案
        </Button>
      ) : (
        <View style={{ marginTop: '24px' }}>
          <View
            style={{
              padding: '12px',
              background: '#dbeafe',
              borderRadius: '8px',
              textAlign: 'center',
            }}
          >
            <Text style={{ color: '#1d4ed8', fontWeight: 600 }}>
              {word.headword}
            </Text>
          </View>

          <Text style={{ fontSize: '14px', color: '#6b7280', display: 'block', marginTop: '16px' }}>
            {word.examples[0].translation}
          </Text>

          <View className="btn-row">
            <Button className="rate-btn rate-red" onClick={() => handleRate(Rating.Again)}>
              不会
            </Button>
            <Button className="rate-btn rate-amber" onClick={() => handleRate(Rating.Hard)}>
              困难
            </Button>
            <Button className="rate-btn rate-blue" onClick={() => handleRate(Rating.Good)}>
              良好
            </Button>
            <Button className="rate-btn rate-emerald" onClick={() => handleRate(Rating.Easy)}>
              简单
            </Button>
          </View>
        </View>
      )}
    </View>
  )
}