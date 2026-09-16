import { Card, Form, Input, Button, Switch, Select, Divider } from 'antd'

export function Settings() {
  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 16 }}>系统设置</h1>

      <Card title="LLM 配置" style={{ marginBottom: 16 }}>
        <Form layout="vertical">
          <Form.Item label="当前模型" name="provider">
            <Select
              defaultValue="deepseek"
              options={[
                { value: 'deepseek', label: 'DeepSeek' },
                { value: 'zhipu', label: '智谱 GLM' },
                { value: 'openai', label: 'OpenAI' },
              ]}
            />
          </Form.Item>
          <Form.Item label="DeepSeek API Key">
            <Input.Password placeholder="sk-..." />
          </Form.Item>
          <Form.Item label="备用模型（自动降级用）">
            <Select
              defaultValue="zhipu"
              options={[
                { value: 'zhipu', label: '智谱 GLM-4' },
                { value: 'none', label: '无' },
              ]}
            />
          </Form.Item>
          <Button type="primary">保存</Button>
        </Form>
      </Card>

      <Card title="功能开关">
        <Form layout="vertical">
          <Form.Item label="AI 解释功能">
            <Switch defaultChecked />
          </Form.Item>
          <Form.Item label="口语陪练">
            <Switch defaultChecked />
          </Form.Item>
          <Form.Item label="错因分析">
            <Switch defaultChecked />
          </Form.Item>
          <Form.Item label="新用户注册">
            <Switch defaultChecked />
          </Form.Item>
        </Form>
      </Card>

      <Card title="运营配置" style={{ marginTop: 16 }}>
        <Form layout="vertical">
          <Form.Item label="每日新词上限" extra="0 表示无限制">
            <Input type="number" defaultValue={60} />
          </Form.Item>
          <Form.Item label="AI 解释每日上限">
            <Input type="number" defaultValue={20} />
          </Form.Item>
          <Form.Item label="维护公告">
            <Input.TextArea rows={3} placeholder="如需发布维护公告，请填写" />
          </Form.Item>
          <Button type="primary">保存</Button>
        </Form>
      </Card>
    </div>
  )
}