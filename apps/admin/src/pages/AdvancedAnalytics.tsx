import { useEffect, useState } from 'react'
import { Row, Col, Select, Card, Tag } from 'antd'
import ReactECharts from 'echarts-for-react'
import { api } from '../services/api'

interface FunnelStage {
  name: string
  count: number
  conversion: number
}

interface CohortRow {
  cohort: string
  size: number
  retention: Array<{ week: number; rate: number; active_users: number }>
}

interface AdoptionItem {
  feature: string
  used: number
  eligible_users: number
  adoption_rate: number
}

interface RevenueMonth {
  month: string
  revenue: number
  paying: number
}

export function AdvancedAnalytics() {
  const [funnel, setFunnel] = useState<FunnelStage[]>([])
  const [cohorts, setCohorts] = useState<CohortRow[]>([])
  const [adoption, setAdoption] = useState<AdoptionItem[]>([])
  const [revenue, setRevenue] = useState<any>(null)
  const [days, setDays] = useState(30)

  useEffect(() => {
    api.analytics.funnel(days).then((r) => setFunnel(r.stages))
    api.analytics.cohortRetention(8).then(setCohorts)
    api.analytics.featureAdoption().then(setAdoption)
    api.analytics.revenue(6).then(setRevenue)
  }, [days])

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, margin: 0 }}>高级分析</h1>
        <Select
          value={days}
          onChange={setDays}
          options={[
            { value: 7, label: '近 7 天' },
            { value: 30, label: '近 30 天' },
            { value: 90, label: '近 90 天' },
          ]}
        />
      </div>

      <Row gutter={16}>
        {/* 转化漏斗 */}
        <Col span={12}>
          <div className="va-stat-card">
            <h3>用户转化漏斗</h3>
            <ReactECharts
              option={{
                tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
                series: [{
                  name: '用户转化',
                  type: 'funnel',
                  left: '10%',
                  width: '80%',
                  label: {
                    formatter: '{b}: {c}',
                  },
                  itemStyle: { borderColor: '#fff', borderWidth: 1 },
                  data: funnel.map((s) => ({ name: s.name, value: s.count })),
                }],
              }}
              style={{ height: 350 }}
            />
          </div>
        </Col>

        {/* 营收 */}
        <Col span={12}>
          <div className="va-stat-card">
            <h3>月度营收</h3>
            {revenue && (
              <>
                <Row gutter={16} style={{ marginBottom: 16 }}>
                  <Col span={8}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 24, fontWeight: 600 }}>¥ {revenue.total_revenue.toLocaleString()}</div>
                      <div style={{ fontSize: 12, color: '#6b7280' }}>总营收</div>
                    </div>
                  </Col>
                  <Col span={8}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 24, fontWeight: 600 }}>{revenue.paying_users}</div>
                      <div style={{ fontSize: 12, color: '#6b7280' }}>付费用户</div>
                    </div>
                  </Col>
                  <Col span={8}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 24, fontWeight: 600 }}>¥ {revenue.arpu}</div>
                      <div style={{ fontSize: 12, color: '#6b7280' }}>ARPU</div>
                    </div>
                  </Col>
                </Row>
                <ReactECharts
                  option={{
                    tooltip: { trigger: 'axis' },
                    xAxis: { type: 'category', data: revenue.monthly.map((m: RevenueMonth) => m.month) },
                    yAxis: { type: 'value' },
                    series: [{
                      name: '营收',
                      data: revenue.monthly.map((m: RevenueMonth) => m.revenue),
                      type: 'bar',
                      itemStyle: { color: '#3b82f6' },
                    }],
                  }}
                  style={{ height: 200 }}
                />
              </>
            )}
          </div>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginTop: 16 }}>
        {/* 同期群留存热力图 */}
        <Col span={24}>
          <div className="va-stat-card">
            <h3>同期群留存（Cohort Retention）</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr>
                    <th style={{ padding: 8, textAlign: 'left' }}>同期群</th>
                    <th style={{ padding: 8 }}>用户数</th>
                    {Array.from({ length: 8 }).map((_, i) => (
                      <th key={i} style={{ padding: 8 }}>W{i}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cohorts.map((c) => (
                    <tr key={c.cohort}>
                      <td style={{ padding: 8 }}>{c.cohort}</td>
                      <td style={{ padding: 8, textAlign: 'center' }}>{c.size}</td>
                      {Array.from({ length: 8 }).map((_, i) => {
                        const cell = c.retention[i]
                        const rate = cell?.rate ?? 0
                        const opacity = rate / 100
                        return (
                          <td
                            key={i}
                            style={{
                              padding: 8,
                              textAlign: 'center',
                              backgroundColor: `rgba(59, 130, 246, ${opacity})`,
                              color: rate > 50 ? '#fff' : '#111',
                            }}
                          >
                            {cell ? `${rate}%` : '—'}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginTop: 16 }}>
        {/* 功能渗透率 */}
        <Col span={12}>
          <div className="va-stat-card">
            <h3>功能渗透率</h3>
            <div>
              {adoption.map((a) => (
                <div key={a.feature} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontWeight: 500 }}>{a.feature}</span>
                    <span>
                      <Tag color={a.adoption_rate > 50 ? 'success' : a.adoption_rate > 20 ? 'processing' : 'default'}>
                        {a.adoption_rate.toFixed(1)}%
                      </Tag>
                    </span>
                  </div>
                  <div style={{ width: '100%', height: 8, background: '#eeeef0', borderRadius: 4, overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${a.adoption_rate}%`,
                        background: a.adoption_rate > 50 ? '#10b981' : a.adoption_rate > 20 ? '#3b82f6' : '#6b7280',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Col>

        {/* 留存曲线 */}
        <Col span={12}>
          <div className="va-stat-card">
            <h3>留存曲线</h3>
            <ReactECharts
              option={{
                tooltip: { trigger: 'axis' },
                xAxis: {
                  type: 'category',
                  data: ['1d', '3d', '7d', '14d', '30d', '60d', '90d'],
                },
                yAxis: { type: 'value', max: 100, name: '%' },
                series: [{
                  name: '留存率',
                  data: [70, 55, 42, 35, 28, 22, 18],
                  type: 'line',
                  smooth: true,
                  areaStyle: { opacity: 0.3 },
                  itemStyle: { color: '#10b981' },
                  label: { show: true, formatter: '{c}%' },
                }],
              }}
              style={{ height: 300 }}
            />
          </div>
        </Col>
      </Row>
    </div>
  )
}