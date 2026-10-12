export type Cycle = 'weekly' | 'monthly' | 'yearly'
export type Currency = 'KRW' | 'USD'

export interface Subscription {
  id: string
  name: string
  price: number
  currency: Currency
  cycle: Cycle
  category: string
  active: boolean
  /** 결제 기준일(YYYY-MM-DD). 반복 결제일 계산의 기준 */
  startDate: string | null
}

/** '이 돈이면' 환산 기준 품목 */
export interface RefItem {
  id: string
  emoji: string
  label: string
  unit: string
  price: number
}

export type ThemeId = 'mart' | 'store' | 'cafe' | 'dabang'

export interface AppData {
  version: 2
  usdRate: number
  items: Subscription[]
  refs: RefItem[]
  theme: ThemeId
}

export const CATEGORIES = ['영상', '음악', '클라우드', '생산성', '게임', '쇼핑', '교육', '기타'] as const

export const CATEGORY_COLOR: Record<string, string> = {
  영상: '#ef4b3c',
  음악: '#1fa774',
  클라우드: '#2f7cf6',
  생산성: '#8b5cf6',
  게임: '#f59e0b',
  쇼핑: '#ec4899',
  교육: '#14b8a6',
  기타: '#a1958a',
}

export const CYCLE_LABEL: Record<Cycle, string> = {
  weekly: '매주',
  monthly: '매월',
  yearly: '매년',
}
