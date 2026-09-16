import { Table, Tag, Space, Button } from 'antd'

const data = Array.from({ length: 25 }, (_, i) => ({
  id: `u-${i + 1}`,
  nickname: `用户${i + 1}`,
  exam: ['GRE', 'IELTS', 'TOEFL'][i % 3],
  todayLearned: Math.floor(Math.random() * 50),
  totalReviewed: Math.floor(Math.random() * 5000),
  registeredAt: '2026-08-01',
  status: i % 10 === 0 ? 'premium' : 'free',
}))

export function Users() {
  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 16 }}>用户管理</h1>

      <div style={{ background: '#fff', borderRadius: 16, padding: 8 }}>
        <Table
          dataSource={data}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          columns={[
            { title: '用户 ID', dataIndex: 'id' },
            { title: '昵称', dataIndex: 'nickname' },
            {
              title: '考试',
              dataIndex: 'exam',
              render: (e) => <Tag color="blue">{e}</Tag>,
            },
            { title: '今日新词', dataIndex: 'todayLearned' },
            { title: '累计复习', dataIndex: 'totalReviewed' },
            { title: '注册时间', dataIndex: 'registeredAt' },
            {
              title: '状态',
              dataIndex: 'status',
              render: (s) => (
                <Tag color={s === 'premium' ? 'gold' : 'default'}>
                  {s === 'premium' ? '付费' : '免费'}
                </Tag>
              ),
            },
            {
              title: '操作',
              render: () => (
                <Space>
                  <Button type="link">详情</Button>
                  <Button type="link" danger>封禁</Button>
                </Space>
              ),
            },
          ]}
        />
      </div>
    </div>
  )
}