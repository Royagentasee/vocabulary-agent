import { useState, useEffect } from 'react'
import { View, Text, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { enableDemoMode, disableDemoMode, isDemoMode } from '@/services/demoData'
import { useT } from '@/i18n'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { colors, radius, spacing } from '@/styles/tokens'

export default function Me() {
  const t = useT()
  const [demoMode, setDemoMode] = useState(false)

  useEffect(() => {
    setDemoMode(isDemoMode())
  }, [])

  const handleOpenAgreement = () => {
    Taro.navigateTo({ url: '/pages/legal/user-agreement' })
  }

  const handleOpenPrivacy = () => {
    Taro.navigateTo({ url: '/pages/legal/privacy-policy' })
  }

  const handleFeedback = () => {
    Taro.showModal({
      title: t.me.feedback,
      content: 'support@vocabulary-agent.com',
      showCancel: false,
    })
  }

  const handleAbout = () => {
    Taro.showModal({
      title: t.me.about,
      content: t.me.aboutContent,
      showCancel: false,
    })
  }

  const handleToggleDemo = () => {
    if (demoMode) {
      Taro.showModal({
        title: t.me.demoMode,
        content: t.me.demoOff + '?',
        success: (res) => {
          if (res.confirm) {
            disableDemoMode()
            setDemoMode(false)
          }
        },
      })
    } else {
      enableDemoMode()
      setDemoMode(true)
    }
  }

  return (
    <View style={{ minHeight: '100vh', backgroundColor: colors.bg.page, padding: spacing.xl }}>
      <Text style={{ fontSize: 28, fontWeight: 600, marginBottom: spacing.xl, display: 'block' }}>
        {t.me.title}
      </Text>

      <View
        style={{
          backgroundColor: colors.bg.card,
          borderRadius: radius.lg,
          padding: spacing.xxl,
          alignItems: 'center',
          marginBottom: spacing.lg,
        }}
      >
        <View
          style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: colors.ink[900],
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: spacing.lg,
          }}
        >
          <Text style={{ color: '#ffffff', fontSize: 32 }}>👤</Text>
        </View>
        <Text style={{ fontSize: 18, fontWeight: 600, display: 'block' }}>User</Text>
        <Text style={{ fontSize: 13, color: colors.ink[500], marginTop: spacing.xs, display: 'block' }}>
          {t.me.loginPrompt}
        </Text>
        <Button
          style={{
            marginTop: spacing.lg,
            backgroundColor: colors.ink[900],
            color: '#ffffff',
            borderRadius: radius.md,
            padding: `10px 24px`,
            fontSize: 14,
          }}
        >
          {t.me.login}
        </Button>
      </View>

      <View style={{ backgroundColor: colors.bg.card, borderRadius: radius.lg, overflow: 'hidden' }}>
        <RowItem label={t.me.agreement} onClick={handleOpenAgreement} />
        <RowItem label={t.me.privacy} onClick={handleOpenPrivacy} />
        <LanguageSwitcher />
        <RowItem
          label={t.me.demoMode}
          value={demoMode ? t.me.demoOn : t.me.demoOff}
          onClick={handleToggleDemo}
        />
        <RowItem label={t.me.feedback} onClick={handleFeedback} />
        <RowItem label={t.me.about} onClick={handleAbout} last />
      </View>
    </View>
  )
}

function RowItem({
  label,
  value,
  onClick,
  last,
}: {
  label: string
  value?: string
  onClick?: () => void
  last?: boolean
}) {
  return (
    <View
      onClick={onClick}
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: spacing.lg,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: colors.ink[100],
      }}
    >
      <Text>{label}</Text>
      <Text style={{ color: colors.ink[500] }}>{value ?? '›'}</Text>
    </View>
  )
}