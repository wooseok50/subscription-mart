import { describe, expect, it } from 'vitest'
import { buildIcs, escapeText, foldLine, needsExplicitDates } from './ics'
import { parseDate } from './schedule'
import type { Subscription } from './types'

const today = parseDate('2026-10-12')!
const now = new Date(Date.UTC(2026, 9, 12, 3, 4, 5))
const sub = (over: Partial<Subscription>): Subscription => ({
  id: 'id1',
  name: '넷플릭스',
  price: 17000,
  currency: 'KRW',
  cycle: 'monthly',
  category: '영상',
  active: true,
  startDate: '2023-09-15',
  ...over,
})
const events = (text: string) => text.split('BEGIN:VEVENT').length - 1
const unfold = (text: string) => text.replace(/\r\n /g, '')

describe('escapeText', () => {
  it('특수문자 이스케이프', () => expect(escapeText('a,b;c\\d\ne')).toBe('a\\,b\\;c\\\\d\\ne'))
})

describe('foldLine', () => {
  it('75옥텟 이하 유지, 한글 중간 절단 없음', () => {
    const folded = foldLine('SUMMARY:' + '가'.repeat(60))
    const enc = new TextEncoder()
    for (const part of folded.split('\r\n')) expect(enc.encode(part).length).toBeLessThanOrEqual(75)
    expect(folded.replace(/\r\n /g, '')).toBe('SUMMARY:' + '가'.repeat(60))
  })
})

describe('needsExplicitDates', () => {
  it('29~31일 월 결제만 개별 일정', () => {
    expect(needsExplicitDates(sub({ startDate: '2026-01-28' }))).toBe(false)
    expect(needsExplicitDates(sub({ startDate: '2026-01-29' }))).toBe(true)
    expect(needsExplicitDates(sub({ startDate: '2026-01-31' }))).toBe(true)
  })
  it('2월 29일 연 결제만 개별 일정', () => {
    expect(needsExplicitDates(sub({ cycle: 'yearly', startDate: '2028-02-29' }))).toBe(true)
    expect(needsExplicitDates(sub({ cycle: 'yearly', startDate: '2026-01-31' }))).toBe(false)
  })
})

describe('buildIcs', () => {
  it('일반 월 결제는 RRULE 하나, 다음 결제일부터 시작', () => {
    const { text, exported } = buildIcs([sub({})], 1400, today, now)
    expect(exported).toBe(1)
    expect(events(text)).toBe(1)
    expect(text).toContain('DTSTART;VALUE=DATE:20261015')
    expect(text).toContain('DTEND;VALUE=DATE:20261016')
    expect(text).toContain('RRULE:FREQ=MONTHLY')
    expect(text).toContain('DTSTAMP:20261012T030405Z')
  })

  it('31일 결제는 말일 보정 날짜로 24개 개별 생성', () => {
    const { text } = buildIcs([sub({ startDate: '2026-01-31' })], 1400, today, now)
    expect(events(text)).toBe(24)
    expect(text).not.toContain('RRULE')
    expect(text).toContain('DTSTART;VALUE=DATE:20261031')
    expect(text).toContain('DTSTART;VALUE=DATE:20261130')
    expect(text).toContain('DTSTART;VALUE=DATE:20270228')
  })

  it('30일 결제의 다음 회차가 2월이어도 30일 기준 유지', () => {
    const { text } = buildIcs([sub({ startDate: '2026-01-30' })], 1400, parseDate('2027-02-01')!, now)
    expect(text).toContain('DTSTART;VALUE=DATE:20270228')
    expect(text).toContain('DTSTART;VALUE=DATE:20270330')
  })

  it('주간·연간 RRULE', () => {
    expect(buildIcs([sub({ cycle: 'weekly', startDate: '2026-10-01' })], 1400, today, now).text).toContain('RRULE:FREQ=WEEKLY')
    expect(buildIcs([sub({ cycle: 'yearly', startDate: '2025-11-02' })], 1400, today, now).text).toContain('RRULE:FREQ=YEARLY')
  })

  it('결제일 미입력·일시정지 제외', () => {
    const r = buildIcs([sub({ startDate: null }), sub({ id: 'p', active: false })], 1400, today, now)
    expect(r.exported).toBe(0)
    expect(r.skipped).toBe(1)
    expect(events(r.text)).toBe(0)
  })

  it('USD는 원화 환산 병기, 이름의 특수문자 이스케이프', () => {
    const { text } = buildIcs([sub({ name: 'A, B; C', price: 20, currency: 'USD' })], 1400, today, now)
    expect(unfold(text)).toContain('SUMMARY:💳 A\\, B\\; C 결제 $20.00 (약 ₩28\\,000)')
  })

  it('CRLF 줄바꿈과 필수 속성', () => {
    const { text } = buildIcs([sub({})], 1400, today, now)
    expect(text.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n')).toBe(true)
    expect(text.endsWith('END:VCALENDAR\r\n')).toBe(true)
    expect(text.replace(/\r\n/g, '')).not.toMatch(/\n/)
    expect(text).toContain('PRODID:')
  })
})
