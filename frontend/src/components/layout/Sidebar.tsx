import { useAuth } from '../../hooks/useAuth'
import UserCard from './UserCard'

export default function Sidebar() {
  const { user, logout } = useAuth()

  return (
    <aside
      className="app-sidebar"
      style={{
        background: 'var(--bg)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 0',
        height: '100vh',
        overflow: 'hidden',
      }}
    >
      {/* Logo */}
      <div style={{ padding: '0 24px 32px' }}>
        <div
          style={{
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: -0.5,
            color: 'var(--text)',
          }}
        >
          Social Tool
        </div>
      </div>

      {/* Nav: 工作台 */}
      <div style={{ padding: '0 12px', marginBottom: 32 }}>
        <div
          style={{
            fontSize: 11,
            color: 'var(--text-tertiary)',
            textTransform: 'uppercase',
            letterSpacing: 1,
            padding: '0 12px',
            marginBottom: 8,
          }}
        >
          工作台
        </div>

        {/* 监控中心 - active */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '10px 12px',
            margin: '2px 0',
            borderRadius: 8,
            cursor: 'pointer',
            transition: 'all 0.15s',
            background: 'var(--bg-hover)',
            color: 'var(--text)',
          }}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            style={{ width: 18, height: 18 }}
          >
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
          </svg>
          <span>监控中心</span>
          <span
            style={{
              marginLeft: 'auto',
              background: 'var(--text)',
              color: 'var(--bg)',
              fontSize: 11,
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: 12,
            }}
          >
            3
          </span>
        </div>

        {/* 热点发现 */}
        <NavItem
          label="热点发现"
          icon={
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              style={{ width: 18, height: 18 }}
            >
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          }
        />

        {/* 内容创作 */}
        <NavItem
          label="内容创作"
          icon={
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              style={{ width: 18, height: 18 }}
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          }
        />
      </div>

      {/* Nav: 增长 */}
      <div style={{ padding: '0 12px', marginBottom: 32 }}>
        <div
          style={{
            fontSize: 11,
            color: 'var(--text-tertiary)',
            textTransform: 'uppercase',
            letterSpacing: 1,
            padding: '0 12px',
            marginBottom: 8,
          }}
        >
          增长
        </div>

        {/* 发现用户 */}
        <NavItem
          label="发现用户"
          icon={
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              style={{ width: 18, height: 18 }}
            >
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          }
        />

        {/* 互动管理 */}
        <NavItem
          label="互动管理"
          icon={
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              style={{ width: 18, height: 18 }}
            >
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
          }
        />

        {/* 数据分析 */}
        <NavItem
          label="数据分析"
          icon={
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              style={{ width: 18, height: 18 }}
            >
              <path d="M12 20v-6M6 20V10M18 20V4" />
            </svg>
          }
        />
      </div>

      {/* Nav: 设置 */}
      <div style={{ padding: '0 12px', marginBottom: 32 }}>
        <div
          style={{
            fontSize: 11,
            color: 'var(--text-tertiary)',
            textTransform: 'uppercase',
            letterSpacing: 1,
            padding: '0 12px',
            marginBottom: 8,
          }}
        >
          设置
        </div>

        {/* 监控设置 */}
        <NavItem
          label="监控设置"
          icon={
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              style={{ width: 18, height: 18 }}
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v6m0 6v6m4.22-10.22l4.24-4.24M6.34 17.66l-4.24 4.24M23 12h-6m-6 0H1m20.24 4.24l-4.24-4.24M6.34 6.34L2.1 2.1" />
            </svg>
          }
        />
      </div>

      {/* Footer */}
      <div style={{ marginTop: 'auto', padding: 16 }}>
        {user && <UserCard user={user} />}
        <button
          type="button"
          onClick={logout}
          style={{
            width: '100%',
            marginTop: 4,
            padding: '10px 12px',
            border: 'none',
            borderRadius: 8,
            background: 'transparent',
            color: 'var(--text-tertiary)',
            fontSize: 12,
            cursor: 'pointer',
            transition: 'color 0.15s, background 0.15s',
            fontFamily: 'inherit',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--text-secondary)'
            e.currentTarget.style.background = 'var(--bg-hover)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-tertiary)'
            e.currentTarget.style.background = 'transparent'
          }}
        >
          退出登录
        </button>
      </div>
    </aside>
  )
}

/** 非 active 导航项 */
function NavItem({ label, icon }: { label: string; icon: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 12px',
        margin: '2px 0',
        borderRadius: 8,
        cursor: 'pointer',
        transition: 'all 0.15s',
        color: 'var(--text-secondary)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--bg-hover)'
        e.currentTarget.style.color = 'var(--text)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent'
        e.currentTarget.style.color = 'var(--text-secondary)'
      }}
    >
      {icon}
      <span>{label}</span>
    </div>
  )
}
