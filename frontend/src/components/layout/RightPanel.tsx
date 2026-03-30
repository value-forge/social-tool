interface RightPanelProps {
  onAddMonitor?: () => void
}

export default function RightPanel({ onAddMonitor }: RightPanelProps) {
  return (
    <aside
      className="app-rightbar"
      style={{
        background: 'var(--bg-elevated)',
        borderLeft: '1px solid var(--border)',
        padding: '32px 24px',
        overflowY: 'auto',
      }}
    >
      {/* 实时动态 */}
      <div style={{ marginBottom: 32 }}>
        <div
          style={{
            fontSize: 11,
            color: 'var(--text-tertiary)',
            textTransform: 'uppercase',
            letterSpacing: 1,
            marginBottom: 16,
          }}
        >
          实时动态
        </div>

        <div
          style={{
            display: 'flex',
            gap: 12,
            padding: '12px 0',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: 'var(--success)',
              marginTop: 6,
              flexShrink: 0,
            }}
          />
          <div>
            <div style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--text)' }}>
              检测到 3 条大V新推
            </div>
            <div
              style={{
                fontSize: 12,
                color: 'var(--text-tertiary)',
                marginTop: 4,
              }}
            >
              2分钟前
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 12,
            padding: '12px 0',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: 'var(--text)',
              marginTop: 6,
              flexShrink: 0,
            }}
          />
          <div>
            <div style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--text)' }}>
              Bitcoin ETF 话题热度上升
            </div>
            <div
              style={{
                fontSize: 12,
                color: 'var(--text-tertiary)',
                marginTop: 4,
              }}
            >
              5分钟前
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 12,
            padding: '12px 0',
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: 'var(--warning)',
              marginTop: 6,
              flexShrink: 0,
            }}
          />
          <div>
            <div style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--text)' }}>
              待回复消息增加 5 条
            </div>
            <div
              style={{
                fontSize: 12,
                color: 'var(--text-tertiary)',
                marginTop: 4,
              }}
            >
              12分钟前
            </div>
          </div>
        </div>
      </div>

      {/* 快捷操作 */}
      <div style={{ marginBottom: 32 }}>
        <div
          style={{
            fontSize: 11,
            color: 'var(--text-tertiary)',
            textTransform: 'uppercase',
            letterSpacing: 1,
            marginBottom: 16,
          }}
        >
          快捷操作
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            className="btn btn-outline"
            style={{ justifyContent: 'flex-start' }}
            onClick={onAddMonitor}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="16" />
              <line x1="8" y1="12" x2="16" y2="12" />
            </svg>
            添加监控账号
          </button>

          <button
            className="btn btn-outline"
            style={{ justifyContent: 'flex-start' }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path d="M12 20v-6M6 20V10M18 20V4" />
            </svg>
            查看数据报表
          </button>

          <button
            className="btn btn-outline"
            style={{ justifyContent: 'flex-start' }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v6m0 6v6m4.22-10.22l4.24-4.24M6.34 17.66l-4.24 4.24M23 12h-6m-6 0H1m20.24 4.24l-4.24-4.24M6.34 6.34L2.1 2.1" />
            </svg>
            设置通知
          </button>
        </div>
      </div>

      {/* 今日概览 */}
      <div style={{ marginBottom: 32 }}>
        <div
          style={{
            fontSize: 11,
            color: 'var(--text-tertiary)',
            textTransform: 'uppercase',
            letterSpacing: 1,
            marginBottom: 16,
          }}
        >
          今日概览
        </div>

        <div
          style={{
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: 16,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: 12,
            }}
          >
            <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
              已发布
            </span>
            <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>
              3 条
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: 12,
            }}
          >
            <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
              获得互动
            </span>
            <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>
              47 次
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
              新增关注
            </span>
            <span
              style={{
                fontWeight: 600,
                fontSize: 14,
                color: 'var(--success)',
              }}
            >
              +12
            </span>
          </div>
        </div>
      </div>

      {/* 即将上线 */}
      <div>
        <div
          style={{
            fontSize: 11,
            color: 'var(--text-tertiary)',
            textTransform: 'uppercase',
            letterSpacing: 1,
            marginBottom: 16,
          }}
        >
          即将上线
        </div>
        <div
          style={{
            fontSize: 13,
            color: 'var(--text-secondary)',
            lineHeight: 1.8,
          }}
        >
          <p>• 多账号管理</p>
          <p>• 自动排期发布</p>
          <p>• 竞品分析报告</p>
        </div>
      </div>
    </aside>
  )
}
