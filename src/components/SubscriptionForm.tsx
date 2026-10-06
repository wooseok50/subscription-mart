import { useState, type FormEvent } from 'react'
import { CATEGORIES, CYCLE_LABEL, type Currency, type Cycle, type Subscription } from '../types'

interface Props {
  editing: Subscription | null
  onSubmit: (item: Subscription) => void
  onCancel: () => void
}

const QUICK_NAMES: { name: string; category: string }[] = [
  { name: '넷플릭스', category: '영상' },
  { name: '유튜브 프리미엄', category: '영상' },
  { name: '디즈니+', category: '영상' },
  { name: '스포티파이', category: '음악' },
  { name: '멜론', category: '음악' },
  { name: 'iCloud+', category: '클라우드' },
  { name: 'ChatGPT', category: '생산성' },
  { name: 'Claude', category: '생산성' },
  { name: '쿠팡 와우', category: '쇼핑' },
]

export default function SubscriptionForm({ editing, onSubmit, onCancel }: Props) {
  // 편집 대상 변경 시 부모의 key 교체로 초기화됨
  const [name, setName] = useState(editing?.name ?? '')
  const [price, setPrice] = useState(editing ? String(editing.price) : '')
  const [currency, setCurrency] = useState<Currency>(editing?.currency ?? 'KRW')
  const [cycle, setCycle] = useState<Cycle>(editing?.cycle ?? 'monthly')
  const [category, setCategory] = useState(editing?.category ?? '영상')
  const [error, setError] = useState('')

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    const value = Number(price)
    if (!trimmed) return setError('서비스 이름을 입력해 주세요.')
    if (!price || !Number.isFinite(value) || value < 0) return setError('금액을 0 이상의 숫자로 입력해 주세요.')

    onSubmit({
      id: editing?.id ?? crypto.randomUUID(),
      name: trimmed.slice(0, 50),
      price: value,
      currency,
      cycle,
      category,
      active: editing?.active ?? true,
    })
    if (!editing) {
      setName('')
      setPrice('')
    }
    setError('')
  }

  return (
    <form className="card form" onSubmit={handleSubmit} noValidate>
      <h2>{editing ? '구독 수정' : '구독 추가'}</h2>

      {!editing && (
        <div className="chips" aria-label="빠른 이름 입력">
          {QUICK_NAMES.map((q) => (
            <button
              type="button"
              key={q.name}
              className="chip"
              onClick={() => {
                setName(q.name)
                setCategory(q.category)
              }}
            >
              {q.name}
            </button>
          ))}
        </div>
      )}

      <label>
        서비스 이름
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={50} placeholder="예: 넷플릭스" />
      </label>

      <div className="row">
        <label className="grow">
          금액
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="결제 금액"
          />
        </label>
        <label>
          통화
          <select value={currency} onChange={(e) => setCurrency(e.target.value as Currency)}>
            <option value="KRW">원 (KRW)</option>
            <option value="USD">달러 (USD)</option>
          </select>
        </label>
      </div>

      <div className="row">
        <label className="grow">
          결제 주기
          <select value={cycle} onChange={(e) => setCycle(e.target.value as Cycle)}>
            {(Object.keys(CYCLE_LABEL) as Cycle[]).map((c) => (
              <option key={c} value={c}>
                {CYCLE_LABEL[c]}
              </option>
            ))}
          </select>
        </label>
        <label className="grow">
          카테고리
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
      </div>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <div className="actions">
        {editing && (
          <button type="button" className="ghost" onClick={onCancel}>
            취소
          </button>
        )}
        <button type="submit" className="primary">
          {editing ? '저장' : '추가'}
        </button>
      </div>
    </form>
  )
}
