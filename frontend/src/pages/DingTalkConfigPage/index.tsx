import { useState, useEffect } from 'react'
import {
  Card,
  Button,
  Form,
  Input,
  Switch,
  Checkbox,
  List,
  Tag,
  Space,
  Modal,
  message,
  Typography,
  Alert,
  Tooltip,
  Empty,
  theme as antTheme,
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SendOutlined,
  BellOutlined,
  ExclamationCircleOutlined,
  CopyOutlined,
} from '@ant-design/icons'
import {
  getDingTalkChannels,
  addDingTalkChannel,
  updateDingTalkChannel,
  deleteDingTalkChannel,
  toggleDingTalkChannel,
  testDingTalkChannel,
} from '../../api/mockDingTalk'
import type { NotifyChannel, NotifyEventType } from '../../types'

const { Title, Text, Paragraph } = Typography

// 默认用户ID
const DEFAULT_TWITTER_USERNAME = import.meta.env.VITE_TWITTER_USERNAME || '0xziheng'
const DEFAULT_USER_ID = `default_${DEFAULT_TWITTER_USERNAME}`

// 事件选项
const EVENT_OPTIONS = [
  { label: '新推文到达', value: 'new_post' },
  { label: '草稿生成完成', value: 'draft_ready' },
  { label: '热点大盘更新', value: 'trending' },
  { label: '信息流摘要', value: 'feed_summary' },
]

export default function DingTalkConfigPage() {
  const { token } = antTheme.useToken()
  const [channels, setChannels] = useState<NotifyChannel[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingChannel, setEditingChannel] = useState<NotifyChannel | null>(null)
  const [form] = Form.useForm()
  const [testLoading, setTestLoading] = useState<Record<string, boolean>>({})
  const [toggleLoading, setToggleLoading] = useState<Record<string, boolean>>({})

  // 加载配置列表
  const loadChannels = async () => {
    setLoading(true)
    try {
      const data = await getDingTalkChannels(DEFAULT_USER_ID)
      setChannels(data.channels)
    } catch (error) {
      message.error('加载配置失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadChannels()
  }, [])

  // 打开添加弹窗
  const handleAdd = () => {
    setEditingChannel(null)
    form.resetFields()
    form.setFieldsValue({
      enabled: true,
      notify_events: ['new_post', 'draft_ready'],
    })
    setModalVisible(true)
  }

  // 打开编辑弹窗
  const handleEdit = (channel: NotifyChannel) => {
    setEditingChannel(channel)
    form.setFieldsValue({
      name: channel.name,
      webhook_url: channel.webhook_url,
      enabled: channel.enabled,
      notify_events: channel.notify_events,
    })
    setModalVisible(true)
  }

  // 删除配置
  const handleDelete = async (channel: NotifyChannel) => {
    Modal.confirm({
      title: '确认删除',
      icon: <ExclamationCircleOutlined />,
      content: `确定要删除配置 "${channel.name}" 吗？`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await deleteDingTalkChannel(channel.id)
          message.success('删除成功')
          loadChannels()
        } catch (error) {
          message.error('删除失败')
        }
      },
    })
  }

  // 启用/禁用
  const handleToggle = async (channel: NotifyChannel) => {
    setToggleLoading({ ...toggleLoading, [channel.id]: true })
    try {
      await toggleDingTalkChannel(channel.id)
      message.success(channel.enabled ? '已禁用' : '已启用')
      loadChannels()
    } catch (error) {
      message.error('操作失败')
    } finally {
      setToggleLoading({ ...toggleLoading, [channel.id]: false })
    }
  }

  // 测试消息
  const handleTest = async (channel: NotifyChannel) => {
    setTestLoading({ ...testLoading, [channel.id]: true })
    try {
      const result = await testDingTalkChannel(channel.id)
      if (result.success) {
        message.success(result.message)
      } else {
        message.error(result.message)
      }
    } catch (error) {
      message.error('测试失败')
    } finally {
      setTestLoading({ ...testLoading, [channel.id]: false })
    }
  }

  // 提交表单
  const handleSubmit = async (values: {
    name: string
    webhook_url: string
    secret?: string
    enabled: boolean
    notify_events: NotifyEventType[]
  }) => {
    try {
      if (editingChannel) {
        await updateDingTalkChannel(editingChannel.id, values)
        message.success('更新成功')
      } else {
        await addDingTalkChannel(DEFAULT_USER_ID, values)
        message.success('添加成功')
      }
      setModalVisible(false)
      loadChannels()
    } catch (error: any) {
      message.error(error.message || '保存失败')
    }
  }

  // 获取事件标签
  const getEventTag = (event: NotifyEventType) => {
    const map: Record<NotifyEventType, { color: string; text: string }> = {
      new_post: { color: 'blue', text: '新推文' },
      draft_ready: { color: 'green', text: '草稿' },
      trending: { color: 'orange', text: '热点' },
      feed_summary: { color: 'purple', text: '摘要' },
    }
    const { color, text } = map[event] || { color: 'default', text: event }
    return <Tag color={color}>{text}</Tag>
  }

  return (
    <div>
      {/* 页面标题 */}
      <div style={{ marginBottom: 24 }}>
        <Title level={4}><BellOutlined /> 钉钉机器人配置</Title>
        <Paragraph type="secondary">
          配置钉钉机器人，接收新推文、草稿生成、热点更新等消息推送
        </Paragraph>
      </div>

      {/* 帮助提示 */}
      <Alert
        message="配置说明"
        description={
          <ol style={{ margin: 0, paddingLeft: 20 }}>
            <li>在钉钉群中点击「群设置」-「智能群助手」</li>
            <li>点击「添加机器人」，选择「自定义」</li>
            <li>设置机器人名称和头像，安全设置选择「加签」</li>
            <li>复制 Webhook 地址和签名密钥到下方表单</li>
          </ol>
        }
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />

      {/* 添加按钮 */}
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          添加配置
        </Button>
      </div>

      {/* 配置列表 */}
      <List
        grid={{ gutter: 16, xs: 1, lg: 2 }}
        dataSource={channels}
        loading={loading}
        locale={{
          emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <div>
                  <Text type="secondary">暂无钉钉配置</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    点击上方按钮添加配置
                  </Text>
                </div>
              }
            />
          ),
        }}
        renderItem={(channel) => (
          <List.Item>
            <Card
              hoverable
              style={{
                opacity: channel.enabled ? 1 : 0.6,
                borderColor: channel.enabled ? token.colorPrimary : token.colorBorder,
              }}
              title={
                <Space>
                  <Text strong>{channel.name}</Text>
                  {channel.enabled ? (
                    <Tag color="success">已启用</Tag>
                  ) : (
                    <Tag>已禁用</Tag>
                  )}
                </Space>
              }
              extra={
                <Switch
                  checked={channel.enabled}
                  onChange={() => handleToggle(channel)}
                  loading={toggleLoading[channel.id]}
                />
              }
              actions={[
                <Tooltip title="测试消息" key="test">
                  <Button
                    type="text"
                    icon={<SendOutlined />}
                    onClick={() => handleTest(channel)}
                    loading={testLoading[channel.id]}
                    disabled={!channel.enabled}
                  >
                    测试
                  </Button>
                </Tooltip>,
                <Tooltip title="编辑" key="edit">
                  <Button
                    type="text"
                    icon={<EditOutlined />}
                    onClick={() => handleEdit(channel)}
                  >
                    编辑
                  </Button>
                </Tooltip>,
                <Tooltip title="删除" key="delete">
                  <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => handleDelete(channel)}
                  >
                    删除
                  </Button>
                </Tooltip>,
              ]}
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}></Text>
                  <Paragraph
                    copyable={{ icon: <CopyOutlined />, tooltips: ['复制', '已复制'] }}
                    style={{ margin: 0, fontSize: 13 }}
                  >
                    {channel.webhook_url}
                  </Paragraph>
                </div>

                <div>
                  <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                    推送事件：
                  </Text>
                  <Space size={[4, 8]} wrap>
                    {channel.notify_events.map((event) => (
                      <span key={event}>{getEventTag(event)}</span>
                    ))}
                  </Space>
                </div>

                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    创建时间：{new Date(channel.created_at).toLocaleString('zh-CN')}
                  </Text>
                </div>
              </Space>
            </Card>
          </List.Item>
        )}
      />

      {/* 添加/编辑弹窗 */}
      <Modal
        title={editingChannel ? '编辑钉钉配置' : '添加钉钉配置'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => form.submit()}
        okText={editingChannel ? '更新' : '添加'}
        width={560}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          style={{ marginTop: 16 }}
        >
          <Form.Item
            name="name"
            label="配置名称"
            rules={[{ required: true, message: '请输入配置名称' }]}
            tooltip="给这个配置起一个容易识别的名字"
          >
            <Input placeholder="例如：运营一群" />
          </Form.Item>

          <Form.Item
            name="webhook_url"
            label="Webhook 地址"
            rules={[
              { required: true, message: '请输入 Webhook 地址' },
              { type: 'url', message: '请输入有效的 URL' },
            ]}
            tooltip={
              <span>
                从钉钉群机器人设置中获取，格式如：
                <br />
                https://oapi.dingtalk.com/robot/send?access_token=xxx
              </span>
            }
          >
            <Input.TextArea
              placeholder="https://oapi.dingtalk.com/robot/send?access_token=xxx"
              rows={2}
            />
          </Form.Item>

          <Form.Item
            name="secret"
            label="签名密钥 (Secret)"
            tooltip="创建机器人时开启「加签」安全设置后获得的密钥，以 SEC 开头"
          >
            <Input placeholder="SECxxxxxxxxxxxxxxxx" />
          </Form.Item>

          <Form.Item
            name="notify_events"
            label="推送事件"
            rules={[{ required: true, message: '请至少选择一项推送事件' }]}
          >
            <Checkbox.Group options={EVENT_OPTIONS} />
          </Form.Item>

          <Form.Item
            name="enabled"
            label="启用状态"
            valuePropName="checked"
          >
            <Switch checkedChildren="启用" unCheckedChildren="禁用" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
