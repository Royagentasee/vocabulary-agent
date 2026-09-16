import { Row, Col, Select } from 'antd'
import ReactECharts from 'echarts-for-react'

export function Analytics() {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, margin: 0 }}>数据分析</h1>
        <Select
          defaultValue="30d"
          options={[
            { value: '7d', label: '近 7 天' },
            { value: '30d', label: '近 30 天' },
            { value: '90d', label: '近 90 天' },
          ]}
        />
      </div>

      <Row gutter={16}>
        <Col span={12}>
          <div className="va-stat-card">
            <h3>复习完成率趋势</h3>
            <ReactECharts
              option={{
                tooltip: { trigger: 'axis' },
                xAxis: { type: 'category', data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] },
                yAxis: { type: 'value', max: 100 },
                series: [{
                  data: [62, 71, 65, 73, 78, 82, 75],
                  type: 'bar',
                  itemStyle: { color: '#3b82f6' },
                }],
              }}
              style={{ height: 300 }}
            />
          </div>
        </Col>
        <Col span={12}>
          <div className="va-stat-card">
            <h3>AI 功能渗透率</h3>
            <ReactECharts
              option={{
                tooltip: { trigger: 'axis' },
                legend: { data: ['AI 解释', '口语陪练', '错因分析'] },
                xAxis: { type: 'category', data: Array.from({ length: 7 }, (_, i) => `${i + 1} 月`) },
                yAxis: { type: 'value', max: 100 },
                series: [
                  { name: 'AI 解释', type: 'line', smooth: true, data: [55, 60, 62, 65, 68, 70, 72] },
                  { name: '口语陪练', type: 'line', smooth: true, data: [10, 15, 20, 25, 30, 32, 35] },
                  { name: '错因分析', type: 'line', smooth: true, data: [5, 8, 12, 18, 22, 28, 30] },
                ],
              }}
              style={{ height: 300 }}
            />
          </div>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col span={24}>
          <div className="va-stat-card">
            <h3>用户留存曲线</h3>
            <ReactECharts
              option={{
                tooltip: { trigger: 'axis' },
                legend: { data: ['次留', '7留', '30留'] },
                xAxis: { type: 'category', data: ['1月', '2月', '3月', '4月', '5月', '6月'] },
                yAxis: { type: 'value', max: 100 },
                series: [
                  { name: '次留', type: 'line', smooth: true, data: [55, 58, 62, 60, 65, 68] },
                  { name: '7留', type: 'line', smooth: true, data: [25, 28, 32, 30, 33, 36] },
                  { name: '30留', type: 'line', smooth: true, data: [10, 12, 14, 15, 17, 20] },
                ],
              }}
              style={{ height: 300 }}
            />
          </div>
        </Col>
      </Row>
    </div>
  )
}