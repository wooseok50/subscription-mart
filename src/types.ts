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
}

export interface AppData {
  version: 1
  usdRate: number
  items: Subscription[]
}

export const CATEGORIES = ['영상', '음악', '클라우드', '생산성', '게임', '쇼핑', '교육', '기타'] as const

export const CYCLE_LABEL: Record<Cycle, string> = {
  weekly: '매주',
  monthly: '매월',
  yearly: '매년',
}
