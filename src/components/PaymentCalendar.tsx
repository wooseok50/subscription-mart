import { useMemo, useState, type CSSProperties } from 'react'
import { formatKRW, unitKRW } from '../calc'
import { addDays, daysBetween, paymentsBetween } from '../schedule'
import { CATEGORY_COLOR, type Subscription } from '../types'

interface Props {
  items: Subscription[]
  usdRate: number
  today: Date
  onSelect: (id: string) => void
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

export default function PaymentCalendar({ items, usdRate, today, onSelect }: Props) {
  const [view, setView] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))
  const active = useMemo(() => items.filter((s) => s.active), [items])
  const undated = active.filter((s) => !s.startDate).length

  const { cells, monthTotal, monthCount, peak } = useMemo(() => {
    const first = view
    const next = new Date(view.getFullYear(), view.getMonth() + 1, 1)
    const byDay = new Map<number, Subscription[]>()
    let total = 0
    let count = 0
    for (const s of active) {
      for (const d of paymentsBetween(s, first, next)) {
        byDay.set(d.getDate(), [...(byDay.get(d.getDate()) ?? []), s])
        total += unitKRW(s, usdRate)
        count++
      }
    }
    // 결제 금액이 가장 큰 날
    let best: { day: number; amount: number } | null = null
    for (const [day, subs] of byDay) {
      const amount = subs.reduce((sum, s) => sum + unitKRW(s, usdRate), 0)
      if (!best || amount > best.amount) best = { day, amount }
    }
    const lead = first.getDay()
    const days = daysBetween(first, next)
    const list: ({ day: number; subs: Subscription[] } | null)[] = Array.from({ length: lead }, () => null)
    for (let d = 1; d <= days; d++) list.push({ day: d, subs: byDay.get(d) ?? [] })
    return { cells: list, monthTotal: total, monthCount: count, peak: best }
  }, [view, active, usdRate])

  const upcoming = useMemo(() => {
    const end = addDays(today, 31)
    return active
      .flatMap((s) => paymentsBetween(s, today, end).map((date) => ({ s, date })))
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 8)
  }, [active, today])

  const isToday = (day: number) =>
    view.getFullYear() === today.getFullYear() && view.getMonth() === today.getMonth() && day === today.getDate()
  const move = (n: number) => setView((v) => new Date(v.getFullYear(), v.getMonth() + n, 1))

  return (
    <div className="calendar-layout">
      <div className="desk-calendar">
        <div className="rings" aria-hidden="true">
          {Array.from({ length: 8 }, (_, i) => (
            <span key={i} />
          ))}
        </div>
        <div className="cal-head">
          <button type="button" className="cal-nav" onClick={() => move(-1)} aria-label="이전 달">
            ‹
          </button>
          <div className="cal-title">
            <span className="cal-year">{view.getFullYear()}</span>
            <span className="cal-month">{view.getMonth() + 1}월</span>
          </div>
          <button type="button" className="cal-nav" onClick={() => move(1)} aria-label="다음 달">
            ›
          </button>
        </div>
        <p className="cal-total">
          {view.getMonth() + 1}월에 빠져나갈 돈 <strong>{formatKRW(monthTotal)}</strong>
        </p>

        <div className="cal-grid" role="grid" aria-label={`${view.getFullYear()}년 ${view.getMonth() + 1}월 결제 일정`}>
          {WEEKDAYS.map((w, i) => (
            <span key={w} className={`cal-wd${i === 0 ? ' sun' : ''}${i === 6 ? ' sat' : ''}`}>
              {w}
            </span>
          ))}
          {cells.map((c, i) =>
            c ? (
              <div key={i} className={`cal-cell${isToday(c.day) ? ' today' : ''}${c.subs.length ? ' has' : ''}${i % 7 === 0 ? ' sun' : ''}`}>
                <span className="cal-day">{c.day}</span>
                {c.subs.map((s) => (
                  <button
                    type="button"
                    key={s.id}
                    className="cal-stub"
                    style={{ '--c': CATEGORY_COLOR[s.category] ?? CATEGORY_COLOR['기타'] } as CSSProperties}
                    onClick={() => onSelect(s.id)}
                    title={`${s.name} ${formatKRW(unitKRW(s, usdRate))}`}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            ) : (
              <span key={i} className="cal-blank" />
            ),
          )}
        </div>
      </div>

      <aside className="upcoming">
        <div className="card month-card">
          <h3>
            {view.getMonth() + 1}월 결제 요약 <small>{view.getFullYear()}</small>
          </h3>
          <dl className="month-stats">
            <div style={{ '--tint': 'var(--tint-sun)' } as CSSProperties}>
              <dt>결제 건수</dt>
              <dd>{monthCount}건</dd>
            </div>
            <div style={{ '--tint': 'var(--tint-peach)' } as CSSProperties}>
              <dt>빠져나갈 돈</dt>
              <dd>{formatKRW(monthTotal)}</dd>
            </div>
            <div className="wide" style={{ '--tint': 'var(--tint-sky)' } as CSSProperties}>
              <dt>지갑이 가장 아픈 날</dt>
              <dd>{peak ? `${view.getMonth() + 1}월 ${peak.day}일 · ${formatKRW(peak.amount)}` : '결제 없음'}</dd>
            </div>
          </dl>
        </div>

        <h3 className="hand">다가오는 결제</h3>
        {upcoming.length === 0 ? (
          <p className="upcoming-empty">30일 안에 예정된 결제가 없어요. 주문서에 결제일을 적으면 여기에 D-day가 떠요.</p>
        ) : (
          <ul>
            {upcoming.map(({ s, date }) => {
              const d = daysBetween(today, date)
              return (
                <li key={s.id + date.getTime()}>
                  <span className={`dday${d <= 3 ? ' soon' : ''}`}>{d === 0 ? 'D-DAY' : `D-${d}`}</span>
                  <span className="up-name">
                    {s.name}
                    <small>
                      {date.getMonth() + 1}/{date.getDate()}
                    </small>
                  </span>
                  <span className="up-amt">{formatKRW(unitKRW(s, usdRate))}</span>
                </li>
              )
            })}
          </ul>
        )}
        {undated > 0 && <p className="muted small">결제일을 안 적은 구독 {undated}개는 달력에 나오지 않아요.</p>}
      </aside>
    </div>
  )
}
