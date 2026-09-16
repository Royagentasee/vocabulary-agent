import { View, Text } from '@tarojs/components'

const AGREEMENT = `
欢迎使用 Vocabulary Agent（以下简称"本服务"）。

## 1. 服务说明
Vocabulary Agent 是一款基于 AI 技术的英语单词学习工具，覆盖雅思、托福、GRE、SAT 等高阶英语考试备考场景。

## 2. 账号与注册
你可通过微信账号授权登录本服务。账号被盗用造成的损失由你自行承担。

## 3. 用户行为规范
你不得利用本服务从事违法违规活动，不得侵犯他人合法权益。

## 4. 知识产权
本服务的代码、界面、数据等内容，其知识产权归运营方所有。词条内容来源于开源词典（ECDICT，GPL-3.0）和考试语料库。

## 5. 隐私保护
请参阅《隐私政策》。

## 6. 服务变更与终止
本服务有权根据业务发展需要修改或终止服务功能。

## 7. 免责条款
本服务按"现状"提供，不对服务的及时性、安全性、准确性作任何明示或暗示的保证。

## 8. 争议解决
本协议适用中华人民共和国法律。

## 9. 联系我们
邮箱：support@vocabulary-agent.com

最后更新：2026 年 X 月 X 日
`

export default function UserAgreement() {
  return (
    <View className="container">
      <Text style={{ fontSize: '20px', fontWeight: 600, display: 'block', marginBottom: '16px' }}>
        用户协议
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
        <Text>{AGREEMENT}</Text>
      </View>
    </View>
  )
}