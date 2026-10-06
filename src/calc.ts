import { addDays, daysBetween, parseDate, paymentsBetween } from './schedule'
import type { Cycle, RefItem, Subscription } from './types'

const krw = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 })
const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })

/** 영수증 표기용. 통화 기호 없이 천 단위 구분만 함 */
export const formatNum = (n: number) => krw.format(Math.round(n))
export const formatKRW = (n: number) => `₩${formatNum(n)}`
export const formatPrice = (s: Subscription) => (s.currency === 'USD' ? usd.format(s.price) : formatKRW(s.price))
export const formatQty = (q: number) => (q >= 10 ? formatNum(q) : q.toFixed(1))

export const unitKRW = (s: Subscription, usdRate: number) => (s.currency === 'USD' ? s.price * usdRate : s.price)

const DEFAULT_COUNT: Record<Cycle, number> = { weekly: 52, monthly: 12, yearly: 1 }

/** year: 오늘부터 1년 / life: 첫 결제일부터 오늘까지 */
export type ReceiptMode = 'year' | 'life'

export interface ReceiptLine {
  item: Subscription
  count: number
  amount: number
  cut: boolean
}

export interface Conversion {
  ref: RefItem
  qty: number
}

export interface Receipt {
  mode: ReceiptMode
  from: Date
  to: Date
  lines: ReceiptLine[]
  voided: ReceiptLine[]
  subtotal: number
  cutAmount: number
  total: number
  saved: number
  days: number
  undated: number
  conversions: Conversion[]
  cutConversion: Conversion | null
}

const convert = (amount: number, refs: RefItem[]) =>
  refs.filter((r) => r.price > 0).map((ref) => ({ ref, qty: amount / ref.price }))

/** 1회 이상 가능한 품목 중 가장 비싼 환산. 없으면 첫 품목 */
export function bestConversion(amount: number, refs: RefItem[]): Conversion | null {
  const list = convert(amount, refs)
  const ok = list.filter((c) => c.qty >= 1).sort((a, b) => b.ref.price - a.ref.price)
  return ok[0] ?? list[0] ?? null
}

/**
 * year: 결제일 기준 실제 결제 횟수. 결제일 미입력 시 주기별 기본 횟수 적용
 * life: 결제일 미입력 품목은 계산 불가로 0 처리
 */
export function buildReceipt(
  items: Subscription[],
  usdRate: number,
  refs: RefItem[],
  today: Date,
  mode: ReceiptMode = 'year',
  cuts: ReadonlySet<string> = new Set(),
): Receipt {
  let from = today
  let to = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate())
  if (mode === 'life') {
    const starts = items.map((s) => parseDate(s.startDate)?.getTime()).filter((t): t is number => t !== undefined)
    from = starts.length ? new Date(Math.min(...starts)) : today
    to = addDays(today, 1)
  }

  const toLine = (item: Subscription): ReceiptLine => {
    const count = item.startDate ? paymentsBetween(item, from, to).length : mode === 'year' ? DEFAULT_COUNT[item.cycle] : 0
    return { item, count, amount: count * unitKRW(item, usdRate), cut: mode === 'year' && cuts.has(item.id) }
  }
  const byAmount = (a: ReceiptLine, b: ReceiptLine) => b.amount - a.amount

  const lines = items.filter((s) => s.active).map(toLine).sort(byAmount)
  const voided = items.filter((s) => !s.active).map(toLine).sort(byAmount)
  const subtotal = lines.reduce((sum, l) => sum + l.amount, 0)
  const cutAmount = lines.filter((l) => l.cut).reduce((sum, l) => sum + l.amount, 0)
  const total = subtotal - cutAmount

  return {
    mode,
    from,
    to: addDays(to, -1),
    lines,
    voided,
    subtotal,
    cutAmount,
    total,
    saved: mode === 'year' ? voided.reduce((sum, l) => sum + l.amount, 0) : 0,
    days: daysBetween(from, to),
    undated: items.filter((s) => s.active && !s.startDate).length,
    conversions: convert(total, refs),
    cutConversion: cutAmount > 0 ? bestConversion(cutAmount, refs) : null,
  }
}

export function footerMessage(receipt: Receipt): string {
  const { total, mode } = receipt
  if (mode === 'life') {
    if (total <= 0) return '결제일을 적으면 지금까지 낸 돈을 계산해 드려요.'
    if (total < 500_000) return '차곡차곡 낸 구독료, 잘 쓰고 계신가요?'
    if (total < 3_000_000) return '지금까지 꽤 많이 내셨네요. 수고 많으셨어요.'
    return '구독상회 명예의 전당에 오르셨습니다.'
  }
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

/** 시드 기반 바코드 막대 목록. 화면·이미지 공용 */
export function barcodeBars(seed: number, width = 220): { x: number; w: number }[] {
  let s = seed || 1
  const bars: { x: number; w: number }[] = []
  let x = 0
  while (x < width) {
    s = (Math.imul(s, 1103515245) + 12345) >>> 0
    const w = 1 + (s % 3)
    bars.push({ x, w })
    x += w + 1 + ((s >> 8) % 3)
  }
  return bars
}
