import { useStatsOverview } from '../../hooks/useStats'

export default function StatsCards() {
  const { data } = useStatsOverview()

  const cards = [
    {
      label: '监控账号',
      value: data?.monitors.total ?? '-',
      change: `+${data?.monitors.active ?? 0} 活跃`,
      up: true,
    },
    {
      label: '今日新推',
      value: data?.tweets.today ?? '-',
      change: `共 ${data?.tweets.total ?? 0} 条`,
      up: true,
    },
    {
      label: '待分析',
      value: data?.tweets.pending ?? '-',
      change: `${data?.tweets.completed ?? 0} 已完成`,
      up: false,
    },
    {
      label: '本周涨粉',
      value: '+892',
      change: '+23% 增长',
      up: true,
    },
  ]

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 20,
        marginBottom: 32,
      }}
      className="max-xl:!grid-cols-2"
    >
      {cards.map((card) => (
        <div
          key={card.label}
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: 24,
            transition: 'border-color 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-hover)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border)'
          }}
        >
          <div
            style={{
              fontSize: 12,
              color: 'var(--text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              marginBottom: 12,
            }}
          >
            {card.label}
          </div>
          <div
            style={{
              fontSize: 36,
              fontWeight: 700,
              marginBottom: 8,
              color: 'var(--text)',
            }}
          >
            {card.value}
          </div>
          <div
            style={{
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              color: card.up ? 'var(--success)' : 'var(--danger)',
            }}
          >
            {card.up ? (
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
              </svg>
            ) : (
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
              </svg>
            )}
            {card.change}
          </div>
        </div>
      ))}
    </div>
  )
}
