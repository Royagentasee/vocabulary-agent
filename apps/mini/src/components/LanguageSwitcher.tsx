import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { setLocale, useT, SUPPORTED_LOCALES } from '@/i18n'
import { colors, radius, spacing } from '@/styles/tokens'

export function LanguageSwitcher() {
  const t = useT()

  const handleSwitch = () => {
    Taro.showActionSheet({
      itemList: SUPPORTED_LOCALES.map((l) => l.label),
      success: (res) => {
        const choice = SUPPORTED_LOCALES[res.tapIndex]
        if (choice) setLocale(choice.code)
      },
    })
  }

  return (
    <View
      onClick={handleSwitch}
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.ink[100],
      }}
    >
      <Text>{t.me.language}</Text>
      <Text style={{ color: colors.ink[500] }}>
        {SUPPORTED_LOCALES.find((l) => l.code === (Taro.getStorageSync('vocab-agent-locale') || 'zh-CN'))?.label}
        {' ›'}
      </Text>
    </View>
  )
}