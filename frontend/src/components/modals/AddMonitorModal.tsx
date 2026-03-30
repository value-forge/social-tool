import { useState } from 'react'
import { Modal, message } from 'antd'
import { useAddMonitor } from '../../hooks/useMonitors'

interface AddMonitorModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function AddMonitorModal({
  open,
  onClose,
  onSuccess,
}: AddMonitorModalProps) {
  const [username, setUsername] = useState('')
  const [notes, setNotes] = useState('')
  const addMutation = useAddMonitor()

  const handleSubmit = async () => {
    const trimmed = username.trim()
    if (!trimmed) {
      void message.warning('请输入用户名')
      return
    }
    try {
      await addMutation.mutateAsync({
        username: trimmed,
        notes: notes.trim() || undefined,
      })
      void message.success('添加成功')
      setUsername('')
      setNotes('')
      onSuccess()
    } catch (err: unknown) {
      const error = err as { response?: { status?: number } }
      if (error.response?.status === 409) {
        void message.error('已在监控列表中')
      } else if (error.response?.status === 404) {
        void message.error('Twitter用户不存在')
      } else {
        void message.error('添加失败，请重试')
      }
    }
  }

  const handleCancel = () => {
    setUsername('')
    setNotes('')
    onClose()
  }

  return (
    <Modal
      open={open}
      onCancel={handleCancel}
      footer={null}
      closable={false}
      destroyOnClose
      width={480}
      className="proto-modal"
      centered
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 24px',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)' }}>
          添加监控账号
        </div>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--text-secondary)',
            transition: 'all 0.15s',
          }}
          onClick={handleCancel}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--bg-hover)'
            e.currentTarget.style.color = 'var(--text)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = 'var(--text-secondary)'
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: 24 }}>
        <div style={{ marginBottom: 20 }}>
          <label className="proto-label" htmlFor="twitterHandle">
            用户名 *
          </label>
          <input
            type="text"
            id="twitterHandle"
            className="proto-input"
            placeholder="username"
            autoComplete="off"
            maxLength={64}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <div className="proto-hint">
            Twitter 用户名，无需 @（对应接口 username）
          </div>
        </div>
        <div style={{ marginBottom: 20 }}>
          <label className="proto-label" htmlFor="monitorNotes">
            备注
          </label>
          <textarea
            id="monitorNotes"
            className="proto-input"
            placeholder="选填，便于区分用途（对应接口 notes）"
            rows={4}
            style={{ minHeight: 100, resize: 'vertical', lineHeight: 1.5 }}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 12,
          padding: '16px 24px 24px',
        }}
      >
        <button className="btn btn-outline" onClick={handleCancel}>
          取消
        </button>
        <button
          className="btn btn-white"
          onClick={() => void handleSubmit()}
          disabled={addMutation.isPending}
        >
          {addMutation.isPending ? '添加中...' : '添加监控'}
        </button>
      </div>
    </Modal>
  )
}
