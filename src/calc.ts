import { addDays, paymentsBetween } from './schedule'
import type { Cycle, RefItem, Subscription } from './types'

const krw = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 })
const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })

/** 영수증 표기용. 통화 기호 없이 천 단위 구분만 함 */
export const formatNum = (n: number) => krw.format(Math.round(n))
export const formatKRW = (n: number) => `₩${formatNum(n)}`
export const formatPrice = (s: Subscription) => (s.currency === 'USD' ? usd.format(s.price) : formatKRW(s.price))

export const unitKRW = (s: Subscription, usdRate: number) => (s.currency === 'USD' ? s.price * usdRate : s.price)

const DEFAULT_COUNT: Record<Cycle, number> = { weekly: 52, monthly: 12, yearly: 1 }

export interface ReceiptLine {
  item: Subscription
  count: number
  amount: number
}

export interface Receipt {
  from: Date
  to: Date
  lines: ReceiptLine[]
  voided: ReceiptLine[]
  total: number
  saved: number
  monthlyAvg: number
  conversions: { ref: RefItem; qty: number }[]
}

/** 오늘부터 1년간 실제 결제 횟수 기준 영수증. 결제일 미입력 시 주기별 기본 횟수 적용 */
export function buildReceipt(items: Subscription[], usdRate: number, refs: RefItem[], today: Date): Receipt {
  const to = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate())

  const toLine = (item: Subscription): ReceiptLine => {
    const count = item.startDate ? paymentsBetween(item, today, to).length : DEFAULT_COUNT[item.cycle]
    return { item, count, amount: count * unitKRW(item, usdRate) }
  }
  const byAmount = (a: ReceiptLine, b: ReceiptLine) => b.amount - a.amount

  const lines = items.filter((s) => s.active).map(toLine).sort(byAmount)
  const voided = items.filter((s) => !s.active).map(toLine).sort(byAmount)
  const total = lines.reduce((sum, l) => sum + l.amount, 0)

  return {
    from: today,
    to: addDays(to, -1),
    lines,
    voided,
    total,
    saved: voided.reduce((sum, l) => sum + l.amount, 0),
    monthlyAvg: total / 12,
    conversions: refs.filter((r) => r.price > 0).map((ref) => ({ ref, qty: total / ref.price })),
  }
}

export function footerMessage(total: number): string {
  if (total <= 0) return '오늘도 구독상회를 찾아주셔서 감사합니다.'
  if (total < 120_000) return '알뜰한 고객님, 다음에도 이 정도만 부탁드려요.'
  if (total < 500_000) return '평범한 구독 생활. 그래도 한 번쯤 점검해 볼까요?'
  if (total < 1_200_000) return '1년이면 꽤 큰돈이에요. 안 쓰는 구독은 없나요?'
  return 'VIP 고객님, 늘 단골이 되어주셔서 감사합니다… 정말로요.'
}

/** 영수증 번호·바코드용 간단 해시 (보안 용도 아님) */
export function hashString(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}
