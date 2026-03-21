import { useState } from 'react'
import axios from 'axios'
import { getTwitterOAuthURL } from '../../api/auth'
import { getApiPrefix } from '../../api/apiPrefix'

function XLogo({ size = 24, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

function Spinner() {
  return (
    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-80" d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const startTwitterOAuth = async (quick: boolean) => {
    setLoading(true)
    setError('')
    try {
      const { url, state, code_verifier } = await getTwitterOAuthURL(quick)
      sessionStorage.setItem('oauth_state', state)
      sessionStorage.setItem('oauth_code_verifier', code_verifier)
      window.location.href = url
    } catch (e) {
      let msg =
        '无法连接后端。请确认：① 已在另一终端运行 Go 服务（默认监听 8000）；② 前端使用 npm run dev 或 npm run preview（已配置代理）；③ 勿用「直接打开 dist/index.html」。'
      if (axios.isAxiosError(e)) {
        if (e.code === 'ERR_NETWORK' || e.message === 'Network Error') {
          msg = `网络无法到达 API（${getApiPrefix()}）。请启动后端：cd backend && go run cmd/server/main.go -conf configs/config.yaml，并确保本页通过 Vite 访问（npm run dev，端口 5173）。`
        } else if (e.response?.data && typeof (e.response.data as { error?: string }).error === 'string') {
          msg = (e.response.data as { error: string }).error
        } else if (e.response?.status) {
          msg = `服务器返回 ${e.response.status}：${e.response.statusText || '请查看后端日志'}`
        }
      }
      setError(msg)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#fafafa' }}>

      <div className="flex-1 flex flex-col items-center justify-center px-5">
        <div className="w-full max-w-[440px]">

          {/* 品牌区 */}
          <div className="flex flex-col items-center mb-12">
            <div
              className="h-[72px] w-[72px] rounded-[22px] flex items-center justify-center mb-7"
              style={{
                background: '#000',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15), 0 1px 3px rgba(0,0,0,0.1)',
              }}
            >
              <XLogo size={34} className="text-white" />
            </div>
            <h1
              className="text-[32px] font-semibold tracking-[-0.04em]"
              style={{ color: '#000', fontFamily: "'Inter', sans-serif" }}
            >
              social_tool
            </h1>
            <p className="mt-3 text-[15px] text-center leading-[1.6]" style={{ color: '#666' }}>
              监控动态 · AI 起草 · 追踪热点
            </p>
          </div>

          {/* 登录卡片 */}
          <div
            className="rounded-2xl px-10 pt-10 pb-9"
            style={{
              background: '#fff',
              boxShadow: '0 0 0 1px rgba(0,0,0,0.04), 0 2px 6px rgba(0,0,0,0.04), 0 12px 40px rgba(0,0,0,0.06)',
            }}
          >
            <p className="text-[14px] font-medium mb-4 text-center" style={{ color: '#333' }}>
              选择一种方式继续
            </p>

            <div
              className="mb-5 rounded-xl px-3 py-3 text-[12px] leading-[1.55]"
              style={{ background: '#f7f7f8', border: '1px solid #eaeaea', color: '#555' }}
            >
              <p className="font-medium mb-1.5" style={{ color: '#333' }}>
                换 X 账号时请看这里
              </p>
              <p className="mb-2">
                在 X 里<strong>解绑 Google 邮箱</strong>不会清掉本浏览器的 X 登录状态。授权页用的是
                <strong> x.com 留在你电脑里的 Cookie</strong>，和「关联邮箱」不是一回事。
              </p>
              <p className="mb-2">
                若授权页仍是旧号：请先在新标签页完成 X 退出，再回这里点「使用 X 账号继续」。
              </p>
              <button
                type="button"
                className="w-full h-9 rounded-lg text-[13px] font-medium cursor-pointer"
                style={{ background: '#fff', border: '1px solid #d0d0d0', color: '#222' }}
                onClick={() => {
                  window.open('https://x.com/logout', '_blank', 'noopener,noreferrer')
                }}
              >
                在新标签页打开 x.com 退出
              </button>
              <p className="mt-2 text-[11px]" style={{ color: '#888' }}>
                若页面要求再点一次「登出」，请在新标签里点确认；也可用浏览器无痕窗口只打开本站再登录。
              </p>
            </div>

            {/* X 登录 */}
            <button
              type="button"
              onClick={() => startTwitterOAuth(false)}
              disabled={loading}
              className="w-full h-[48px] flex items-center justify-center gap-2.5 rounded-xl text-[14px] font-medium cursor-pointer transition-all duration-150 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none"
              style={{
                background: '#000',
                color: '#fff',
                boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#1a1a1a')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#000')}
            >
              {loading ? (
                <Spinner />
              ) : (
                <>
                  <XLogo size={15} className="text-white" />
                  <span>使用 X 账号继续</span>
                </>
              )}
            </button>

            <p className="mt-3 text-[12px] text-center leading-[1.5]" style={{ color: '#888' }}>
              会跳转 X 并<strong style={{ color: '#555' }}>要求重新登录</strong>，以便换成其他账号；若浏览器里仍是旧账号，请在本页用此流程。
            </p>

            <button
              type="button"
              onClick={() => startTwitterOAuth(true)}
              disabled={loading}
              className="mt-2 w-full text-[12px] text-center underline-offset-2 hover:underline cursor-pointer disabled:opacity-40 bg-transparent border-none"
              style={{ color: '#888' }}
            >
              快捷授权（沿用浏览器当前 X 登录，不换号时可用）
            </button>

            {error && (
              <p className="mt-3 text-[13px] text-center" style={{ color: '#e5484d' }}>{error}</p>
            )}

            {/* Google — 禁用 */}
            <button
              type="button"
              disabled
              className="w-full h-[48px] flex items-center justify-center gap-2.5 rounded-xl text-[14px] font-medium mt-3 cursor-not-allowed select-none"
              style={{
                background: '#fff',
                color: '#888',
                border: '1px solid #e5e5e5',
              }}
            >
              <svg viewBox="0 0 24 24" className="h-[16px] w-[16px] opacity-40" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <span className="opacity-50">使用 Google 账号继续</span>
            </button>

            {/* 邮箱 — 禁用 */}
            <button
              type="button"
              disabled
              className="w-full h-[48px] flex items-center justify-center gap-2.5 rounded-xl text-[14px] font-medium mt-3 cursor-not-allowed select-none"
              style={{
                background: '#fff',
                color: '#888',
                border: '1px solid #e5e5e5',
              }}
            >
              <svg viewBox="0 0 20 20" className="h-[16px] w-[16px] opacity-30" fill="#666">
                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
              </svg>
              <span className="opacity-50">使用邮箱继续</span>
            </button>
          </div>

          {/* 卡片下方说明 */}
          <p className="mt-6 text-[12px] text-center leading-[1.6]" style={{ color: '#999' }}>
            仅获取读取权限，不会代你发布任何内容
          </p>
        </div>
      </div>

      {/* 页脚 */}
      <footer className="py-8 flex flex-col items-center gap-1">
        <p className="text-[11px]" style={{ color: '#aaa' }}>
          继续即表示你同意使用条款与隐私政策
        </p>
        <p className="text-[11px]" style={{ color: '#ccc' }}>
          © {new Date().getFullYear()} social_tool
        </p>
      </footer>
    </div>
  )
}
