import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

/**
 * OG 태그용 절대 주소 치환
 * 우선순위: SITE_URL 직접 지정 > Vercel 프로덕션 도메인(VERCEL_PROJECT_PRODUCTION_URL, 프로토콜 미포함)
 */
function siteUrl(): Plugin {
  const raw = process.env.SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '')
  const url = raw.replace(/\/+$/, '')
  return {
    name: 'site-url',
    transformIndexHtml: (html) => html.replaceAll('__SITE_URL__', url),
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), siteUrl()],
})
