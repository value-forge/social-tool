import type { MonitorAccount } from '../../types'

interface MonitorItemProps {
  account: MonitorAccount
  onClick: () => void
}

function formatNum(n: number): string {
  if (n >= 1_000_000)
    return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M'
  if (n >= 10_000) return Math.round(n / 1000) + 'k'
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k'
  return String(n)
}

export default function MonitorItem({ account, onClick }: MonitorItemProps) {
  const profile = account.profile
  const stats = account.stats
  const displayName = profile?.displayName || account.username || '未知'
  const avatar = profile?.avatar || ''
  const initial = displayName.charAt(0) || '?'

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 14,
        padding: '16px 24px',
        borderBottom: '1px solid var(--border)',
        transition: 'background 0.1s',
        cursor: 'pointer',
      }}
      onClick={onClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--bg-hover)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent'
      }}
    >
      {/* Avatar */}
      {avatar ? (
        <img
          src={avatar}
          alt={displayName}
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            objectFit: 'cover',
            flexShrink: 0,
          }}
        />
      ) : (
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #333, #555)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 600,
            fontSize: 16,
            flexShrink: 0,
          }}
        >
          {initial}
        </div>
      )}

      {/* Body */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Top row */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '4px 12px',
          }}
        >
          <span
            style={{
              fontWeight: 600,
              fontSize: 14,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              color: 'var(--text)',
            }}
          >
            {displayName}
            {profile?.verified && (
              <span
                style={{
                  display: 'inline-flex',
                  color: '#38bdf8',
                  flexShrink: 0,
                }}
                title="已认证"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ width: 15, height: 15 }}
                >
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </span>
            )}
          </span>

          {account.username && (
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              @{account.username}
            </span>
          )}

          {/* Status badge */}
          <span
            style={{
              fontSize: 11,
              fontWeight: 500,
              padding: '2px 8px',
              borderRadius: 4,
              border: `1px solid ${
                account.status === 1
                  ? 'rgba(34,197,94,0.35)'
                  : 'rgba(245,158,11,0.35)'
              }`,
              color:
                account.status === 1
                  ? 'var(--success)'
                  : 'var(--warning)',
            }}
          >
            {account.status === 1 ? '监控中' : '已暂停'}
          </span>

          {/* Metrics */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '14px 18px',
              marginLeft: 'auto',
              flexWrap: 'wrap',
            }}
          >
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                fontSize: 12,
                color: 'var(--text-secondary)',
                fontVariantNumeric: 'tabular-nums',
              }}
              title="粉丝数"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                style={{ width: 14, height: 14, opacity: 0.8, flexShrink: 0 }}
              >
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              {formatNum(stats?.followersCount ?? 0)}
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                fontSize: 12,
                color: 'var(--text-secondary)',
                fontVariantNumeric: 'tabular-nums',
              }}
              title="关注数"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                style={{ width: 14, height: 14, opacity: 0.8, flexShrink: 0 }}
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="8.5" cy="7" r="4" />
                <line x1="20" y1="8" x2="20" y2="14" />
                <line x1="23" y1="11" x2="17" y2="11" />
              </svg>
              {formatNum(stats?.followingCount ?? 0)}
            </span>
          </div>
        </div>

        {/* Bio */}
        {profile?.bio && (
          <p
            style={{
              marginTop: 6,
              fontSize: 13,
              color: 'var(--text-secondary)',
              lineHeight: 1.45,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {profile.bio}
          </p>
        )}

        {/* Notes */}
        {account.notes && (
          <p
            style={{
              fontSize: 12,
              color: 'var(--text-tertiary)',
              marginTop: 6,
              lineHeight: 1.4,
            }}
          >
            <span style={{ color: 'var(--text-tertiary)' }}>备注：</span>
            <span style={{ color: 'var(--text-secondary)' }}>
              {account.notes}
            </span>
          </p>
        )}
      </div>

      {/* View button */}
      <div
        style={{ flexShrink: 0, marginLeft: 4, alignSelf: 'center' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="btn btn-outline btn-sm" onClick={onClick}>
          查看
        </button>
      </div>
    </div>
  )
}
