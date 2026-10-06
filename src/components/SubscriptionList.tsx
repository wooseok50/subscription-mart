import { formatKRW, formatPrice, monthlyKRW } from '../calc'
import { CYCLE_LABEL, type Subscription } from '../types'

interface Props {
  items: Subscription[]
  usdRate: number
  editingId: string | null
  onEdit: (id: string) => void
  onToggle: (id: string) => void
  onDelete: (id: string) => void
}

export default function SubscriptionList({ items, usdRate, editingId, onEdit, onToggle, onDelete }: Props) {
  if (items.length === 0) {
    return (
      <div className="card empty">
        <p>아직 등록된 구독이 없어요.</p>
        <p className="muted">위에서 사용 중인 구독 서비스를 추가해 보세요.</p>
      </div>
    )
  }

  // 사용 중 항목 우선, 월 비용 큰 순
  const sorted = [...items].sort(
    (a, b) => Number(b.active) - Number(a.active) || monthlyKRW(b, usdRate) - monthlyKRW(a, usdRate),
  )

  return (
    <ul className="list">
      {sorted.map((s) => (
        <li key={s.id} className={`item${s.active ? '' : ' paused'}${editingId === s.id ? ' editing' : ''}`}>
          <div className="item-main">
            <div className="item-title">
              <strong>{s.name}</strong>
              <span className="tag">{s.category}</span>
              {!s.active && <span className="tag muted-tag">일시정지</span>}
            </div>
            <div className="muted">
              {CYCLE_LABEL[s.cycle]} {formatPrice(s)}
              {(s.cycle !== 'monthly' || s.currency !== 'KRW') && ` → 월 ${formatKRW(monthlyKRW(s, usdRate))}`}
            </div>
          </div>
          <div className="item-actions">
            <button type="button" className="ghost small" onClick={() => onToggle(s.id)}>
              {s.active ? '일시정지' : '다시 사용'}
            </button>
            <button type="button" className="ghost small" onClick={() => onEdit(s.id)}>
              수정
            </button>
            <button
              type="button"
              className="ghost small danger"
              onClick={() => {
                if (confirm(`'${s.name}' 구독을 삭제할까요?`)) onDelete(s.id)
              }}
            >
              삭제
            </button>
          </div>
        </li>
      ))}
    </ul>
  )
}
