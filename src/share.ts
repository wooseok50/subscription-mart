import { parseData } from './storage'
import { isThemeId } from './themes'
import { CATEGORIES, type AppData, type Cycle } from './types'

const PREFIX = '#s='
const MAX_HASH = 16_000
const CYCLES: Cycle[] = ['weekly', 'monthly', 'yearly']

const toB64Url = (bytes: Uint8Array) => {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
const fromB64Url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))

/**
 * 공유 링크용 압축 표현. 해시(#)는 서버로 전송되지 않음
 * [이름, 가격, 통화(0원/1달러), 주기 index, 분류 index, 사용(1/0), 결제일|0]
 */
export function encodeShare(data: AppData): string {
  const payload = {
    v: 1,
    r: data.usdRate,
    t: data.theme,
    i: data.items.map((s) => [
      s.name,
      s.price,
      s.currency === 'USD' ? 1 : 0,
      CYCLES.indexOf(s.cycle),
      Math.max(0, (CATEGORIES as readonly string[]).indexOf(s.category)),
      s.active ? 1 : 0,
      s.startDate ?? 0,
    ]),
  }
  return PREFIX + toB64Url(new TextEncoder().encode(JSON.stringify(payload)))
}

/** 외부 입력이므로 형식 변환 후 parseData 검증을 그대로 거침 */
export function decodeShare(hash: string): AppData | null {
  if (!hash.startsWith(PREFIX) || hash.length > MAX_HASH) return null
  try {
    const json: unknown = JSON.parse(new TextDecoder().decode(fromB64Url(hash.slice(PREFIX.length))))
    if (typeof json !== 'object' || json === null) return null
    const p = json as Record<string, unknown>
    if (p.v !== 1 || !Array.isArray(p.i)) return null
    const items = p.i.map((row: unknown, idx) => {
      if (!Array.isArray(row)) return null
      const [name, price, cur, cyc, cat, active, start] = row as unknown[]
      return {
        id: `shared-${idx}`,
        name,
        price,
        currency: cur === 1 ? 'USD' : 'KRW',
        cycle: typeof cyc === 'number' ? CYCLES[cyc] : undefined,
        category: typeof cat === 'number' ? CATEGORIES[cat] : undefined,
        active: active !== 0,
        startDate: typeof start === 'string' ? start : null,
      }
    })
    const data = parseData({ usdRate: p.r, items, theme: isThemeId(p.t) ? p.t : 'mart' })
    return data && data.items.length > 0 ? data : null
  } catch {
    return null
  }
}

export function shareUrl(data: AppData): string {
  return `${location.origin}${location.pathname}${encodeShare(data)}`
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  // 일부 브라우저의 다운로드 시작 전 해제 방지
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export type ShareResult = 'shared' | 'downloaded' | 'copied' | 'cancelled' | 'failed'

const isAbort = (e: unknown) => e instanceof DOMException && e.name === 'AbortError'

/** 이미지 파일 공유 가능 시 공유 시트, 불가 시 다운로드 */
export async function shareImage(blob: Blob, filename: string, text: string): Promise<ShareResult> {
  const file = new File([blob], filename, { type: 'image/png' })
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text })
      return 'shared'
    } catch (e) {
      if (isAbort(e)) return 'cancelled'
    }
  }
  downloadBlob(blob, filename)
  return 'downloaded'
}

export async function copyText(text: string): Promise<ShareResult> {
  try {
    await navigator.clipboard.writeText(text)
    return 'copied'
  } catch {
    return 'failed'
  }
}

/** 링크 공유. 공유 시트 미지원 시 클립보드 복사 */
export async function shareLink(url: string, title: string, text: string): Promise<ShareResult> {
  if (navigator.share) {
    try {
      await navigator.share({ url, title, text })
      return 'shared'
    } catch (e) {
      if (isAbort(e)) return 'cancelled'
    }
  }
  return copyText(url)
}
