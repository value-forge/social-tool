import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App'
import { ErrorBoundary } from './components/common/ErrorBoundary'
import { AppThemeProvider } from './theme/ThemeProvider'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AppThemeProvider>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </AppThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
)
