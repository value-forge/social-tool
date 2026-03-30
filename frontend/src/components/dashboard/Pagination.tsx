interface PaginationProps {
  page: number
  total: number
  limit: number
  onChange: (page: number) => void
}

export default function Pagination({
  page,
  total,
  limit,
  onChange,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / limit))

  if (totalPages <= 1) return null

  // Generate page numbers to show
  const pages: number[] = []
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1)) {
      pages.push(i)
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        padding: '14px 24px 18px',
        borderTop: '1px solid var(--border)',
        background: 'var(--bg)',
      }}
      role="navigation"
      aria-label="分页"
    >
      <div>
        <div
          style={{
            fontSize: 13,
            color: 'var(--text-secondary)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          第 {page} / {totalPages} 页
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
          每页 {limit} 条 · 共 {total} 条
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          flexWrap: 'wrap',
        }}
      >
        <button
          className="btn btn-outline btn-sm"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          aria-label="上一页"
        >
          上一页
        </button>

        {pages.map((p) => (
          <button
            key={p}
            onClick={() => onChange(p)}
            style={{
              minWidth: 36,
              height: 36,
              padding: '0 8px',
              borderRadius: 8,
              border: `1px solid ${p === page ? 'var(--text)' : 'var(--border)'}`,
              background: p === page ? 'var(--text)' : 'transparent',
              color: p === page ? 'var(--bg)' : 'var(--text-secondary)',
              fontSize: 13,
              fontVariantNumeric: 'tabular-nums',
              cursor: 'pointer',
              transition: 'border-color 0.15s, color 0.15s, background 0.15s',
              fontFamily: 'inherit',
            }}
            onMouseEnter={(e) => {
              if (p !== page) {
                e.currentTarget.style.borderColor = 'var(--text)'
                e.currentTarget.style.color = 'var(--text)'
              }
            }}
            onMouseLeave={(e) => {
              if (p !== page) {
                e.currentTarget.style.borderColor = 'var(--border)'
                e.currentTarget.style.color = 'var(--text-secondary)'
              }
            }}
          >
            {p}
          </button>
        ))}

        <button
          className="btn btn-outline btn-sm"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
          aria-label="下一页"
        >
          下一页
        </button>
      </div>
    </div>
  )
}
