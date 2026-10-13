import { useMemo, type CSSProperties } from 'react'
import { buildReceipt, formatKRW } from '../calc'
import { FORGOTTEN } from '../sample'
import type { RefItem, Subscription } from '../types'
import { wrapStats } from '../wrap'

interface Props {
  items: Subscription[]
  usdRate: number
  refs: RefItem[]
  today: Date
  onPick?: (name: string, category: string) => void
}

/** 주문서 아래 보조 정보. 분류별 비중·TOP 3, 잊기 쉬운 구독 목록 */
export default function InsightPanel({ items, usdRate, refs, today, onPick }: Props) {
  const stats = useMemo(() => wrapStats(items, usdRate, refs, today), [items, usdRate, refs, today])
  const top = useMemo(() => buildReceipt(items, usdRate, refs, today).lines.slice(0, 3), [items, usdRate, refs, today])
  const names = new Set(items.map((s) => s.name))
  const forgotten = FORGOTTEN.filter((f) => !names.has(f.name))

  return (
    <div className="insights">
      {stats.count > 0 && (
        <section className="card" aria-labelledby="ins-cat">
          <h3 id="ins-cat">
            어디에 많이 쓰나 <small>1년 기준</small>
          </h3>
          <div className="stack" role="img" aria-label={stats.categories.map((c) => `${c.category} ${Math.round(c.ratio * 100)}%`).join(', ')}>
            {stats.categories.map((c) => (
              <span key={c.category} style={{ '--w': `${Math.max(c.ratio * 100, 2)}%`, '--c': c.color } as CSSProperties} />
            ))}
          </div>
          <ul className="legend">
            {stats.categories.map((c) => (
              <li key={c.category} style={{ '--c': c.color } as CSSProperties}>
                <span>{c.category}</span>
                <span>{formatKRW(c.amount)}</span>
                <b>{Math.round(c.ratio * 100)}%</b>
              </li>
            ))}
          </ul>

          <h3 className="sub">비싼 순 TOP {top.length}</h3>
          <ol className="top3">
            {top.map((l, i) => (
              <li key={l.item.id}>
                <b>{i + 1}</b>
                <span>{l.item.name}</span>
                <span>{formatKRW(l.amount)}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {onPick && forgotten.length > 0 && (
        <section className="card forgot" aria-labelledby="ins-forgot">
          <h3 id="ins-forgot">
            혹시 이것도 구독 중? <small>누르면 주문서에 적혀요</small>
          </h3>
          <div className="forgot-list">
            {forgotten.map((f) => (
              <button key={f.name} type="button" onClick={() => onPick(f.name, f.category)}>
                <span aria-hidden="true">☐</span> {f.name}
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
