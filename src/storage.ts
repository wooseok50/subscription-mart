import { CATEGORIES, type AppData, type Subscription } from './types'

const KEY = 'subscription-calc:v1'
const MAX_ITEMS = 200
const MAX_PRICE = 1_000_000_000

export const DEFAULT_DATA: AppData = { version: 1, usdRate: 1400, items: [] }

function parseItem(v: unknown): Subscription | null {
  if (typeof v !== 'object' || v === null) return null
  const o = v as Record<string, unknown>
  const name = typeof o.name === 'string' ? o.name.trim().slice(0, 50) : ''
  if (typeof o.id !== 'string' || !name) return null
  if (typeof o.price !== 'number' || !Number.isFinite(o.price) || o.price < 0 || o.price > MAX_PRICE) return null
  if (o.currency !== 'KRW' && o.currency !== 'USD') return null
  if (o.cycle !== 'weekly' && o.cycle !== 'monthly' && o.cycle !== 'yearly') return null
  const category = (CATEGORIES as readonly unknown[]).includes(o.category) ? (o.category as string) : '기타'
  return {
    id: o.id.slice(0, 64),
    name,
    price: o.price,
    currency: o.currency,
    cycle: o.cycle,
    category,
    active: o.active !== false,
  }
}

/** 외부 입력(localStorage, 가져오기 파일) 검증용. 잘못된 항목은 버림 */
export function parseData(v: unknown): AppData | null {
  if (typeof v !== 'object' || v === null) return null
  const o = v as Record<string, unknown>
  if (!Array.isArray(o.items)) return null
  const rate = typeof o.usdRate === 'number' && o.usdRate > 0 && o.usdRate < 100_000 ? o.usdRate : DEFAULT_DATA.usdRate
  const items = o.items
    .slice(0, MAX_ITEMS)
    .map(parseItem)
    .filter((s): s is Subscription => s !== null)
  return { version: 1, usdRate: rate, items }
}

// 사생활 보호 모드 등에서 storage 접근 시 예외 가능
export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(KEY)
    return (raw && parseData(JSON.parse(raw))) || DEFAULT_DATA
  } catch {
    return DEFAULT_DATA
  }
}

export function saveData(data: AppData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data))
  } catch {
    // 저장 실패 시 메모리 상태만 유지함
  }
}
