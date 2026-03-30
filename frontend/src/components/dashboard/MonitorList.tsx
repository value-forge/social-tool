import { useState } from 'react'
import type { MonitorAccount } from '../../types'
import { useMonitorList } from '../../hooks/useMonitors'
import MonitorItem from './MonitorItem'
import Pagination from './Pagination'

const PAGE_SIZE = 20

interface MonitorListProps {
  onOpenDetail: (account: MonitorAccount) => void
}

export default function MonitorList({ onOpenDetail }: MonitorListProps) {
  const [page, setPage] = useState(1)
  const { data, isLoading } = useMonitorList({ page, limit: PAGE_SIZE })

  if (isLoading) {
    return (
      <div
        style={{
          padding: '48px 24px',
          textAlign: 'center',
          color: 'var(--text-tertiary)',
          fontSize: 14,
        }}
      >
        加载中...
      </div>
    )
  }

  if (!data || data.list.length === 0) {
    return (
      <div
        style={{
          padding: '48px 24px',
          textAlign: 'center',
          color: 'var(--text-tertiary)',
          fontSize: 14,
        }}
      >
        暂无监控账号
      </div>
    )
  }

  return (
    <div>
      {data.list.map((account) => (
        <MonitorItem
          key={account.id}
          account={account}
          onClick={() => onOpenDetail(account)}
        />
      ))}
      <Pagination
        page={page}
        total={data.total}
        limit={data.limit}
        onChange={setPage}
      />
    </div>
  )
}
