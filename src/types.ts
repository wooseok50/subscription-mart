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

export interface AppData {
  version: 2
  usdRate: number
  items: Subscription[]
  refs: RefItem[]
}

export const CATEGORIES = ['영상', '음악', '클라우드', '생산성', '게임', '쇼핑', '교육', '기타'] as const

export const CATEGORY_COLOR: Record<string, string> = {
  영상: '#d9534f',
  음악: '#3f8f6b',
  클라우드: '#3d6fb6',
  생산성: '#7a55b5',
  게임: '#d98a1c',
  쇼핑: '#c2577f',
  교육: '#2c8c99',
  기타: '#7d7469',
}

export const CYCLE_LABEL: Record<Cycle, string> = {
  weekly: '매주',
  monthly: '매월',
  yearly: '매년',
}
