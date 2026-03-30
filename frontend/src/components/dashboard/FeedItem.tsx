import { useState } from 'react'
import type { TweetFeedItem } from '../../types'

interface FeedItemProps {
  tweet: TweetFeedItem
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso)
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  } catch {
    return iso
  }
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M'
  if (n >= 10_000) return Math.round(n / 1000) + 'k'
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k'
  return String(n)
}

export default function FeedItem({ tweet }: FeedItemProps) {
  const [expanded, setExpanded] = useState(false)

  const author = tweet.author
  const displayName = author?.profile?.displayName || author?.username || '未知'
  const avatar = author?.profile?.avatar || ''
  const username = author?.username || ''
  const initial = displayName.charAt(0) || '?'
  const score = tweet.aiSuggestions?.score ?? null

  const handleClick = () => setExpanded(!expanded)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setExpanded(!expanded)
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        padding: '18px 24px',
        borderBottom: '1px solid var(--border)',
        transition: 'background 0.12s',
        cursor: 'pointer',
        outline: 'none',
        background: expanded ? 'rgba(255,255,255,0.02)' : 'transparent',
      }}
      tabIndex={0}
      aria-expanded={expanded}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={(e) => {
        if (!expanded) e.currentTarget.style.background = 'var(--bg-hover)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = expanded ? 'rgba(255,255,255,0.02)' : 'transparent'
      }}
    >
      {/* Main row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, width: '100%' }}>
        {/* Avatar */}
        {avatar ? (
          <img
            src={avatar}
            alt={displayName}
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              objectFit: 'cover',
              flexShrink: 0,
            }}
          />
        ) : (
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #333, #555)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 600,
              fontSize: 15,
              flexShrink: 0,
            }}
          >
            {initial}
          </div>
        )}

        {/* Body */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Top: name, handle, time */}
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              flexWrap: 'wrap',
              gap: '4px 10px',
            }}
          >
            <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>
              {displayName}
            </span>
            {username && (
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                @{username}
              </span>
            )}
            <span
              style={{
                marginLeft: 'auto',
                fontSize: 12,
                color: 'var(--text-tertiary)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {formatTime(tweet.publishedAt)}
            </span>
          </div>

          {/* Content row: text + metrics + button */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'flex-start',
              gap: '12px 16px',
            }}
          >
            {/* Text */}
            <p
              style={{
                flex: '1 1 220px',
                minWidth: 0,
                margin: 0,
                color: 'var(--text-secondary)',
                fontSize: 13,
                lineHeight: 1.55,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {tweet.text || '(无内容)'}
            </p>

            {/* Metrics */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: '14px 18px',
                flexShrink: 0,
              }}
            >
              {/* Like */}
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                  fontVariantNumeric: 'tabular-nums',
                }}
                title="点赞"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  style={{ width: 14, height: 14, opacity: 0.75, flexShrink: 0 }}
                >
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
                {formatNum(tweet.metrics?.likeCount ?? 0)}
              </span>

              {/* Reply */}
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                  fontVariantNumeric: 'tabular-nums',
                }}
                title="回复"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  style={{ width: 14, height: 14, opacity: 0.75, flexShrink: 0 }}
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                {formatNum(tweet.metrics?.replyCount ?? 0)}
              </span>

              {/* Retweet */}
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                  fontVariantNumeric: 'tabular-nums',
                }}
                title="转发"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  style={{ width: 14, height: 14, opacity: 0.75, flexShrink: 0 }}
                >
                  <polyline points="17 1 21 5 17 9" />
                  <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                  <polyline points="7 23 3 19 7 15" />
                  <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                </svg>
                {formatNum(tweet.metrics?.retweetCount ?? 0)}
              </span>

              {/* Score */}
              {score !== null && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    fontSize: 12,
                    color: 'var(--text)',
                    fontWeight: 600,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                  title="互动得分"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    style={{ width: 14, height: 14, opacity: 0.9, flexShrink: 0 }}
                  >
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                  <span style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>
                    {score}
                  </span>
                  /10
                </span>
              )}
            </div>

            {/* View button */}
            <div
              style={{ flexShrink: 0, marginLeft: 'auto' }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="btn btn-outline btn-sm"
                onClick={() => tweet.url && window.open(tweet.url, '_blank')}
              >
                查看
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && tweet.aiSuggestions && (
        <div
          style={{
            marginTop: 12,
            marginLeft: 58,
            paddingLeft: 14,
            borderLeft: '1px solid var(--border)',
          }}
        >
          <div
            style={{
              fontSize: 13,
              lineHeight: 1.55,
              color: 'var(--text-secondary)',
            }}
          >
            <span style={{ color: 'var(--text-tertiary)' }}>内容总结</span>：
            <span>{tweet.aiSuggestions.summary}</span>
          </div>
          {tweet.aiSuggestions.suggestion && (
            <div
              style={{
                fontSize: 13,
                lineHeight: 1.55,
                color: 'var(--text-secondary)',
                marginTop: 10,
              }}
            >
              <span style={{ color: 'var(--text-tertiary)' }}>建议回复</span>：
              <span>{tweet.aiSuggestions.suggestion.content}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
