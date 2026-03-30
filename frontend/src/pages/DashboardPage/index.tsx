import { useState } from 'react'
import type { MonitorAccount } from '../../types'
import Sidebar from '../../components/layout/Sidebar'
import RightPanel from '../../components/layout/RightPanel'
import StatsCards from '../../components/dashboard/StatsCards'
import QuickActions from '../../components/dashboard/QuickActions'
import FeedList from '../../components/dashboard/FeedList'
import MonitorList from '../../components/dashboard/MonitorList'
import AddMonitorModal from '../../components/modals/AddMonitorModal'
import MonitorDetailModal from '../../components/modals/MonitorDetailModal'

type TabKey = 'feed' | 'monitors'

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('feed')
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<MonitorAccount | null>(
    null,
  )

  const openAddModal = () => setAddModalOpen(true)

  const openDetail = (account: MonitorAccount) => {
    setSelectedAccount(account)
    setDetailModalOpen(true)
  }

  return (
    <div className="app-grid">
      {/* Left Sidebar */}
      <Sidebar />

      {/* Center Content */}
      <div
        style={{
          overflowY: 'auto',
          padding: '32px 40px',
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1
            style={{
              fontSize: 32,
              fontWeight: 700,
              marginBottom: 8,
              letterSpacing: -0.5,
              color: 'var(--text)',
            }}
          >
            监控中心
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>
            实时追踪大V动态，把握每一个互动机会
          </p>
        </div>

        {/* Stats Cards */}
        <StatsCards />

        {/* Quick Actions */}
        <QuickActions onAddMonitor={openAddModal} />

        {/* Dynamic Monitor Card */}
        <div
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            marginBottom: 24,
            transition: 'border-color 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-hover)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border)'
          }}
        >
          {/* Card Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '20px 24px',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <div
              style={{
                fontSize: 15,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                color: 'var(--text)',
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              动态监控
            </div>
            <div
              style={{
                fontSize: 13,
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'color 0.15s',
              }}
              onClick={openAddModal}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--text)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-secondary)'
              }}
            >
              + 添加监控
            </div>
          </div>

          {/* Tabs */}
          <div
            style={{
              display: 'flex',
              gap: 4,
              padding: '0 24px',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <button
              onClick={() => setActiveTab('feed')}
              style={{
                padding: '12px 20px',
                fontSize: 14,
                color: activeTab === 'feed' ? 'var(--text)' : 'var(--text-secondary)',
                cursor: 'pointer',
                borderBottom: `2px solid ${activeTab === 'feed' ? 'var(--text)' : 'transparent'}`,
                marginBottom: -1,
                transition: 'all 0.15s',
                background: 'transparent',
                border: 'none',
                borderBottomWidth: 2,
                borderBottomStyle: 'solid',
                borderBottomColor: activeTab === 'feed' ? 'var(--text)' : 'transparent',
                fontFamily: 'inherit',
              }}
            >
              最新动态
            </button>
            <button
              onClick={() => setActiveTab('monitors')}
              style={{
                padding: '12px 20px',
                fontSize: 14,
                color: activeTab === 'monitors' ? 'var(--text)' : 'var(--text-secondary)',
                cursor: 'pointer',
                marginBottom: -1,
                transition: 'all 0.15s',
                background: 'transparent',
                border: 'none',
                borderBottomWidth: 2,
                borderBottomStyle: 'solid',
                borderBottomColor: activeTab === 'monitors' ? 'var(--text)' : 'transparent',
                fontFamily: 'inherit',
              }}
            >
              我的监控列表
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'feed' && <FeedList />}
          {activeTab === 'monitors' && (
            <MonitorList onOpenDetail={openDetail} />
          )}
        </div>
      </div>

      {/* Right Panel */}
      <RightPanel onAddMonitor={openAddModal} />

      {/* Modals */}
      <AddMonitorModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSuccess={() => setAddModalOpen(false)}
      />
      <MonitorDetailModal
        open={detailModalOpen}
        account={selectedAccount}
        onClose={() => setDetailModalOpen(false)}
        onSaved={() => setDetailModalOpen(false)}
      />
    </div>
  )
}
