import { useMemo, type CSSProperties } from 'react'
import { formatKRW, unitKRW } from '../calc'
import { daysBetween, nextPayment } from '../schedule'
import type { RefItem, Subscription } from '../types'
import { wrapStats } from '../wrap'

interface Props {
  items: Subscription[]
  usdRate: number
  refs: RefItem[]
  today: Date
  readOnly?: boolean
  onSample?: () => void
  onStart?: () => void
}

const tile = (tint: string, ink: string) => ({ '--tint': `var(--tint-${tint})`, '--tile-ink': `var(--${ink})` }) as CSSProperties

export default function HeroBoard({ items, usdRate, refs, today, readOnly, onSample, onStart }: Props) {
  const stats = useMemo(() => wrapStats(items, usdRate, refs, today), [items, usdRate, refs, today])
  const next = useMemo(() => {
    const list = items
      .filter((s) => s.active)
      .map((s) => ({ s, date: nextPayment(s, today) }))
      .filter((x): x is { s: Subscription; date: Date } => x.date !== null)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
    return list[0] ?? null
  }, [items, today])

  const dateLabel = `${today.getMonth() + 1}월 ${today.getDate()}일`

  if (stats.count === 0) {
    return (
      <aside className="board" aria-label="오늘의 계산대">
        <span className="sticker s1" aria-hidden="true">
          자동결제 ON
        </span>
        <div className="board-empty">
          <p className="big">아직 계산대가 비어 있어요</p>
          <p>예시로 먼저 구경해 보거나, 지금 쓰는 구독을 바로 적어 보세요.</p>
          <div className="btn-row">
            {onSample && (
              <button type="button" className="btn solid" onClick={onSample}>
                예시로 채워보기
              </button>
            )}
            {onStart && (
              <button type="button" className="btn ghost" onClick={onStart}>
                직접 적기 ↓
              </button>
            )}
          </div>
        </div>
      </aside>
    )
  }

  const d = next ? daysBetween(today, next.date) : null

  return (
    <aside className="board" aria-label={readOnly ? '받은 영수증 요약' : '오늘의 계산대'}>
      <span className="sticker s1" aria-hidden="true">
        자동결제 ON
      </span>
      <span className="sticker s2" aria-hidden="true">
        ₩ 매달 쏙
      </span>
      <div className="board-head">
        <h2>{readOnly ? '받은 영수증 요약' : '오늘의 계산대'}</h2>
        <span>{dateLabel} 기준</span>
      </div>
      <div className="board-main">
        <span>한 달 평균</span>
        <strong>{formatKRW(stats.monthly)}</strong>
      </div>
      <div className="board-grid">
        <div className="tile" style={tile('sun', 'text')}>
          <span>1년 합계</span>
          <strong>{formatKRW(stats.total)}</strong>
          <small>하루 {formatKRW(stats.total / 365)}</small>
        </div>
        <div className="tile" style={tile('mint', 'mint')}>
          <span>사용 중인 구독</span>
          <strong>{stats.count}개</strong>
          <small>{stats.nickname}</small>
        </div>
        <div className="tile" style={tile('sky', 'sky')}>
          <span>다음 결제</span>
          <strong>{next ? next.s.name : '결제일 미입력'}</strong>
          <small>{next ? `${d === 0 ? '오늘' : `D-${d}`} · ${formatKRW(unitKRW(next.s, usdRate))}` : '주문서에 결제일을 적어 보세요'}</small>
        </div>
        <div className="tile" style={tile('peach', 'accent')}>
          <span>가장 비싼 구독</span>
          <strong>{stats.top?.name ?? '-'}</strong>
          <small>{stats.top ? `1년 ${formatKRW(stats.top.amount)}` : ''}</small>
        </div>
      </div>
    </aside>
  )
}
