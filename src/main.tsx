import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/gowun-dodum/400.css'
import '@fontsource/nanum-gothic-coding/400.css'
import '@fontsource/nanum-gothic-coding/700.css'
import '@fontsource/nanum-pen-script/400.css'
import './index.css'
import App from './App.tsx'
import ErrorBoundary from './components/ErrorBoundary'

// 개발 서버에서는 캐시 혼선 방지로 미등록
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
