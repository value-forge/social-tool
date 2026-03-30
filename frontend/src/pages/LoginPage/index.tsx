import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { message } from 'antd'
import { useAuth } from '../../hooks/useAuth'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      void message.warning('请输入邮箱')
      return
    }
    if (!EMAIL_RE.test(trimmedEmail)) {
      void message.warning('邮箱格式不正确')
      return
    }
    if (!password) {
      void message.warning('请输入密码')
      return
    }

    setLoading(true)
    try {
      await login(trimmedEmail, password)
      if (remember) {
        localStorage.setItem('remember', '1')
      } else {
        localStorage.removeItem('remember')
      }
      navigate('/', { replace: true })
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      const msg = error.response?.data?.message || '登录失败，请重试'
      void message.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 500,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: 'var(--bg)',
        backgroundImage: [
          'radial-gradient(ellipse 90% 60% at 50% -30%, rgba(255,255,255,0.07), transparent)',
          'radial-gradient(ellipse 70% 50% at 100% 80%, rgba(255,255,255,0.04), transparent)',
        ].join(', '),
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 400,
          padding: '40px 36px 36px',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
        }}
      >
        <h1
          style={{
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: -0.5,
            marginBottom: 8,
            color: 'var(--text)',
          }}
        >
          Social Tool
        </h1>
        <p
          style={{
            color: 'var(--text-secondary)',
            fontSize: 14,
            lineHeight: 1.5,
            marginBottom: 28,
          }}
        >
          登录以监控大V动态、管理互动与增长数据
        </p>

        <form onSubmit={(e) => void handleSubmit(e)}>
          <div style={{ marginBottom: 18 }}>
            <label className="proto-label" htmlFor="loginEmail">
              邮箱或用户名
            </label>
            <input
              type="text"
              id="loginEmail"
              className="proto-input"
              placeholder="hello@example.com"
              autoComplete="username"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div style={{ marginBottom: 18 }}>
            <label className="proto-label" htmlFor="loginPassword">
              密码
            </label>
            <input
              type="password"
              id="loginPassword"
              className="proto-input"
              placeholder="输入密码"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 22,
              flexWrap: 'wrap',
              gap: 10,
            }}
          >
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                cursor: 'pointer',
                fontSize: 14,
                color: 'var(--text)',
              }}
            >
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                style={{ width: 18, height: 18, accentColor: 'var(--text)' }}
              />
              <span>记住登录</span>
            </label>
            <span
              style={{
                fontSize: 13,
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'color 0.15s',
              }}
            >
              忘记密码？
            </span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-white"
            style={{ width: '100%', justifyContent: 'center' }}
          >
            {loading ? '登录中...' : '登录'}
          </button>
        </form>

        <p
          style={{
            marginTop: 20,
            fontSize: 12,
            color: 'var(--text-tertiary)',
            textAlign: 'center',
            lineHeight: 1.5,
          }}
        >
          提示：密码固定为 88888888
        </p>
      </div>
    </div>
  )
}
