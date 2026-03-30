import { useState } from 'react'
import { useTweetsFeed } from '../../hooks/useTweetsFeed'
import FeedItem from './FeedItem'
import Pagination from './Pagination'

const PAGE_SIZE = 20

export default function FeedList() {
  const [page, setPage] = useState(1)
  const { data, isLoading } = useTweetsFeed({ page, limit: PAGE_SIZE })

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
        暂无动态数据
      </div>
    )
  }

  return (
    <div>
      {data.list.map((tweet) => (
        <FeedItem key={tweet.id} tweet={tweet} />
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
