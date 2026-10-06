import type { Subscription } from './types'

const krw = new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 })
const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })

export const formatKRW = (n: number) => krw.format(Math.round(n))
export const formatPrice = (s: Subscription) => (s.currency === 'USD' ? usd.format(s.price) : krw.format(s.price))

/** 원화 환산 월 비용. 주간은 연 52주 기준 환산함 */
export function monthlyKRW(s: Subscription, usdRate: number): number {
  const base = s.currency === 'USD' ? s.price * usdRate : s.price
  switch (s.cycle) {
    case 'weekly':
      return (base * 52) / 12
    case 'yearly':
      return base / 12
    default:
      return base
  }
}

export interface CategoryShare {
  category: string
  monthly: number
  ratio: number
}

export function summarize(items: Subscription[], usdRate: number) {
  const active = items.filter((s) => s.active)
  const monthly = active.reduce((sum, s) => sum + monthlyKRW(s, usdRate), 0)

  const byCategory = new Map<string, number>()
  for (const s of active) {
    byCategory.set(s.category, (byCategory.get(s.category) ?? 0) + monthlyKRW(s, usdRate))
  }
  const categories: CategoryShare[] = [...byCategory]
    .map(([category, value]) => ({ category, monthly: value, ratio: monthly > 0 ? value / monthly : 0 }))
    .sort((a, b) => b.monthly - a.monthly)

  return {
    activeCount: active.length,
    monthly,
    yearly: monthly * 12,
    daily: (monthly * 12) / 365,
    categories,
  }
}
