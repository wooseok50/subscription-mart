import { parseDate } from './schedule'
import { CATEGORIES, type AppData, type RefItem, type Subscription } from './types'

const KEY = 'subscription-calc:v1'
const MAX_ITEMS = 200
const MAX_PRICE = 1_000_000_000

// 환산 기준가는 예시값임. 사용자가 설정에서 직접 수정함
export const DEFAULT_REFS: RefItem[] = [
  { id: 'coffee', emoji: '☕', label: '아메리카노', unit: '잔', price: 4_500 },
  { id: 'chicken', emoji: '🍗', label: '치킨', unit: '마리', price: 23_000 },
  { id: 'movie', emoji: '🎬', label: '영화 관람', unit: '편', price: 15_000 },
  { id: 'trip', emoji: '✈️', label: '제주 왕복 항공', unit: '회', price: 150_000 },
]

export const DEFAULT_DATA: AppData = { version: 2, usdRate: 1400, items: [], refs: DEFAULT_REFS }

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null
const isPrice = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= MAX_PRICE

function parseItem(v: unknown): Subscription | null {
  if (!isRecord(v)) return null
  const name = typeof v.name === 'string' ? v.name.trim().slice(0, 50) : ''
  if (typeof v.id !== 'string' || !name || !isPrice(v.price)) return null
  if (v.currency !== 'KRW' && v.currency !== 'USD') return null
  if (v.cycle !== 'weekly' && v.cycle !== 'monthly' && v.cycle !== 'yearly') return null
  const category = (CATEGORIES as readonly unknown[]).includes(v.category) ? (v.category as string) : '기타'
  const startDate = typeof v.startDate === 'string' && parseDate(v.startDate) ? v.startDate : null
  return {
    id: v.id.slice(0, 64),
    name,
    price: v.price,
    currency: v.currency,
    cycle: v.cycle,
    category,
    active: v.active !== false,
    startDate,
  }
}

function parseRefs(v: unknown): RefItem[] {
  if (!Array.isArray(v)) return DEFAULT_REFS
  // 기본 품목 구성 유지, 가격만 사용자 값 반영
  return DEFAULT_REFS.map((def) => {
    const saved = v.find((r) => isRecord(r) && r.id === def.id) as Record<string, unknown> | undefined
    return saved && isPrice(saved.price) && saved.price > 0 ? { ...def, price: saved.price } : def
  })
}

/** 외부 입력(localStorage, 백업 파일) 검증. v1 데이터도 수용함 */
export function parseData(v: unknown): AppData | null {
  if (!isRecord(v) || !Array.isArray(v.items)) return null
  const rate = typeof v.usdRate === 'number' && v.usdRate > 0 && v.usdRate < 100_000 ? v.usdRate : DEFAULT_DATA.usdRate
  const items = v.items
    .slice(0, MAX_ITEMS)
    .map(parseItem)
    .filter((s): s is Subscription => s !== null)
  return { version: 2, usdRate: rate, items, refs: parseRefs(v.refs) }
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
