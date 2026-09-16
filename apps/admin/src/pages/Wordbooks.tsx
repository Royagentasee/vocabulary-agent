import { useEffect, useState } from 'react'
import { Table, Button, Space, Tag, Modal, Form, Input, Select, InputNumber, message } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { api } from '../services/api'

interface Wordbook {
  id: string
  name: string
  description: string
  examTag: string
  coverColor: string
  wordCount: number
  status: 'draft' | 'active' | 'archived'
}

export function Wordbooks() {
  const [data, setData] = useState<Wordbook[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Wordbook | null>(null)
  const [form] = Form.useForm()

  const load = async () => {
    setLoading(true)
    try {
      const result = await api.wordbooks.list(1, 50)
      setData(result.items)
    } catch (e: any) {
      message.error(e.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleSubmit = async () => {
    const values = await form.validateFields()
    try {
      if (editing) {
        await api.wordbooks.update(editing.id, values)
        message.success('更新成功')
      } else {
        await api.wordbooks.create({ ...values, id: values.name.toLowerCase().replace(/\s+/g, '-') })
        message.success('创建成功')
      }
      setOpen(false)
      setEditing(null)
      form.resetFields()
      load()
    } catch (e: any) {
      message.error(e.message || '保存失败')
    }
  }

  const handleEdit = (record: Wordbook) => {
    setEditing(record)
    form.setFieldsValue(record)
    setOpen(true)
  }

  const handleDelete = async (id: string) => {
    try {
      await api.wordbooks.remove(id)
      message.success('删除成功')
      load()
    } catch (e: any) {
      message.error(e.message || '删除失败')
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, margin: 0 }}>词书管理</h1>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditing(null)
            form.resetFields()
            setOpen(true)
          }}
        >
          新建词书
        </Button>
      </div>

      <div style={{ background: '#fff', borderRadius: 16, padding: 8 }}>
        <Table
          loading={loading}
          dataSource={data}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          columns={[
            { title: '词书 ID', dataIndex: 'id', key: 'id' },
            { title: '名称', dataIndex: 'name', key: 'name' },
            {
              title: '考试',
              dataIndex: 'examTag',
              key: 'examTag',
              render: (e: string) => <Tag color="blue">{e}</Tag>,
            },
            { title: '词条数', dataIndex: 'wordCount', key: 'wordCount' },
            {
              title: '状态',
              dataIndex: 'status',
              key: 'status',
              render: (s: string) => (
                <Tag color={s === 'active' ? 'success' : s === 'draft' ? 'default' : 'warning'}>
                  {s === 'active' ? '已上架' : s === 'draft' ? '草稿' : '已归档'}
                </Tag>
              ),
            },
            {
              title: '操作',
              key: 'actions',
              render: (_, record: Wordbook) => (
                <Space>
                  <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
                    编辑
                  </Button>
                  <Button
                    type="link"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => {
                      Modal.confirm({
                        title: '确认删除',
                        content: `确定删除词书「${record.name}」？`,
                        onOk: () => handleDelete(record.id),
                      })
                    }}
                  >
                    删除
                  </Button>
                </Space>
              ),
            },
          ]}
        />
      </div>

      <Modal
        title={editing ? '编辑词书' : '新建词书'}
        open={open}
        onCancel={() => {
          setOpen(false)
          setEditing(null)
          form.resetFields()
        }}
        onOk={handleSubmit}
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical" initialValues={{ status: 'draft', examTag: 'GENERAL', coverColor: '#3b82f6' }}>
          <Form.Item label="词书名称" name="name" rules={[{ required: true }]}>
            <Input placeholder="例：GRE 核心词汇" />
          </Form.Item>
          <Form.Item label="考试类型" name="examTag" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'GENERAL', label: '通用' },
                { value: 'GRE', label: 'GRE' },
                { value: 'IELTS', label: 'IELTS' },
                { value: 'TOEFL', label: 'TOEFL' },
                { value: 'SAT', label: 'SAT' },
              ]}
            />
          </Form.Item>
          <Form.Item label="词条数" name="wordCount">
            <InputNumber min={0} max={100000} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="状态" name="status">
            <Select
              options={[
                { value: 'draft', label: '草稿' },
                { value: 'active', label: '已上架' },
                { value: 'archived', label: '已归档' },
              ]}
            />
          </Form.Item>
          <Form.Item label="描述" name="description">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}