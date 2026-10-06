import { describe, expect, it } from 'vitest'
import { nextPayment, parseDate, paymentsBetween, toDateString } from './schedule'
import type { Subscription } from './types'

const sub = (over: Partial<Subscription>): Subscription => ({
  id: 't',
  name: 'test',
  price: 1000,
  currency: 'KRW',
  cycle: 'monthly',
  category: '기타',
  active: true,
  startDate: '2026-01-31',
  ...over,
})
const d = (s: string) => parseDate(s)!
const days = (list: Date[]) => list.map(toDateString)

describe('parseDate', () => {
  it('정상 날짜 파싱', () => expect(toDateString(d('2026-02-28'))).toBe('2026-02-28'))
  it('존재하지 않는 날짜 거부', () => {
    expect(parseDate('2026-02-30')).toBeNull()
    expect(parseDate('2026-13-01')).toBeNull()
  })
  it('형식 오류 거부', () => {
    expect(parseDate('2026/01/01')).toBeNull()
    expect(parseDate('')).toBeNull()
    expect(parseDate(null)).toBeNull()
  })
})

describe('paymentsBetween', () => {
  it('31일 결제는 짧은 달 말일로 당겨짐', () => {
    expect(days(paymentsBetween(sub({}), d('2026-02-01'), d('2026-05-01')))).toEqual(['2026-02-28', '2026-03-31', '2026-04-30'])
  })

  it('윤년 2월 29일 처리', () => {
    expect(days(paymentsBetween(sub({ startDate: '2028-01-31' }), d('2028-02-01'), d('2028-03-01')))).toEqual(['2028-02-29'])
  })

  it('시작일 이전 결제 제외', () => {
    expect(days(paymentsBetween(sub({ startDate: '2026-03-10' }), d('2026-01-01'), d('2026-05-01')))).toEqual(['2026-03-10', '2026-04-10'])
  })

  it('연간 결제는 1년에 한 번', () => {
    const s = sub({ cycle: 'yearly', startDate: '2025-11-02' })
    expect(days(paymentsBetween(s, d('2026-10-06'), d('2027-10-06')))).toEqual(['2026-11-02'])
  })

  it('주간 결제는 7일 간격', () => {
    const s = sub({ cycle: 'weekly', startDate: '2026-10-01' })
    expect(days(paymentsBetween(s, d('2026-10-06'), d('2026-10-23')))).toEqual(['2026-10-08', '2026-10-15', '2026-10-22'])
  })

  it('1년 구간 월 결제 12회', () => {
    expect(paymentsBetween(sub({ startDate: '2023-09-15' }), d('2026-10-06'), d('2027-10-06'))).toHaveLength(12)
  })

  it('결제일 없으면 빈 목록', () => {
    expect(paymentsBetween(sub({ startDate: null }), d('2026-01-01'), d('2027-01-01'))).toEqual([])
  })

  it('다음 결제일 계산', () => {
    expect(toDateString(nextPayment(sub({ startDate: '2026-09-15' }), d('2026-10-06'))!)).toBe('2026-10-15')
  })
})
