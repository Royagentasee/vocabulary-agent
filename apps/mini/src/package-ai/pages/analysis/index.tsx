// 错因分析页面（分包：package-ai/pages/analysis）
// 内容与主包一致，分包路径在 app.config.ts 中声明
import { useState } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useLearnState } from '@/stores/useLearnState'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { colors, spacing, typography, radius } from '@/styles/tokens'

const API_BASE = 'https://your-ai-gateway-domain.com'

interface MistakeRecord {
  headword: string
  rating: 1 | 2 | 3 | 4
  timestamp: string
  review_count: number
}

interface AnalysisResult {
  summary: string
  categories: Array<{ category: string; count: number; examples: string[] }>
  suggestions: string[]
  strengths: string[]
}

export default function Analysis() {
  const { wrongWords } = useLearnState()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleAnalyze = async () => {
    if (wrongWords.length === 0) {
      Taro.showToast({ title: '暂无错题数据', icon: 'none' })
      return
    }
    setLoading(true)
    setError(null)
    try {
      const records: MistakeRecord[] = wrongWords.map((w) => ({
        headword: w.headword,
        rating: 1,
        timestamp: new Date().toISOString(),
        review_count: 1,
      }))
      const resp = await fetch(`${API_BASE}/api/ai/analyze-mistake`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: 'demo-user', records, language: 'zh-CN' }),
      })
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      setResult(await resp.json())
    } catch (e: any) {
      setError(e.message || '分析失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScrollView style={{ minHeight: '100vh', backgroundColor: colors.bg.page, padding: spacing.xl }}>
      <Text style={{ fontSize: 28, fontWeight: 600, marginBottom: spacing.xs, display: 'block' }}>
        错因分析报告
      </Text>
      <Text style={{ ...typography.body, color: colors.ink[500], marginBottom: spacing.xl, display: 'block' }}>
        AI 分析你的错题模式，给出针对性建议
      </Text>

      <Card>
        <Text style={{ fontSize: 17, fontWeight: 600, display: 'block' }}>错题数据</Text>
        <Text style={{ ...typography.caption, color: colors.ink[500], marginTop: spacing.xs, display: 'block' }}>
          已收集 {wrongWords.length} 个错题
        </Text>
        <Button block onClick={handleAnalyze} disabled={loading} style={{ marginTop: spacing.lg }}>
          {loading ? 'AI 分析中...' : '✨ 生成分析报告'}
        </Button>
        {error && (
          <Text style={{ color: colors.danger, fontSize: 13, marginTop: spacing.sm, display: 'block' }}>
            {error}
          </Text>
        )}
      </Card>

      {result && (
        <>
          <Card elevated>
            <Text style={{ fontSize: 11, color: colors.ink[500], textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: spacing.sm, display: 'block' }}>
              总览
            </Text>
            <Text style={{ fontSize: 16, lineHeight: 1.7, color: colors.ink[900], display: 'block' }}>
              {result.summary}
            </Text>
          </Card>

          {result.categories.length > 0 && (
            <Card>
              <Text style={{ fontSize: 17, fontWeight: 600, marginBottom: spacing.lg, display: 'block' }}>
                错误分类
              </Text>
              {result.categories.map((cat, idx) => (
                <View
                  key={idx}
                  style={{
                    paddingVertical: spacing.md,
                    borderBottomWidth: idx < result.categories.length - 1 ? 1 : 0,
                    borderBottomColor: colors.ink[100],
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontWeight: 600 }}>{cat.category}</Text>
                    <View
                      style={{
                        backgroundColor: colors.accent.soft,
                        color: colors.accent.deep,
                        paddingHorizontal: spacing.sm,
                        paddingVertical: 2,
                        borderRadius: radius.full,
                        fontSize: 12,
                      }}
                    >
                      <Text style={{ color: colors.accent.deep }}>{cat.count}</Text>
                    </View>
                  </View>
                  {cat.examples.length > 0 && (
                    <Text style={{ ...typography.caption, color: colors.ink[500], marginTop: spacing.xs, display: 'block' }}>
                      例：{cat.examples.join('、')}
                    </Text>
                  )}
                </View>
              ))}
            </Card>
          )}

          {result.suggestions.length > 0 && (
            <Card elevated>
              <Text style={{ fontSize: 17, fontWeight: 600, marginBottom: spacing.lg, display: 'block' }}>
                💡 针对性建议
              </Text>
              {result.suggestions.map((s, idx) => (
                <View key={idx} style={{ flexDirection: 'row', marginBottom: spacing.md, alignItems: 'flex-start' }}>
                  <Text style={{ color: colors.accent.DEFAULT, marginRight: spacing.sm }}>{idx + 1}.</Text>
                  <Text style={{ flex: 1, lineHeight: 1.7 }}>{s}</Text>
                </View>
              ))}
            </Card>
          )}
        </>
      )}
    </ScrollView>
  )
}