import { View, Text, ScrollView, Pressable } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../../App'
import { fetchWordbooks, fetchWords } from '../services/words'
import { setWordbook } from '../stores/learnStore'

type Props = NativeStackScreenProps<RootStackParamList, 'Wordbooks'>

export function WordbooksScreen({ navigation }: Props) {
  const wordbooks = fetchWordbooks()

  const handleSelect = async (id: string) => {
    const words = await fetchWords()
    await setWordbook(id, words)
    navigation.navigate('Review')
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#f7f7f8' }} contentContainerStyle={{ padding: 24 }}>
      <Text style={{ fontSize: 22, fontWeight: '600', marginBottom: 4 }}>选择词书</Text>
      <Text style={{ fontSize: 13, color: '#6b7280', marginBottom: 24 }}>
        选好后即可开始今日复习
      </Text>

      {wordbooks.map((wb) => (
        <Pressable
          key={wb.id}
          onPress={() => handleSelect(wb.id)}
          style={({ pressed }) => [
            {
              backgroundColor: '#ffffff',
              borderRadius: 16,
              padding: 20,
              marginBottom: 12,
              borderWidth: 1,
              borderColor: '#eeeef0',
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 8,
              backgroundColor: wb.coverColor,
              marginBottom: 12,
            }}
          />
          <Text style={{ fontSize: 17, fontWeight: '600' }}>{wb.name}</Text>
          <Text style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>{wb.description}</Text>
          <Text style={{ fontSize: 11, color: '#6b7280', marginTop: 8 }}>
            {wb.wordCount.toLocaleString()} 词 · {wb.examTag}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  )
}