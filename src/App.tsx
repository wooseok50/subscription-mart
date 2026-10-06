import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { buildReceipt, formatKRW } from './calc'
import OrderForm from './components/OrderForm'
import PaymentCalendar from './components/PaymentCalendar'
import Receipt from './components/Receipt'
import { startOfToday } from './schedule'
import { DEFAULT_REFS, loadData, parseData, saveData } from './storage'
import type { AppData, Subscription } from './types'

export default function App() {
  const [data, setData] = useState<AppData>(loadData)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [printingId, setPrintingId] = useState<string | null>(null)
  const [rateInput, setRateInput] = useState(String(data.usdRate))
  const [notice, setNotice] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const orderRef = useRef<HTMLDivElement>(null)
  const [today] = useState(startOfToday)
  const [printedAt] = useState(() => new Date())

  useEffect(() => saveData(data), [data])

  // 출력 애니메이션 종료 후 상태 해제
  useEffect(() => {
    if (!printingId) return
    const t = setTimeout(() => setPrintingId(null), 1200)
    return () => clearTimeout(t)
  }, [printingId])

  const receipt = useMemo(() => buildReceipt(data.items, data.usdRate, data.refs, today), [data, today])
  const editing = data.items.find((s) => s.id === editingId) ?? null

  const updateItems = (fn: (items: Subscription[]) => Subscription[]) => setData((d) => ({ ...d, items: fn(d.items) }))

  const upsert = (item: Subscription) => {
    updateItems((items) => (items.some((s) => s.id === item.id) ? items.map((s) => (s.id === item.id ? item : s)) : [...items, item]))
    setPrintingId(item.id)
    setEditingId(null)
  }

  const select = (id: string) => {
    setEditingId(id)
    orderRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const applyRate = (value: string) => {
    setRateInput(value)
    const n = Number(value)
    if (Number.isFinite(n) && n > 0 && n < 100_000) setData((d) => ({ ...d, usdRate: n }))
  }

  const applyRefPrice = (id: string, value: string) => {
    const n = Number(value)
    if (!Number.isFinite(n) || n <= 0) return
    setData((d) => ({ ...d, refs: d.refs.map((r) => (r.id === id ? { ...r, price: n } : r)) }))
  }

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `subscription-receipt-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const importJson = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    // 비정상적으로 큰 파일 차단
    if (file.size > 1_000_000) return setNotice('파일이 너무 커요. (최대 1MB)')
    try {
      const parsed = parseData(JSON.parse(await file.text()))
      if (!parsed) return setNotice('올바른 백업 파일이 아니에요.')
      if (data.items.length > 0 && !confirm('지금 영수증을 백업 파일 내용으로 바꿀까요?')) return
      setData(parsed)
      setRateInput(String(parsed.usdRate))
      setEditingId(null)
      setNotice(`${parsed.items.length}개 구독을 불러왔어요.`)
    } catch {
      setNotice('파일을 읽지 못했어요.')
    }
  }

  const clearAll = () => {
    if (!confirm('영수증을 통째로 버릴까요? 되돌릴 수 없어요.')) return
    setData((d) => ({ ...d, items: [] }))
    setEditingId(null)
  }

  return (
    <div className="page">
      <header className="hero">
        <p className="eyebrow">구독상회 · SUBSCRIPTION MART</p>
        <h1>
          매달 조금씩,
          <br />
          1년이면 <em>영수증 한 장.</em>
        </h1>
        <p className="lede">
          넷플릭스 하나, 클라우드 하나. 따로 보면 커피 몇 잔 값이지만 1년치를 모아 뽑아보면 이야기가 달라져요. 주문서에 지금 쓰는 구독을
          적으면 프린터가 앞으로 1년 동안 낼 돈을 영수증으로 출력해 드려요.
        </p>
        {receipt.total > 0 && (
          <p className="hero-peek">
            지금까지 적은 구독으로는 1년에 <strong>{formatKRW(receipt.total)}</strong>을 내게 돼요.
          </p>
        )}
      </header>

      <main className="counter">
        <section className="col-order" ref={orderRef} aria-labelledby="step1">
          <h2 id="step1" className="step">
            <span>01</span> 주문서 작성
          </h2>
          <OrderForm
            key={editingId ?? 'new'}
            editing={editing}
            onSubmit={upsert}
            onToggle={(id) => {
              updateItems((items) => items.map((s) => (s.id === id ? { ...s, active: !s.active } : s)))
              setEditingId(null)
            }}
            onDelete={(id) => {
              updateItems((items) => items.filter((s) => s.id !== id))
              setEditingId(null)
            }}
            onCancel={() => setEditingId(null)}
          />
          <p className="tip hand">영수증의 품목을 누르면 여기서 고칠 수 있어요 ✎</p>
        </section>

        <section className="col-receipt" aria-labelledby="step2">
          <h2 id="step2" className="step">
            <span>02</span> 1년치 영수증
            <button type="button" className="btn small ghost print-btn" onClick={() => window.print()} disabled={receipt.total === 0}>
              인쇄 · PDF
            </button>
          </h2>
          <Receipt receipt={receipt} usdRate={data.usdRate} editingId={editingId} printingId={printingId} printedAt={printedAt} onSelect={select} />
        </section>
      </main>

      <section className="schedule" aria-labelledby="step3">
        <h2 id="step3" className="step">
          <span>03</span> 결제 일정표
        </h2>
        <PaymentCalendar items={data.items} usdRate={data.usdRate} today={today} onSelect={select} />
      </section>

      <details className="drawer">
        <summary>
          <span className="step">
            <span>04</span> 계산대 서랍 <small>환율 · 환산 기준 · 백업</small>
          </span>
        </summary>
        <div className="drawer-body">
          <div className="drawer-group">
            <h3>환율</h3>
            <label className="field">
              1 USD =
              <input type="number" inputMode="decimal" min="1" step="any" value={rateInput} onChange={(e) => applyRate(e.target.value)} />원
            </label>
            <p className="muted small">달러 구독은 이 환율로 계산해요. 카드사 청구액과는 다를 수 있어요.</p>
          </div>

          <div className="drawer-group">
            <h3>'이 돈이면' 기준가</h3>
            {/* 기본값 복원 시 비제어 입력 초기화용 key */}
            <ul className="ref-list" key={data.refs.map((r) => r.price).join()}>
              {data.refs.map((r) => (
                <li key={r.id}>
                  <span>
                    {r.emoji} {r.label}
                  </span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="1"
                    defaultValue={r.price}
                    onBlur={(e) => applyRefPrice(r.id, e.target.value)}
                    aria-label={`${r.label} 기준가`}
                  />
                  <span className="muted">원</span>
                </li>
              ))}
            </ul>
            <p className="muted small">예시 가격이에요. 내 기준에 맞게 바꿔 보세요.</p>
            <button
              type="button"
              className="btn small ghost"
              onClick={() => setData((d) => ({ ...d, refs: DEFAULT_REFS }))}
            >
              기본값으로
            </button>
          </div>

          <div className="drawer-group">
            <h3>백업</h3>
            <p className="muted small">데이터는 이 브라우저에만 저장돼요. 다른 기기로 옮길 땐 백업 파일을 쓰세요.</p>
            <div className="btn-row">
              <button type="button" className="btn small ghost" onClick={exportJson} disabled={data.items.length === 0}>
                내보내기
              </button>
              <button type="button" className="btn small ghost" onClick={() => fileRef.current?.click()}>
                불러오기
              </button>
              <button type="button" className="btn small ghost danger" onClick={clearAll} disabled={data.items.length === 0}>
                전체 삭제
              </button>
            </div>
            <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={importJson} />
            {notice && (
              <p className="notice" role="status">
                {notice}
              </p>
            )}
          </div>
        </div>
      </details>

      <footer className="foot">
        구독상회는 실제 가게가 아니에요 · 서버로 보내는 데이터 없음 · 모든 기록은 내 브라우저에만
      </footer>
    </div>
  )
}
