import { useState, useEffect } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { fetchWordbooks, fetchWords } from '@/services/words'
import { setWordbook } from '@/stores/learnStore'

export default function Wordbooks() {
  const [wordbooks, setWordbooks] = useState<any[]>([])

  useEffect(() => {
    fetchWordbooks().then(setWordbooks)
  }, [])

  const handleSelect = async (id: string) => {
    const words = await fetchWords()
    await setWordbook(id, words)
    Taro.navigateTo({ url: '/pages/review/index' })
  }

  return (
    <View className="container">
      <Text className="title">选择词书</Text>
      <Text className="subtitle">选好后即可开始今日复习</Text>

      {wordbooks.map((wb) => (
        <View
          key={wb.id}
          className="card"
          onClick={() => handleSelect(wb.id)}
          style={{ cursor: 'pointer' }}
        >
          <View
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              backgroundColor: wb.coverColor,
              marginBottom: '12px',
            }}
          />
          <Text style={{ fontSize: '17px', fontWeight: 600 }}>{wb.name}</Text>
          <View style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
            {wb.description}
          </View>
          <View style={{ fontSize: '11px', color: '#6b7280', marginTop: '8px' }}>
            {wb.wordCount.toLocaleString()} 词 · {wb.examTag}
          </View>
        </View>
      ))}
    </View>
  )
}