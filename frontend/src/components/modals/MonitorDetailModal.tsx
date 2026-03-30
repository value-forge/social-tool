import { useEffect, useState } from 'react'
import { Modal, message } from 'antd'
import type { MonitorAccount } from '../../types'
import { useUpdateMonitor } from '../../hooks/useMonitors'

interface MonitorDetailModalProps {
  open: boolean
  account: MonitorAccount | null
  onClose: () => void
  onSaved: () => void
}

function formatNum(n: number): string {
  if (n >= 1_000_000)
    return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M'
  if (n >= 10_000) return Math.round(n / 1000) + 'k'
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k'
  return String(n)
}

export default function MonitorDetailModal({
  open,
  account,
  onClose,
  onSaved,
}: MonitorDetailModalProps) {
  const [status, setStatus] = useState<string>('1')
  const [notes, setNotes] = useState('')
  const updateMutation = useUpdateMonitor()

  useEffect(() => {
    if (account) {
      setStatus(String(account.status))
      setNotes(account.notes || '')
    }
  }, [account])

  const handleSave = async () => {
    if (!account) return
    try {
      await updateMutation.mutateAsync({
        id: account.id,
        status: Number(status) as 1 | -1,
        notes: notes.trim(),
      })
      void message.success('保存成功')
      onSaved()
    } catch {
      void message.error('保存失败，请重试')
    }
  }

  if (!account) return null

  return (
    <Modal
      open={open}
      onCancel={onClose}
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
          监控账号详情
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
          onClick={onClose}
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
        {/* 监控关系 ID */}
        <div style={{ marginBottom: 20 }}>
          <label className="proto-label">监控关系 ID · id</label>
          <input
            type="text"
            className="proto-input"
            value={account.id}
            readOnly
          />
        </div>

        {/* Twitter 用户 ID */}
        <div style={{ marginBottom: 20 }}>
          <label className="proto-label">Twitter 用户 ID · twitterUserId</label>
          <input
            type="text"
            className="proto-input"
            value={account.twitterUserId}
            readOnly
          />
        </div>

        {/* 显示名 */}
        <div style={{ marginBottom: 20 }}>
          <label className="proto-label">显示名 · profile.displayName</label>
          <div
            style={{
              fontSize: 13,
              color: 'var(--text-secondary)',
              lineHeight: 1.5,
              padding: '10px 12px',
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              minHeight: 40,
            }}
          >
            {account.profile?.displayName || '—'}
          </div>
        </div>

        {/* 用户名 */}
        <div style={{ marginBottom: 20 }}>
          <label className="proto-label">用户名 · username</label>
          <input
            type="text"
            className="proto-input"
            value={account.username || ''}
            readOnly
          />
        </div>

        {/* 简介 */}
        <div style={{ marginBottom: 20 }}>
          <label className="proto-label">简介 · profile.bio</label>
          <textarea
            className="proto-input"
            value={account.profile?.bio || ''}
            readOnly
            rows={3}
            style={{ minHeight: 80, resize: 'vertical', lineHeight: 1.5 }}
          />
        </div>

        {/* 社交统计 */}
        <div style={{ marginBottom: 20 }}>
          <label className="proto-label">社交统计 · stats</label>
          <div
            style={{
              display: 'flex',
              gap: 12,
              flexWrap: 'wrap',
              fontSize: 13,
              color: 'var(--text-secondary)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            <span>
              粉丝{' '}
              <strong style={{ color: 'var(--text)' }}>
                {formatNum(account.stats?.followersCount ?? 0)}
              </strong>
            </span>
            <span>
              关注{' '}
              <strong style={{ color: 'var(--text)' }}>
                {formatNum(account.stats?.followingCount ?? 0)}
              </strong>
            </span>
            <span>
              认证{' '}
              <strong style={{ color: 'var(--text)' }}>
                {account.profile?.verified ? '是' : '否'}
              </strong>
            </span>
          </div>
        </div>

        {/* 监控状态 */}
        <div style={{ marginBottom: 20 }}>
          <label className="proto-label">监控状态 · status</label>
          <select
            className="proto-select"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="1">监控中 (1)</option>
            <option value="-1">已暂停 (-1)</option>
          </select>
        </div>

        {/* 备注 */}
        <div style={{ marginBottom: 20 }}>
          <label className="proto-label">备注 · notes</label>
          <textarea
            className="proto-input"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="可编辑，保存后同步到列表"
            rows={3}
            style={{ minHeight: 80, resize: 'vertical', lineHeight: 1.5 }}
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
        <button className="btn btn-outline" onClick={onClose}>
          取消
        </button>
        <button
          className="btn btn-white"
          onClick={() => void handleSave()}
          disabled={updateMutation.isPending}
        >
          {updateMutation.isPending ? '保存中...' : '保存'}
        </button>
      </div>
    </Modal>
  )
}
