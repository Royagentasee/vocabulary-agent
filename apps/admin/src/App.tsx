import { useEffect, useState } from 'react'
import { Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom'
import { Layout, Menu, Spin } from 'antd'
import {
  DashboardOutlined,
  BookOutlined,
  UserOutlined,
  BarChartOutlined,
  LineChartOutlined,
  SettingOutlined,
  LogoutOutlined,
} from '@ant-design/icons'
import { Dashboard } from './pages/Dashboard'
import { Wordbooks } from './pages/Wordbooks'
import { Users } from './pages/Users'
import { Analytics } from './pages/Analytics'
import { AdvancedAnalytics } from './pages/AdvancedAnalytics'
import { Settings } from './pages/Settings'
import { Login } from './pages/Login'
import { api, getAuthToken, setAuthToken } from './services/api'

const { Sider, Header, Content } = Layout

export default function App() {
  const navigate = useNavigate()
  const [authChecked, setAuthChecked] = useState(false)
  const [authenticated, setAuthenticated] = useState(false)

  useEffect(() => {
    const token = getAuthToken()
    if (!token) {
      setAuthChecked(true)
      return
    }
    api.auth.me()
      .then(() => setAuthenticated(true))
      .catch(() => setAuthToken(null))
      .finally(() => setAuthChecked(true))
  }, [])

  if (!authChecked) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!authenticated) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  const handleLogout = () => {
    setAuthToken(null)
    navigate('/login')
  }

  return (
    <Layout className="va-admin-layout">
      <Sider theme="light" width={220} style={{ borderRight: '1px solid #eeeef0' }}>
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 600,
            fontSize: 16,
            borderBottom: '1px solid #eeeef0',
          }}
        >
          <span style={{ background: '#111', color: '#fff', padding: '4px 10px', borderRadius: 8, marginRight: 8 }}>
            V
          </span>
          Admin
        </div>
        <Menu
          mode="inline"
          defaultSelectedKeys={['dashboard']}
          style={{ borderRight: 0 }}
          items={[
            { key: 'dashboard', icon: <DashboardOutlined />, label: <NavLink to="/dashboard">概览</NavLink> },
            { key: 'wordbooks', icon: <BookOutlined />, label: <NavLink to="/wordbooks">词书管理</NavLink> },
            { key: 'users', icon: <UserOutlined />, label: <NavLink to="/users">用户管理</NavLink> },
            { key: 'analytics', icon: <BarChartOutlined />, label: <NavLink to="/analytics">数据分析</NavLink> },
            { key: 'advanced', icon: <LineChartOutlined />, label: <NavLink to="/advanced">高级分析</NavLink> },
            { key: 'settings', icon: <SettingOutlined />, label: <NavLink to="/settings">系统设置</NavLink> },
          ]}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            background: '#fff',
            padding: '0 24px',
            borderBottom: '1px solid #eeeef0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Vocabulary Agent · 后台</h2>
          <span onClick={handleLogout} style={{ cursor: 'pointer', color: '#6b7280' }}>
            <LogoutOutlined /> 退出
          </span>
        </Header>
        <Content style={{ padding: 24 }}>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/wordbooks" element={<Wordbooks />} />
            <Route path="/users" element={<Users />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/advanced" element={<AdvancedAnalytics />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  )
}