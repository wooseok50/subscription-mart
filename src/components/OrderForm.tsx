import { useEffect, useRef, useState, type FormEvent } from 'react'
import { parseDate, startOfToday, toDateString } from '../schedule'
import { CATEGORIES, CYCLE_LABEL, type Currency, type Cycle, type Subscription } from '../types'

interface Props {
  editing: Subscription | null
  onSubmit: (item: Subscription) => void
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onCancel: () => void
  /** 잊기 쉬운 구독 목록에서 고른 품목 */
  prefill?: { name: string; category: string } | null
}

const QUICK: { name: string; category: string; currency?: Currency }[] = [
  { name: '넷플릭스', category: '영상' },
  { name: '유튜브 프리미엄', category: '영상' },
  { name: '디즈니+', category: '영상' },
  { name: '티빙', category: '영상' },
  { name: '스포티파이', category: '음악' },
  { name: '멜론', category: '음악' },
  { name: 'iCloud+', category: '클라우드' },
  { name: 'ChatGPT', category: '생산성', currency: 'USD' },
  { name: 'Claude', category: '생산성', currency: 'USD' },
  { name: '쿠팡 와우', category: '쇼핑' },
]

export default function OrderForm({ editing, onSubmit, onToggle, onDelete, onCancel, prefill }: Props) {
  // 편집 대상 변경 시 부모의 key 교체로 초기화됨
  const [name, setName] = useState(editing?.name ?? prefill?.name ?? '')
  const [price, setPrice] = useState(editing ? String(editing.price) : '')
  const [currency, setCurrency] = useState<Currency>(editing?.currency ?? 'KRW')
  const [cycle, setCycle] = useState<Cycle>(editing?.cycle ?? 'monthly')
  const [category, setCategory] = useState(editing?.category ?? prefill?.category ?? '영상')
  const [startDate, setStartDate] = useState(editing ? (editing.startDate ?? '') : toDateString(startOfToday()))
  const [error, setError] = useState('')
  const priceRef = useRef<HTMLInputElement>(null)

  // 품목이 채워진 채 열리면 바로 금액 입력으로 이동
  useEffect(() => {
    if (prefill && !editing) priceRef.current?.focus({ preventScroll: true })
  }, [prefill, editing])

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    const value = Number(price)
    if (!trimmed) return setError('무엇을 구독 중인지 적어주세요.')
    if (!price || !Number.isFinite(value) || value < 0) return setError('금액을 0 이상의 숫자로 적어주세요.')
    if (startDate && !parseDate(startDate)) return setError('결제일 형식이 올바르지 않아요.')

    onSubmit({
      id: editing?.id ?? crypto.randomUUID(),
      name: trimmed.slice(0, 50),
      price: value,
      currency,
      cycle,
      category,
      active: editing?.active ?? true,
      startDate: startDate || null,
    })
    if (!editing) {
      setName('')
      setPrice('')
    }
    setError('')
  }

  return (
    <form className="order" onSubmit={handleSubmit} noValidate>
      <div className="order-head">
        <span className="order-title">{editing ? '주문 변경서' : '구독 주문서'}</span>
        <span className="order-no">No. {editing ? editing.id.slice(0, 4).toUpperCase() : 'NEW'}</span>
      </div>

      {!editing && (
        <div className="order-quick">
          <span className="hand">자주 찾는 메뉴</span>
          <div className="chips">
            {QUICK.map((q) => (
              <button
                type="button"
                key={q.name}
                className="chip"
                onClick={() => {
                  setName(q.name)
                  setCategory(q.category)
                  setCurrency(q.currency ?? 'KRW')
                }}
              >
                {q.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="order-lines">
        <label className="line">
          <span>품목</span>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={50} placeholder="예: 넷플릭스" />
        </label>

        <div className="line-pair">
          <label className="line grow">
            <span>금액</span>
            <input
              ref={priceRef}
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="1회 결제 금액"
            />
          </label>
          <label className="line">
            <span>통화</span>
            <select value={currency} onChange={(e) => setCurrency(e.target.value as Currency)}>
              <option value="KRW">원</option>
              <option value="USD">USD</option>
            </select>
          </label>
        </div>

        <div className="line-pair">
          <label className="line grow">
            <span>주기</span>
            <select value={cycle} onChange={(e) => setCycle(e.target.value as Cycle)}>
              {(Object.keys(CYCLE_LABEL) as Cycle[]).map((c) => (
                <option key={c} value={c}>
                  {CYCLE_LABEL[c]}
                </option>
              ))}
            </select>
          </label>
          <label className="line grow">
            <span>분류</span>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
        </div>

        <label className="line">
          <span>결제일</span>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </label>
        <p className="hint hand">↳ 최근 결제일이나 첫 결제일을 적으면 달력에 일정이 찍혀요</p>
      </div>

      {error && (
        <p className="order-error" role="alert">
          {error}
        </p>
      )}

      <div className="order-actions">
        {editing ? (
          <>
            <button type="button" className="btn ghost" onClick={onCancel}>
              닫기
            </button>
            <button type="button" className="btn ghost" onClick={() => onToggle(editing.id)}>
              {editing.active ? '일시정지' : '다시 구독'}
            </button>
            <button
              type="button"
              className="btn ghost danger"
              onClick={() => {
                if (confirm(`'${editing.name}' 구독을 영수증에서 지울까요?`)) onDelete(editing.id)
              }}
            >
              삭제
            </button>
            <button type="submit" className="btn solid">
              변경 저장
            </button>
          </>
        ) : (
          <button type="submit" className="btn solid">
            영수증에 추가 →
          </button>
        )}
      </div>
    </form>
  )
}
