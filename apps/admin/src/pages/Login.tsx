import { useState } from 'react'
import { Form, Input, Button, Card, message } from 'antd'
import { useNavigate } from 'react-router-dom'
import { api, setAuthToken } from '../services/api'

export function Login() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  const onFinish = async (values: { email: string; password: string }) => {
    setLoading(true)
    try {
      const result = await api.auth.login(values.email, values.password)
      setAuthToken(result.access_token)
      message.success('登录成功')
      navigate('/dashboard')
    } catch (e: any) {
      message.error(e.message || '登录失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f5f5f7',
      }}
    >
      <Card style={{ width: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: '#111',
              color: '#fff',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 600,
              fontSize: 24,
              marginBottom: 12,
            }}
          >
            V
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Vocabulary Agent</h1>
          <p style={{ color: '#6b7280', fontSize: 13, margin: '4px 0 0' }}>管理后台</p>
        </div>

        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item label="邮箱" name="email" rules={[{ required: true, type: 'email' }]}>
            <Input placeholder="admin@vocabulary-agent.com" />
          </Form.Item>
          <Form.Item label="密码" name="password" rules={[{ required: true, min: 6 }]}>
            <Input.Password placeholder="••••••" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              登录
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}