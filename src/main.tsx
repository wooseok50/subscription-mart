import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/gowun-dodum/400.css'
import '@fontsource/nanum-gothic-coding/400.css'
import '@fontsource/nanum-gothic-coding/700.css'
import '@fontsource/nanum-pen-script/400.css'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
