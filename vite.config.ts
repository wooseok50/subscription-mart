import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

const SECURITY_CONTACT = 'mailto:woosuck6008@gmail.com'

/** 로컬 preview에서 배포와 같은 보안 헤더(CSP 등) 검증용. vercel.json 전역 규칙 재사용 */
function deployHeaders(): Record<string, string> {
  const config = JSON.parse(readFileSync(new URL('./vercel.json', import.meta.url), 'utf8')) as {
    headers: { source: string; headers: { key: string; value: string }[] }[]
  }
  const global = config.headers.find((h) => h.source === '/(.*)')
  return Object.fromEntries((global?.headers ?? []).map((h) => [h.key, h.value]))
}

/**
 * 사이트 절대 주소
 * 우선순위: SITE_URL 직접 지정 > Vercel 프로덕션 도메인(VERCEL_PROJECT_PRODUCTION_URL, 프로토콜 미포함)
 */
function resolveSiteUrl(): string {
  const raw = process.env.SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '')
  return raw.replace(/\/+$/, '')
}

/** OG·canonical 태그용 절대 주소 치환 */
function siteUrl(url: string): Plugin {
  return {
    name: 'site-url',
    transformIndexHtml: (html) => html.replaceAll('__SITE_URL__', url),
  }
}

/**
 * RFC 9116 security.txt 생성
 * Expires는 빌드 시점 기준 1년. 재배포 시 자동 갱신, 배포가 끊기면 만료되어 정보 신선도 표시
 */
function securityTxt(url: string): Plugin {
  return {
    name: 'security-txt',
    apply: 'build',
    generateBundle() {
      const expires = new Date(Date.now() + 365 * 86_400_000).toISOString()
      const lines = [
        `Contact: ${SECURITY_CONTACT}`,
        `Expires: ${expires}`,
        'Preferred-Languages: ko, en',
        ...(url ? [`Canonical: ${url}/.well-known/security.txt`] : []),
      ]
      this.emitFile({ type: 'asset', fileName: '.well-known/security.txt', source: lines.join('\n') + '\n' })
    },
  }
}

/**
 * @fontsource CSS에서 woff 대체 경로 제거
 * 지원 대상 브라우저는 모두 woff2를 읽으므로 woff는 미사용. CSS 크기와 배포 파일 수 감소 목적
 */
function woff2Only(): Plugin {
  return {
    name: 'woff2-only',
    enforce: 'pre',
    transform(code, id) {
      if (!id.includes('@fontsource') || !id.endsWith('.css')) return null
      return { code: code.replace(/,\s*url\([^)]*\.woff\)\s*format\(['"]woff['"]\)/g, ''), map: null }
    },
  }
}

const SITE = resolveSiteUrl()

// https://vite.dev/config/
export default defineConfig({
  plugins: [woff2Only(), react(), siteUrl(SITE), securityTxt(SITE)],
  build: {
    // 작은 폰트 subset이 data: URI로 인라인되면 CSP font-src 'self'에 차단되므로 폰트는 항상 파일로 분리함
    assetsInlineLimit: (file) => (/\.woff2?$/.test(file) ? false : undefined),
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        privacy: fileURLToPath(new URL('./privacy.html', import.meta.url)),
      },
    },
  },
  preview: { headers: deployHeaders() },
})
