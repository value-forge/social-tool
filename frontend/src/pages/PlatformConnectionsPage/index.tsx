import { useState } from 'react'
import {
  Card, Button, Tag, Space, Typography, List, Avatar, Badge,
  Modal, message
} from 'antd'
import {
  CheckCircleOutlined, DisconnectOutlined,
  LinkOutlined, InfoCircleOutlined
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getPlatforms, getPlatformConnections, disconnectPlatform, joinPlatformWaitlist } from '../../api/platform'
import type { PlatformType, PlatformInfo } from '../../types'

const { Title, Text, Paragraph } = Typography

// 平台图标映射
const PLATFORM_ICONS: Record<PlatformType, string> = {
  twitter: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/twitter/twitter-original.svg',
  xiaohongshu: '📕',
  tiktok: '🎵',
  douyin: '🎶',
  farcaster: '🌐',
  telegram: '✈️',
  discord: '💬',
  instagram: '📷',
}

export default function PlatformConnectionsPage() {
  const queryClient = useQueryClient()
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformInfo | null>(null)

  // 获取平台列表
  const { data: platformsData, isLoading: platformsLoading } = useQuery({
    queryKey: ['platforms'],
    queryFn: getPlatforms,
  })

  // 获取连接状态
  const { data: connectionsData, isLoading: connectionsLoading } = useQuery({
    queryKey: ['platform-connections'],
    queryFn: getPlatformConnections,
  })

  const platforms = platformsData?.platforms ?? []
  const connections = connectionsData?.connections ?? []

  // 断开连接 mutation
  const disconnectMutation = useMutation({
    mutationFn: disconnectPlatform,
    onSuccess: () => {
      message.success('已断开连接')
      queryClient.invalidateQueries({ queryKey: ['platform-connections'] })
    },
    onError: () => {
      message.error('断开连接失败')
    },
  })

  // 等待列表 mutation
  const waitlistMutation = useMutation({
    mutationFn: joinPlatformWaitlist,
    onSuccess: () => {
      message.success('已登记，平台上线后将通知您')
      setSelectedPlatform(null)
    },
  })

  const handleConnect = (platform: PlatformInfo) => {
    if (!platform.is_available) {
      setSelectedPlatform(platform)
      return
    }
    // 实际项目中跳转到 OAuth 授权
    message.info(`正在跳转到 ${platform.display_name} 授权页面...`)
  }

  const handleDisconnect = (platform: PlatformType) => {
    disconnectMutation.mutate(platform)
  }

  const isConnected = (platformType: PlatformType) => {
    return connections.some((c) => c.platform === platformType && c.status === 'active')
  }

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <Title level={4}>平台连接管理</Title>
        <Paragraph type="secondary">
          连接社交媒体平台，授权系统读取数据以进行监控和分析
        </Paragraph>
      </div>

      {/* 已连接平台 */}
      <Card title="已连接的平台" style={{ marginBottom: 24 }}>
        {connections.filter((c) => c.status === 'active').length === 0 ? (
          <Empty description="暂无已连接的平台" />
        ) : (
          <List
            dataSource={connections.filter((c) => c.status === 'active')}
            renderItem={(connection) => (
              <List.Item
                actions={[
                  <Button
                    type="text"
                    danger
                    icon={<DisconnectOutlined />}
                    onClick={() => handleDisconnect(connection.platform)}
                    loading={disconnectMutation.isPending}
                  >
                    断开
                  </Button>,
                ]}
              >
                <List.Item.Meta
                  avatar={
                    <Avatar
                      src={PLATFORM_ICONS[connection.platform]}
                      size={48}
                      style={{ background: '#f0f0f0' }}
                    >
                      {typeof PLATFORM_ICONS[connection.platform] === 'string' && 
                       PLATFORM_ICONS[connection.platform].length <= 2 
                        ? PLATFORM_ICONS[connection.platform] 
                        : null}
                    </Avatar>
                  }
                  title={
                    <Space>
                      <Text strong>{connection.platform_display_name}</Text>
                      <Badge status="success" text="已连接" />
                    </Space>
                  }
                  description={
                    <Space direction="vertical" size={0}>
                      <Text type="secondary">@{connection.platform_username}</Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        连接于 {new Date(connection.connected_at).toLocaleDateString('zh-CN')}
                      </Text>
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Card>

      {/* 可连接平台 */}
      <Card title="可连接的平台">
        <List
          grid={{ gutter: 16, xs: 1, sm: 2, md: 3, lg: 4 }}
          dataSource={platforms}
          loading={platformsLoading || connectionsLoading}
          renderItem={(platform) => {
            const connected = isConnected(platform.type)

            return (
              <List.Item>
                <Card
                  hoverable={!connected && platform.is_available}
                  onClick={() => !connected && handleConnect(platform)}
                  style={{
                    opacity: connected ? 0.6 : 1,
                    cursor: connected ? 'not-allowed' : platform.is_available ? 'pointer' : 'default',
                  }}
                >
                  <div style={{ textAlign: 'center' }}>
                    <Avatar
                      src={platform.icon_url || PLATFORM_ICONS[platform.type]}
                      size={64}
                      style={{
                        marginBottom: 16,
                        background: platform.is_available ? '#f0f0f0' : '#fafafa',
                      }}
                    >
                      {typeof PLATFORM_ICONS[platform.type] === 'string' && 
                       PLATFORM_ICONS[platform.type].length <= 2 
                        ? PLATFORM_ICONS[platform.type] 
                        : null}
                    </Avatar>

                    <div>
                      <Text strong style={{ fontSize: 16, display: 'block' }}>
                        {platform.display_name}
                      </Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {platform.description}
                      </Text>
                    </div>

                    <div style={{ marginTop: 16 }}>
                      {connected ? (
                        <Tag icon={<CheckCircleOutlined />} color="success">
                          已连接
                        </Tag>
                      ) : platform.is_available ? (
                        <Button type="primary" icon={<LinkOutlined />}>
                          连接
                        </Button>
                      ) : (
                        <Tag icon={<InfoCircleOutlined />}>即将支持</Tag>
                      )}
                    </div>
                  </div>
                </Card>
              </List.Item>
            )
          }}
        />
      </Card>

      {/* 未上线平台登记弹窗 */}
      <Modal
        title="平台即将支持"
        open={!!selectedPlatform && !selectedPlatform.is_available}
        onCancel={() => setSelectedPlatform(null)}
        footer={[
          <Button key="cancel" onClick={() => setSelectedPlatform(null)}>
            取消
          </Button>,
          <Button
            key="submit"
            type="primary"
            onClick={() => selectedPlatform && waitlistMutation.mutate(selectedPlatform.type)}
            loading={waitlistMutation.isPending}
          >
            通知我
          </Button>,
        ]}
      >
        <p>{selectedPlatform?.display_name} 平台正在开发中，上线后将第一时间通知您。</p>
      </Modal>
    </div>
  )
}

// 空状态组件
function Empty({ description }: { description: string }) {
  return (
    <div style={{ textAlign: 'center', padding: 40 }}>
      <Text type="secondary">{description}</Text>
    </div>
  )
}
