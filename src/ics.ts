import { formatKRW, formatPrice, unitKRW } from './calc'
import { addDays, nextPayment, parseDate, paymentsBetween } from './schedule'
import { CYCLE_LABEL, type Subscription } from './types'

/**
 * RFC 5545 iCalendar 생성. 결제일을 종일 일정으로 내보내 캘린더 앱 알림으로 활용
 * 29~31일 월 결제·2월 29일 연 결제는 RRULE이 해당 달을 건너뛰므로(앱은 말일로 당김) 개별 일정으로 생성
 */

const CRLF = '\r\n'
const EXPLICIT_COUNT = 24

const pad = (n: number) => String(n).padStart(2, '0')
const icsDate = (d: Date) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`
const icsStamp = (d: Date) =>
  `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`

/** TEXT 값 이스케이프 (RFC 5545 3.3.11) */
export function escapeText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
}

/** 75옥텟 초과 줄 접기 (RFC 5545 3.1). UTF-8 다중 바이트 문자를 중간에서 자르지 않음 */
export function foldLine(line: string): string {
  const enc = new TextEncoder()
  const out: string[] = []
  let cur = ''
  let bytes = 0
  for (const ch of line) {
    const n = enc.encode(ch).length
    // 이어지는 줄은 앞 공백 1바이트 포함 75옥텟
    const limit = out.length === 0 ? 75 : 74
    if (bytes + n > limit) {
      out.push(cur)
      cur = ''
      bytes = 0
    }
    cur += ch
    bytes += n
  }
  out.push(cur)
  return out.join(CRLF + ' ')
}

/**
 * 말일 보정이 필요한 결제인지 여부
 * 다음 결제일이 아닌 기준일로 판단함 (30일 결제의 다음 회차가 2월 28일이면 RRULE이 28일로 고정되므로)
 */
export function needsExplicitDates(sub: Subscription): boolean {
  const anchor = parseDate(sub.startDate)
  if (!anchor) return false
  if (sub.cycle === 'monthly') return anchor.getDate() > 28
  if (sub.cycle === 'yearly') return anchor.getMonth() === 1 && anchor.getDate() === 29
  return false
}

function rrule(sub: Subscription): string {
  if (sub.cycle === 'weekly') return 'RRULE:FREQ=WEEKLY'
  if (sub.cycle === 'yearly') return 'RRULE:FREQ=YEARLY'
  return 'RRULE:FREQ=MONTHLY'
}

function eventLines(opts: { uid: string; date: Date; stamp: string; summary: string; description: string; rule?: string }): string[] {
  return [
    'BEGIN:VEVENT',
    `UID:${opts.uid}`,
    `DTSTAMP:${opts.stamp}`,
    `DTSTART;VALUE=DATE:${icsDate(opts.date)}`,
    `DTEND;VALUE=DATE:${icsDate(addDays(opts.date, 1))}`,
    ...(opts.rule ? [opts.rule] : []),
    `SUMMARY:${escapeText(opts.summary)}`,
    `DESCRIPTION:${escapeText(opts.description)}`,
    'TRANSP:TRANSPARENT',
    // 전날 오전 9시 알림 (종일 일정 시작 00:00 기준 -15시간)
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'TRIGGER:-PT15H',
    `DESCRIPTION:${escapeText(`내일 ${opts.summary}`)}`,
    'END:VALARM',
    'END:VEVENT',
  ]
}

export interface IcsResult {
  text: string
  /** 내보낸 구독 수 */
  exported: number
  /** 결제일 미입력으로 제외된 구독 수 */
  skipped: number
}

export function buildIcs(items: Subscription[], usdRate: number, today: Date, now: Date = new Date()): IcsResult {
  const stamp = icsStamp(now)
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//subscription-mart//payment-schedule//KO',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:구독상회 결제일',
  ]
  let exported = 0
  let skipped = 0

  for (const sub of items) {
    if (!sub.active) continue
    const first = nextPayment(sub, today)
    if (!first) {
      skipped++
      continue
    }
    exported++
    const amount = sub.currency === 'USD' ? `${formatPrice(sub)} (약 ${formatKRW(unitKRW(sub, usdRate))})` : formatPrice(sub)
    const summary = `💳 ${sub.name} 결제 ${amount}`
    const description = `${CYCLE_LABEL[sub.cycle]} 자동결제 · 구독상회에서 내보낸 일정`
    const uidBase = `${sub.id}@subscription-mart`

    if (needsExplicitDates(sub)) {
      // 말일 보정 날짜를 앱 계산과 동일하게 개별 생성
      const span = sub.cycle === 'yearly' ? 366 * EXPLICIT_COUNT : 31 * EXPLICIT_COUNT
      paymentsBetween(sub, first, addDays(first, span))
        .slice(0, EXPLICIT_COUNT)
        .forEach((date, i) => lines.push(...eventLines({ uid: `${i}-${uidBase}`, date, stamp, summary, description })))
    } else {
      lines.push(...eventLines({ uid: uidBase, date: first, stamp, summary, description, rule: rrule(sub) }))
    }
  }

  lines.push('END:VCALENDAR')
  return { text: lines.map(foldLine).join(CRLF) + CRLF, exported, skipped }
}
