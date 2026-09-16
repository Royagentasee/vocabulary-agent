import { View, Text, ScrollView, Pressable } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../../App'
import { useLearnState } from '../stores/useLearnState'

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>

export function HomeScreen({ navigation }: Props) {
  const { todayLearned, todayReviewed, wrongWords } = useLearnState()

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#f7f7f8' }} contentContainerStyle={{ padding: 24 }}>
      <Text style={{ fontSize: 28, fontWeight: '600', marginBottom: 8 }}>你好，今天学一会儿 👋</Text>
      <Text style={{ fontSize: 14, color: '#6b7280', marginBottom: 24 }}>
        AI 陪伴，考点驱动，让每一个单词都记得更牢。
      </Text>

      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
        <StatCard label="今日新词" value={todayLearned} />
        <StatCard label="今日复习" value={todayReviewed} />
        <StatCard label="错词本" value={wrongWords.length} />
      </View>

      <Pressable
        onPress={() => navigation.navigate('Wordbooks')}
        style={({ pressed }) => [
          styles.card,
          pressed && { opacity: 0.7 },
        ]}
      >
        <Text style={styles.cardTitle}>选词书开始</Text>
        <Text style={styles.cardSubtitle}>从 GRE / 雅思 / 托福高频词库中选择</Text>
      </Pressable>

      <Pressable
        onPress={() => navigation.navigate('Review')}
        style={({ pressed }) => [styles.card, pressed && { opacity: 0.7 }]}
      >
        <Text style={styles.cardTitle}>继续复习</Text>
        <Text style={styles.cardSubtitle}>FSRS 智能调度，到期卡片依次复现</Text>
      </Pressable>

      <Pressable
        onPress={() => navigation.navigate('Practice')}
        style={({ pressed }) => [styles.card, pressed && { opacity: 0.7 }]}
      >
        <Text style={styles.cardTitle}>专项练习</Text>
        <Text style={styles.cardSubtitle}>拼写听写 / 例句填空 / 看英忆中</Text>
      </Pressable>

      <Pressable
        onPress={() => navigation.navigate('Stats')}
        style={({ pressed }) => [styles.card, pressed && { opacity: 0.7 }]}
      >
        <Text style={styles.cardTitle}>学习报告</Text>
        <Text style={styles.cardSubtitle}>查看今日进度、记忆曲线</Text>
      </Pressable>
    </ScrollView>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <View style={[styles.card, styles.statCard, { flex: 1 }]}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

const styles = {
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#eeeef0',
  },
  cardTitle: { fontSize: 17, fontWeight: '600' as const },
  cardSubtitle: { fontSize: 13, color: '#6b7280', marginTop: 4 },
  statCard: { alignItems: 'center' as const },
  statValue: { fontSize: 28, fontWeight: '600' as const },
  statLabel: { fontSize: 12, color: '#6b7280', marginTop: 4 },
}