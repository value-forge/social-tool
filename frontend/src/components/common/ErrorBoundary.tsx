import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('React ErrorBoundary:', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--bg-primary)' }}>
          <div
            className="max-w-lg rounded-xl border p-6"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
          >
            <h1 className="text-lg font-semibold mb-2">页面渲染出错</h1>
            <pre className="text-xs whitespace-pre-wrap break-all opacity-80 mb-4" style={{ color: 'var(--danger)' }}>
              {this.state.error.message}
            </pre>
            <button
              type="button"
              className="px-4 py-2 rounded-lg text-sm"
              style={{ background: 'var(--accent-blue)', color: '#fff' }}
              onClick={() => window.location.reload()}
            >
              刷新重试
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
