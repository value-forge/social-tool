import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Avatar, Button, Spin, Typography, Tag, Empty,
  Space, Table, Popconfirm, message, theme as antTheme, Tooltip
} from 'antd'
import {
  FileTextOutlined, CopyOutlined, EditOutlined, CheckCircleOutlined,
  DeleteOutlined, StarOutlined, StarFilled, UserOutlined, LinkOutlined
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { getDrafts, updateDraftStatus, rateDraft } from '../../api/drafts'
import type { Draft, DraftStatus } from '../../types'

const { Text, Paragraph } = Typography

// 默认用户ID
const DEFAULT_TWITTER_USERNAME = import.meta.env.VITE_TWITTER_USERNAME || '0xziheng'
const DEFAULT_USER_ID = `default_${DEFAULT_TWITTER_USERNAME}`

/** 格式化时间 */
function formatTime(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** 获取状态标签 */
function getStatusTag(status: DraftStatus) {
  const config: Record<DraftStatus, { color: string; text: string }> = {
    generated: { color: 'blue', text: '已生成' },
    edited: { color: 'orange', text: '已编辑' },
    copied: { color: 'green', text: '已复制' },
    sent: { color: 'default', text: '已发送' },
  }
  const { color, text } = config[status]
  return <Tag color={color}>{text}</Tag>
}

// 编辑草稿弹窗
function EditDraftModal({
  draft,
  visible,
  onClose,
  onSave,
}: {
  draft: Draft | null
  visible: boolean
  onClose: () => void
  onSave: (content: string) => void
}) {
  const [content, setContent] = useState('')

  if (!draft) return null

  return (
    <div
      style={{
        display: visible ? 'flex' : 'none',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        zIndex: 1000,
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          padding: 24,
          width: 600,
          maxWidth: '90vw',
          maxHeight: '80vh',
          overflow: 'auto',
        }}
      >
        <h3 style={{ marginTop: 0 }}>编辑草稿</h3>
        <textarea
          value={content || draft?.draft_content || ''}
          onChange={(e) => setContent(e.target.value)}
          style={{
            width: '100%',
            minHeight: 200,
            padding: 12,
            borderRadius: 8,
            border: '1px solid #d9d9d9',
            fontSize: 14,
            lineHeight: 1.6,
            resize: 'vertical',
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 16 }}>
          <Button onClick={onClose}>取消</Button>
          <Button type="primary" onClick={() => onSave(content || draft?.draft_content || '')}>
            保存
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function DraftHistoryPage() {
  const { token } = antTheme.useToken()
  const queryClient = useQueryClient()
  const [editingDraft, setEditingDraft] = useState<Draft | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const {
    data,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['drafts', DEFAULT_USER_ID],
    queryFn: () => getDrafts({ user_id: DEFAULT_USER_ID, page_size: 50 }),
    retry: 1,
  })

  // 复制草稿
  const handleCopy = (draft: Draft) => {
    navigator.clipboard.writeText(draft.draft_content)
    setCopiedId(draft.id)
    message.success('已复制到剪贴板')
    setTimeout(() => setCopiedId(null), 2000)

    // 更新状态为已复制
    updateDraftStatus(draft.id, 'copied')
  }

  // 评分 mutation
  const rateMutation = useMutation({
    mutationFn: ({ id, rating }: { id: string; rating: number }) => rateDraft(id, rating),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drafts'] })
      message.success('评分已保存')
    },
  })

  const handleRate = (id: string, rating: number) => {
    rateMutation.mutate({ id, rating })
  }

  // 删除 mutation（模拟）
  const deleteMutation = useMutation({
    mutationFn: async (_id: string) => {
      // 实际项目中调用删除 API
      await new Promise((resolve) => setTimeout(resolve, 500))
    },
    onSuccess: () => {
      message.success('草稿已删除')
      queryClient.invalidateQueries({ queryKey: ['drafts'] })
    },
  })

  const columns: ColumnsType<Draft> = [
    {
      title: '关联帖子',
      key: 'post',
      width: 280,
      render: (_, record) => (
        <div style={{ display: 'flex', gap: 10 }}>
          <Avatar
            src={record.post?.author_username ? `https://api.dicebear.com/7.x/initials/svg?seed=${record.post.author_username}` : undefined}
            size={40}
            icon={<UserOutlined />}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Text strong>{record.post?.author_username || '未知用户'}</Text>
              <a
                href={record.post?.post_url}
                target="_blank"
                rel="noreferrer"
                style={{ color: token.colorPrimary }}
              >
                <LinkOutlined style={{ fontSize: 12 }} />
              </a>
            </div>
            <Paragraph
              ellipsis={{ rows: 2, expandable: false }}
              type="secondary"
              style={{ margin: 0, fontSize: 12 }}
            >
              {record.post?.content || '原帖内容'}
            </Paragraph>
          </div>
        </div>
      ),
    },
    {
      title: '草稿内容',
      key: 'content',
      render: (_, record) => (
        <div>
          <Paragraph
            ellipsis={{ rows: 3, expandable: true }}
            style={{ margin: 0, fontSize: 14 }}
          >
            {record.draft_content}
          </Paragraph>
          <div style={{ marginTop: 8 }}>
            {getStatusTag(record.status)}
            <Tag color="blue" style={{ marginLeft: 8 }}>{record.model}</Tag>
          </div>
        </div>
      ),
    },
    {
      title: '评分',
      key: 'rating',
      width: 120,
      align: 'center',
      render: (_, record) => (
        <Space>
          {[1, 2, 3, 4, 5].map((star) => (
            <span
              key={star}
              style={{
                cursor: 'pointer',
                color: star <= (record.rating || 0) ? '#f59e0b' : '#d9d9d9',
                fontSize: 16,
              }}
              onClick={() => handleRate(record.id, star)}
            >
              {star <= (record.rating || 0) ? <StarFilled /> : <StarOutlined />}
            </span>
          ))}
        </Space>
      ),
    },
    {
      title: '生成时间',
      key: 'created_at',
      width: 140,
      render: (_, record) => (
        <Text type="secondary" style={{ fontSize: 13 }}>{formatTime(record.created_at)}</Text>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 180,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Tooltip title="复制">
            <Button
              type="text"
              icon={copiedId === record.id ? <CheckCircleOutlined style={{ color: '#22c55e' }} /> : <CopyOutlined />}
              onClick={() => handleCopy(record)}
            >
              {copiedId === record.id ? '已复制' : '复制'}
            </Button>
          </Tooltip>
          <Tooltip title="编辑">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => {
                setEditingDraft(record)
                setShowEditModal(true)
              }}
            >
              编辑
            </Button>
          </Tooltip>
          <Popconfirm
            title="确定删除此草稿？"
            onConfirm={() => deleteMutation.mutate(record.id)}
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Button type="text" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  if (isLoading) {
    return (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <Spin tip="正在加载草稿..." />
      </div>
    )
  }

  // 不显示错误，直接展示空状态
  // API 失败时会在 data 中返回空数组
  const drafts: Draft[] = data?.drafts ?? []

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Space>
          <Text type="secondary">
            共 <Text strong>{drafts.length}</Text> 条草稿
          </Text>
          <Tag icon={<FileTextOutlined />} color="blue">
            AI 生成
          </Tag>
        </Space>
        <Button onClick={() => refetch()} loading={isLoading}>
          刷新
        </Button>
      </div>

      {drafts.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <div style={{ textAlign: 'center' }}>
              <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                暂无草稿
              </Text>
              <Text type="secondary" style={{ fontSize: 13 }}>
                在「推文动态」或「热点大盘」页面可以生成回复草稿
              </Text>
            </div>
          }
        />
      ) : (
        <Table
          rowKey="id"
          columns={columns}
          dataSource={drafts}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 1000 }}
        />
      )}

      <EditDraftModal
        draft={editingDraft}
        visible={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSave={(_content) => {
          message.success('草稿已保存（模拟）')
          setShowEditModal(false)
        }}
      />
    </div>
  )
}
