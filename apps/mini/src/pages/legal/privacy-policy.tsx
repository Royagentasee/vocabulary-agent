import { View, Text } from '@tarojs/components'

const POLICY = `
Vocabulary Agent（以下简称"我们"）深知个人信息对你的重要性。

## 1. 我们收集的信息
- 你主动提供：微信昵称、头像、学习记录、学习目标
- 自动收集：设备信息、日志信息（30 天）

## 2. 信息使用
仅用于：提供学习服务、改进质量、安全保障、响应反馈。

## 3. 信息共享
- 微信平台：登录鉴权
- DeepSeek：AI 单词解释（不用于训练）
- 阿里云/腾讯云：数据托管

## 4. 信息存储
- 地点：中国大陆境内
- 加密：TLS 1.2+ / AES-256

## 5. 你的权利
查看、更正、撤回同意、注销账号（"我的 → 注销账号"）。

## 6. 未成年人保护
面向 14 周岁及以上用户。

## 7. AI 数据特别说明
输入的单词/上下文会发送给 DeepSeek 生成解释，不会用于模型训练。

## 8. 政策更新
重大变更通过应用内通知告知。

## 9. 联系我们
邮箱：privacy@vocabulary-agent.com

最后更新：2026 年 X 月 X 日
`

export default function PrivacyPolicy() {
  return (
    <View className="container">
      <Text style={{ fontSize: '20px', fontWeight: 600, display: 'block', marginBottom: '16px' }}>
        隐私政策
      </Text>
      <View
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '20px',
          fontSize: '14px',
          lineHeight: '1.8',
          whiteSpace: 'pre-wrap',
        }}
      >
        <Text>{POLICY}</Text>
      </View>
    </View>
  )
}