import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { ConfigProvider, theme } from 'antd'
import zhCN from 'antd/locale/zh_CN'

const STORAGE_KEY = 'social-tool-theme'

export type ThemeMode = 'light' | 'dark'

type ThemeModeContextValue = {
  mode: ThemeMode
  setMode: (m: ThemeMode) => void
  toggleTheme: () => void
}

const ThemeModeContext = createContext<ThemeModeContextValue | null>(null)

function readStoredMode(): ThemeMode {
  try {
    const s = localStorage.getItem(STORAGE_KEY)
    if (s === 'light' || s === 'dark') return s
  } catch {
    /* ignore */
  }
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: light)').matches) {
    return 'light'
  }
  return 'dark'
}

export function useThemeMode(): ThemeModeContextValue {
  const ctx = useContext(ThemeModeContext)
  if (!ctx) {
    throw new Error('useThemeMode must be used within AppThemeProvider')
  }
  return ctx
}

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => readStoredMode())

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m)
    try {
      localStorage.setItem(STORAGE_KEY, m)
    } catch {
      /* ignore */
    }
  }, [])

  const toggleTheme = useCallback(() => {
    setModeState((prev) => {
      const next: ThemeMode = prev === 'dark' ? 'light' : 'dark'
      try {
        localStorage.setItem(STORAGE_KEY, next)
      } catch {
        /* ignore */
      }
      return next
    })
  }, [])

  useLayoutEffect(() => {
    document.documentElement.setAttribute('data-theme', mode)
  }, [mode])

  const antdTheme = useMemo(
    () => ({
      algorithm: mode === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
      token: {
        borderRadius: 8,
        ...(mode === 'dark'
          ? {
              colorBgLayout: '#0a0a0b',
              colorBgContainer: '#111214',
              colorBorderSecondary: '#1f2024',
            }
          : {
              colorBgLayout: '#f5f5f5',
              colorBgContainer: '#ffffff',
              colorBorderSecondary: '#f0f0f0',
            }),
      },
      components: {
        Menu: {
          itemHeight: 46,
          itemMarginInline: 10,
          iconMarginInlineEnd: 10,
          collapsedIconSize: 18,
          ...(mode === 'dark'
            ? {
                darkItemBg: 'transparent',
                darkSubMenuItemBg: 'transparent',
              }
            : {}),
        },
        Layout: {
          headerPadding: '0 24px',
          ...(mode === 'dark'
            ? {
                siderBg: '#000000',
                bodyBg: '#0a0a0b',
                headerBg: '#0a0a0b',
              }
            : {
                siderBg: '#ffffff',
                bodyBg: '#f5f5f5',
                headerBg: '#ffffff',
              }),
        },
      },
    }),
    [mode],
  )

  const value = useMemo(
    () => ({ mode, setMode, toggleTheme }),
    [mode, setMode, toggleTheme],
  )

  return (
    <ThemeModeContext.Provider value={value}>
      <ConfigProvider locale={zhCN} theme={antdTheme}>
        {children}
      </ConfigProvider>
    </ThemeModeContext.Provider>
  )
}
