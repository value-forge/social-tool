interface QuickActionsProps {
  onAddMonitor?: () => void
}

export default function QuickActions({ onAddMonitor }: QuickActionsProps) {
  const items = [
    {
      key: 'trends',
      title: '热点发现',
      desc: '查看近6小时热门话题',
      icon: (
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      ),
    },
    {
      key: 'compose',
      title: '快速发推',
      desc: 'AI 辅助内容创作',
      icon: (
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      ),
    },
    {
      key: 'discover',
      title: '发现用户',
      desc: '寻找同频目标用户',
      icon: (
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        </svg>
      ),
    },
    {
      key: 'report',
      title: '数据报表',
      desc: '查看增长分析报告',
      icon: (
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path d="M12 20v-6M6 20V10M18 20V4" />
        </svg>
      ),
    },
  ]

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 16,
        marginBottom: 32,
      }}
      className="max-2xl:!grid-cols-2"
    >
      {items.map((item) => (
        <div
          key={item.key}
          onClick={item.key === 'report' ? onAddMonitor : undefined}
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: 24,
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--text)'
            e.currentTarget.style.background = 'var(--bg-hover)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border)'
            e.currentTarget.style.background = 'var(--bg-elevated)'
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              background: 'var(--bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
              color: 'var(--text)',
            }}
          >
            {item.icon}
          </div>
          <div
            style={{
              fontWeight: 600,
              marginBottom: 4,
              color: 'var(--text)',
            }}
          >
            {item.title}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {item.desc}
          </div>
        </div>
      ))}
    </div>
  )
}
