import { View, Text, ScrollView } from 'react-native'
import { useLearnState } from '../stores/useLearnState'

export function StatsScreen() {
  const { todayLearned, todayReviewed, wrongWords, queue } = useLearnState()
  const total = queue.length
  const progress = total > 0 ? Math.round((todayReviewed / total) * 100) : 0

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#f7f7f8' }} contentContainerStyle={{ padding: 24 }}>
      <Text style={{ fontSize: 22, fontWeight: '600', marginBottom: 4 }}>学习报告</Text>
      <Text style={{ fontSize: 13, color: '#6b7280', marginBottom: 24 }}>FSRS 帮你调度每一次复习</Text>

      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
        <Card style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ fontSize: 28, fontWeight: '600' }}>{todayLearned}</Text>
          <Text style={{ fontSize: 12, color: '#6b7280' }}>今日新词</Text>
        </Card>
        <Card style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ fontSize: 28, fontWeight: '600' }}>{todayReviewed}</Text>
          <Text style={{ fontSize: 12, color: '#6b7280' }}>今日复习</Text>
        </Card>
        <Card style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ fontSize: 28, fontWeight: '600' }}>{wrongWords.length}</Text>
          <Text style={{ fontSize: 12, color: '#6b7280' }}>错词本</Text>
        </Card>
      </View>

      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
          <Text style={{ fontWeight: '600' }}>完成进度</Text>
          <Text style={{ fontSize: 14, color: '#6b7280' }}>{progress}%</Text>
        </View>
        <View style={{ width: '100%', height: 8, backgroundColor: '#eeeef0', borderRadius: 4, overflow: 'hidden' }}>
          <View style={{ height: '100%', backgroundColor: '#111111', width: `${progress}%` }} />
        </View>
      </Card>

      {wrongWords.length > 0 && (
        <Card>
          <Text style={{ fontWeight: '600', marginBottom: 12 }}>错词本</Text>
          {wrongWords.map((w) => (
            <View
              key={w.id}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                paddingVertical: 8,
                borderBottomWidth: 1,
                borderBottomColor: '#eeeef0',
              }}
            >
              <Text style={{ fontFamily: 'monospace' }}>{w.headword}</Text>
              <Text style={{ color: '#6b7280', fontSize: 13 }}>{w.senses.map((s) => s.definitionCn).join('；')}</Text>
            </View>
          ))}
        </Card>
      )}
    </ScrollView>
  )
}

function Card({ children, style }: { children: React.ReactNode; style?: any }) {
  return (
    <View
      style={[
        {
          backgroundColor: '#ffffff',
          borderRadius: 16,
          padding: 20,
          marginBottom: 12,
          borderWidth: 1,
          borderColor: '#eeeef0',
        },
        style,
      ]}
    >
      {children}
    </View>
  )
}