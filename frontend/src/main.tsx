import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App'
import { ErrorBoundary } from './components/common/ErrorBoundary'
import { AppThemeProvider } from './theme/ThemeProvider'
import { queryClient } from './lib/queryClient'

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
