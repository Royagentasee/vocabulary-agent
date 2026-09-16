// AI 口语陪练（分包：package-ai/pages/dialogue）
import { useState } from 'react'
import { View, Text, ScrollView, Input } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { colors, radius, spacing, typography } from '@/styles/tokens'

const API_BASE = 'https://your-ai-gateway-domain.com'

type Scenario = 'interview' | 'travel' | 'business' | 'academic' | 'daily'

interface Message {
  role: 'assistant' | 'user'
  content: string
  corrections?: string[]
}

const SCENARIOS: Array<{ key: Scenario; label: string; emoji: string }> = [
  { key: 'interview', label: '面试', emoji: '💼' },
  { key: 'travel', label: '旅行', emoji: '✈️' },
  { key: 'business', label: '商务', emoji: '📊' },
  { key: 'academic', label: '学术', emoji: '🎓' },
  { key: 'daily', label: '日常', emoji: '☕' },
]

export default function Dialogue() {
  const [phase, setPhase] = useState<'select' | 'chat'>('select')
  const [scenario, setScenario] = useState<Scenario>('interview')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(false)
  const [score, setScore] = useState<any>(null)

  const handleStart = async (s: Scenario) => {
    setScenario(s)
    setMessages([])
    setScore(null)
    setLoading(true)
    try {
      const resp = await fetch(`${API_BASE}/api/ai/dialogue/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: 'demo-user', scenario: s, level: 'B2' }),
      })
      const data = await resp.json()
      setSessionId(data.session_id)
      setMessages([{ role: 'assistant', content: data.opening }])
      setPhase('chat')
    } catch (e) {
      Taro.showToast({ title: '启动失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  const handleSend = async () => {
    if (!inputText.trim() || !sessionId) return
    const userMsg: Message = { role: 'user', content: inputText }
    setMessages((prev) => [...prev, userMsg])
    setInputText('')
    setLoading(true)
    try {
      const resp = await fetch(`${API_BASE}/api/ai/dialogue/turn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, user_text: userMsg.content }),
      })
      const data = await resp.json()
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.assistant_text, corrections: data.corrections },
      ])
    } catch (e) {
      Taro.showToast({ title: '发送失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  const handleFinish = async () => {
    if (!sessionId) return
    setLoading(true)
    try {
      const resp = await fetch(`${API_BASE}/api/ai/dialogue/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, transcript: messages }),
      })
      setScore(await resp.json())
    } catch (e) {
      Taro.showToast({ title: '评估失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  if (phase === 'select' || score) {
    return (
      <ScrollView style={{ minHeight: '100vh', backgroundColor: colors.bg.page, padding: spacing.xl }}>
        <Text style={{ fontSize: 28, fontWeight: 600, marginBottom: spacing.xs, display: 'block' }}>
          AI 口语陪练
        </Text>
        <Text style={{ ...typography.body, color: colors.ink[500], marginBottom: spacing.xl, display: 'block' }}>
          选择场景，开始 5 分钟英语对话练习
        </Text>

        {score && (
          <Card elevated>
            <Text style={{ fontSize: 17, fontWeight: 600, marginBottom: spacing.md, display: 'block' }}>
              本次对话评分
            </Text>
            <Text style={{ fontSize: 48, fontWeight: 600, textAlign: 'center', display: 'block' }}>
              {Math.round(score.overall_score)}
            </Text>
            <Text style={{ fontSize: 13, color: colors.ink[500], textAlign: 'center', display: 'block', marginBottom: spacing.lg }}>
              总分
            </Text>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <ScoreItem label="发音" value={score.pronunciation} />
              <ScoreItem label="语法" value={score.grammar} />
              <ScoreItem label="词汇" value={score.vocabulary} />
              <ScoreItem label="流利度" value={score.fluency} />
            </View>
          </Card>
        )}

        {SCENARIOS.map((s) => (
          <Card key={s.key} onClick={() => handleStart(s.key)}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontSize: 32, marginRight: spacing.md }}>{s.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 17, fontWeight: 600, display: 'block' }}>{s.label}</Text>
                <Text style={{ ...typography.caption, color: colors.ink[500], display: 'block' }}>
                  AI 教练 · 即时纠错 · 综合评分
                </Text>
              </View>
              <Text style={{ color: colors.ink[500], fontSize: 20 }}>›</Text>
            </View>
          </Card>
        ))}
      </ScrollView>
    )
  }

  return (
    <View style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: colors.bg.page }}>
      <View style={{ padding: spacing.lg, backgroundColor: colors.bg.card, borderBottomWidth: 1, borderBottomColor: colors.ink[100] }}>
        <Text style={{ fontSize: 14, color: colors.ink[500] }}>
          {SCENARIOS.find((s) => s.key === scenario)?.emoji}{' '}
          {SCENARIOS.find((s) => s.key === scenario)?.label}
        </Text>
      </View>

      <ScrollView style={{ flex: 1, padding: spacing.lg }} scrollY>
        {messages.map((m, idx) => (
          <View
            key={idx}
            style={{
              marginBottom: spacing.md,
              alignItems: m.role === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            <View
              style={{
                maxWidth: '80%',
                padding: spacing.md,
                borderRadius: radius.md,
                backgroundColor: m.role === 'user' ? colors.ink[900] : colors.bg.card,
              }}
            >
              <Text
                style={{
                  color: m.role === 'user' ? '#ffffff' : colors.ink[900],
                  fontSize: 15,
                  lineHeight: 1.6,
                  display: 'block',
                }}
              >
                {m.content}
              </Text>
            </View>
            {m.corrections && m.corrections.length > 0 && (
              <View
                style={{
                  marginTop: spacing.xs,
                  padding: spacing.sm,
                  backgroundColor: '#fffbeb',
                  borderRadius: radius.sm,
                  maxWidth: '80%',
                }}
              >
                {m.corrections.map((c, i) => (
                  <Text key={i} style={{ fontSize: 12, color: '#b45309', display: 'block' }}>
                    ⚠️ {c}
                  </Text>
                ))}
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      <View style={{ padding: spacing.lg, backgroundColor: colors.bg.card, borderTopWidth: 1, borderTopColor: colors.ink[100] }}>
        <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
          <Input
            value={inputText}
            onInput={(e) => setInputText(e.detail.value)}
            placeholder="说点什么..."
            style={{
              flex: 1,
              padding: `${spacing.sm}px ${spacing.md}px`,
              backgroundColor: colors.ink[50],
              borderRadius: radius.md,
              fontSize: 14,
            }}
            disabled={loading}
          />
          <Button onClick={handleSend} disabled={loading || !inputText.trim()}>
            发送
          </Button>
        </View>
        <View style={{ marginTop: spacing.md, alignItems: 'center' }}>
          <Text onClick={handleFinish} style={{ color: colors.ink[500], fontSize: 13 }}>
            结束对话并评分
          </Text>
        </View>
      </View>
    </View>
  )
}

function ScoreItem({ label, value }: { label: string; value: number }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', padding: spacing.sm, backgroundColor: colors.ink[50], borderRadius: radius.sm }}>
      <Text style={{ fontSize: 18, fontWeight: 600 }}>{Math.round(value)}</Text>
      <Text style={{ fontSize: 11, color: colors.ink[500], marginTop: 2 }}>{label}</Text>
    </View>
  )
}