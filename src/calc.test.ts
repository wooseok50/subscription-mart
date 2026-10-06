import { describe, expect, it } from 'vitest'
import { buildReceipt } from './calc'
import { parseDate } from './schedule'
import { DEFAULT_REFS } from './storage'
import type { Subscription } from './types'

const today = parseDate('2026-10-06')!
const items: Subscription[] = [
  { id: 'n', name: '넷플릭스', price: 17000, currency: 'KRW', cycle: 'monthly', category: '영상', active: true, startDate: '2023-09-15' },
  { id: 'c', name: 'Claude', price: 20, currency: 'USD', cycle: 'monthly', category: '생산성', active: true, startDate: '2025-07-08' },
  { id: 'd', name: '도메인', price: 18000, currency: 'KRW', cycle: 'yearly', category: '기타', active: true, startDate: '2025-11-02' },
  { id: 'p', name: '디즈니+', price: 9900, currency: 'KRW', cycle: 'monthly', category: '영상', active: false, startDate: '2026-05-03' },
  { id: 'u', name: '결제일 없음', price: 1000, currency: 'KRW', cycle: 'weekly', category: '기타', active: true, startDate: null },
]

describe('buildReceipt (year)', () => {
  const r = buildReceipt(items, 1400, DEFAULT_REFS, today)

  it('USD 환산과 실제 결제 횟수 반영', () => {
    // 넷플 17000×12 + Claude 28000×12 + 도메인 18000×1 + 미입력 주간 1000×52
    expect(r.total).toBe(204_000 + 336_000 + 18_000 + 52_000)
  })

  it('일시정지 항목은 합계 제외, 절약액으로 집계', () => {
    expect(r.voided.map((l) => l.item.id)).toEqual(['p'])
    expect(r.saved).toBe(9900 * 12)
  })

  it('결제일 미입력 개수 집계', () => expect(r.undated).toBe(1))
})

describe('해지 시뮬레이션', () => {
  it('선택 항목만큼 할인', () => {
    const r = buildReceipt(items, 1400, DEFAULT_REFS, today, 'year', new Set(['c']))
    expect(r.cutAmount).toBe(336_000)
    expect(r.total).toBe(r.subtotal - 336_000)
    expect(r.cutConversion?.qty).toBeGreaterThan(0)
  })

  it('누적 모드에서는 무시', () => {
    const r = buildReceipt(items, 1400, DEFAULT_REFS, today, 'life', new Set(['c']))
    expect(r.cutAmount).toBe(0)
  })
})

describe('buildReceipt (life)', () => {
  const r = buildReceipt(items, 1400, DEFAULT_REFS, today, 'life')

  it('가장 이른 결제일부터 오늘까지', () => {
    expect(r.from.getTime()).toBe(parseDate('2023-09-15')!.getTime())
  })

  it('결제일 미입력 항목은 0 처리', () => {
    expect(r.lines.find((l) => l.item.id === 'u')?.amount).toBe(0)
  })

  it('넷플릭스 37회 누적', () => {
    expect(r.lines.find((l) => l.item.id === 'n')?.count).toBe(37)
  })
})
