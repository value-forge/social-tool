import { ConfigProvider, theme } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import type { ReactNode } from 'react'

const darkTheme = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorBgBase: '#0a0a0a',
    colorBgContainer: '#111111',
    colorBgElevated: '#1a1a1a',
    colorBorder: '#222222',
    colorBorderSecondary: '#222222',
    colorText: '#ffffff',
    colorTextSecondary: '#888888',
    colorTextTertiary: '#555555',
    colorSuccess: '#22c55e',
    colorWarning: '#f59e0b',
    colorError: '#ef4444',
    borderRadius: 8,
    borderRadiusLG: 12,
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Inter', 'SF Pro', sans-serif",
  },
}

export function AppThemeProvider({ children }: { children: ReactNode }) {
  return (
    <ConfigProvider locale={zhCN} theme={darkTheme}>
      {children}
    </ConfigProvider>
  )
}
