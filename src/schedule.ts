import type { Subscription } from './types'

const DAY_MS = 86_400_000

export function parseDate(s: string | null): Date | null {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null
  const [y, m, d] = s.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  // 2월 30일 같은 자동 보정 날짜 차단
  return date.getMonth() === m - 1 && date.getDate() === d ? date : null
}

export function toDateString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function startOfToday(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
export const daysBetween = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / DAY_MS)
const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate()

/** [from, to) 구간의 결제일 목록. 31일 기준 결제는 짧은 달에 말일로 당겨짐 */
export function paymentsBetween(sub: Subscription, from: Date, to: Date): Date[] {
  const start = parseDate(sub.startDate)
  if (!start || to <= from) return []
  const result: Date[] = []
  const push = (d: Date) => {
    if (d >= start && d >= from && d < to) result.push(d)
  }

  if (sub.cycle === 'weekly') {
    const k = Math.max(0, Math.ceil(daysBetween(start, from) / 7))
    for (let d = addDays(start, k * 7); d < to; d = addDays(d, 7)) push(d)
    return result
  }

  const day = start.getDate()
  if (sub.cycle === 'monthly') {
    for (let c = new Date(from.getFullYear(), from.getMonth(), 1); c < to; c = new Date(c.getFullYear(), c.getMonth() + 1, 1)) {
      const y = c.getFullYear()
      const m = c.getMonth()
      push(new Date(y, m, Math.min(day, daysInMonth(y, m))))
    }
    return result
  }

  const month = start.getMonth()
  for (let y = from.getFullYear(); new Date(y, 0, 1) < to; y++) {
    push(new Date(y, month, Math.min(day, daysInMonth(y, month))))
  }
  return result
}

export function nextPayment(sub: Subscription, today: Date): Date | null {
  // 연간 결제도 포함되도록 1년+1일 범위 탐색
  return paymentsBetween(sub, today, addDays(today, 367))[0] ?? null
}
