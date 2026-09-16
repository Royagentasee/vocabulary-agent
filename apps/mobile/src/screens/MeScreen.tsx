import { View, Text, ScrollView, Pressable, Alert } from 'react-native'

export function MeScreen() {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#f7f7f8' }} contentContainerStyle={{ padding: 24 }}>
      <View style={{ backgroundColor: '#ffffff', borderRadius: 16, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: '#eeeef0' }}>
        <View
          style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: '#111111',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
          }}
        >
          <Text style={{ color: '#ffffff', fontSize: 32 }}>👤</Text>
        </View>
        <Text style={{ fontSize: 18, fontWeight: '600' }}>用户</Text>
        <Text style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>登录后可同步学习数据</Text>
      </View>

      <View style={{ backgroundColor: '#ffffff', borderRadius: 16, marginTop: 12, borderWidth: 1, borderColor: '#eeeef0' }}>
        <RowItem label="用户协议" onPress={() => Alert.alert('用户协议')} />
        <RowItem label="隐私政策" onPress={() => Alert.alert('隐私政策')} />
        <RowItem label="意见反馈" onPress={() => Alert.alert('请发送邮件至 support@vocabulary-agent.com')} />
        <RowItem label="关于" onPress={() => Alert.alert('Vocabulary Agent v0.1.0\n© 2026')} />
      </View>
    </ScrollView>
  )
}

function RowItem({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eeeef0',
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Text>{label}</Text>
      <Text style={{ color: '#6b7280' }}>›</Text>
    </Pressable>
  )
}