import { Row, Col } from 'antd'
import ReactECharts from 'echarts-for-react'

export function Dashboard() {
  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 24 }}>数据概览</h1>

      <Row gutter={16}>
        <Col span={6}>
          <div className="va-stat-card">
            <div className="va-stat-value">1,247</div>
            <div className="va-stat-label">注册用户</div>
          </div>
        </Col>
        <Col span={6}>
          <div className="va-stat-card">
            <div className="va-stat-value">8,592</div>
            <div className="va-stat-label">今日复习卡片</div>
          </div>
        </Col>
        <Col span={6}>
          <div className="va-stat-card">
            <div className="va-stat-value">68%</div>
            <div className="va-stat-label">复习完成率</div>
          </div>
        </Col>
        <Col span={6}>
          <div className="va-stat-card">
            <div className="va-stat-value">¥ 12.4K</div>
            <div className="va-stat-label">本月营收</div>
          </div>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginTop: 24 }}>
        <Col span={16}>
          <div className="va-stat-card">
            <h3 style={{ marginTop: 0 }}>近 30 天活跃用户</h3>
            <ReactECharts
              option={{
                tooltip: { trigger: 'axis' },
                xAxis: {
                  type: 'category',
                  data: Array.from({ length: 30 }, (_, i) => `${i + 1}`),
                },
                yAxis: { type: 'value' },
                series: [{
                  data: Array.from({ length: 30 }, () => Math.floor(Math.random() * 200 + 100)),
                  type: 'line',
                  smooth: true,
                  areaStyle: { opacity: 0.3 },
                  itemStyle: { color: '#111' },
                }],
              }}
              style={{ height: 300 }}
            />
          </div>
        </Col>
        <Col span={8}>
          <div className="va-stat-card">
            <h3 style={{ marginTop: 0 }}>词书分布</h3>
            <ReactECharts
              option={{
                tooltip: { trigger: 'item' },
                series: [{
                  type: 'pie',
                  radius: '60%',
                  data: [
                    { value: 1048, name: '高频 5000' },
                    { value: 735, name: 'GRE 核心' },
                    { value: 580, name: '雅思 7+' },
                  ],
                  itemStyle: { borderColor: '#fff', borderWidth: 2 },
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