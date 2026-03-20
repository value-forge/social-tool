import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { twitterCallback } from '../../api/auth'

export default function CallbackPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const savedState = sessionStorage.getItem('oauth_state')
    const codeVerifier = sessionStorage.getItem('oauth_code_verifier')

    if (!code || !state || !codeVerifier) {
      setError('缺少必要的 OAuth 参数')
      return
    }

    if (state !== savedState) {
      setError('OAuth state 不匹配，可能存在 CSRF 攻击')
      return
    }

    twitterCallback(code, state, codeVerifier)
      .then((result) => {
        localStorage.setItem('access_token', result.access_token)
        localStorage.setItem('refresh_token', result.refresh_token)
        sessionStorage.removeItem('oauth_state')
        sessionStorage.removeItem('oauth_code_verifier')
        navigate('/', { replace: true })
      })
      .catch((err) => {
        console.error('Login failed:', err)
        setError('登录失败，请重试')
      })
  }, [searchParams, navigate])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div
          className="p-8 rounded-2xl border text-center"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
        >
          <div className="text-4xl mb-4">❌</div>
          <p style={{ color: 'var(--danger)' }}>{error}</p>
          <button
            onClick={() => navigate('/login')}
            className="mt-4 px-4 py-2 rounded-lg"
            style={{ background: 'var(--accent-blue)', color: '#fff' }}
          >
            返回登录
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
      <div className="text-center">
        <div className="animate-spin text-4xl mb-4">⏳</div>
        <p style={{ color: 'var(--text-secondary)' }}>正在登录中...</p>
      </div>
    </div>
  )
}
