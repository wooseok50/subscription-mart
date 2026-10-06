import { readFileSync } from 'node:fs'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

/** 로컬 preview에서 배포와 같은 보안 헤더(CSP 등) 검증용. vercel.json 전역 규칙 재사용 */
function deployHeaders(): Record<string, string> {
  const config = JSON.parse(readFileSync(new URL('./vercel.json', import.meta.url), 'utf8')) as {
    headers: { source: string; headers: { key: string; value: string }[] }[]
  }
  const global = config.headers.find((h) => h.source === '/(.*)')
  return Object.fromEntries((global?.headers ?? []).map((h) => [h.key, h.value]))
}

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
  build: {
    // 작은 폰트 subset이 data: URI로 인라인되면 CSP font-src 'self'에 차단되므로 폰트는 항상 파일로 분리함
    assetsInlineLimit: (file) => (/\.woff2?$/.test(file) ? false : undefined),
  },
  preview: { headers: deployHeaders() },
})
