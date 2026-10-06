import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { summarize } from './calc'
import Summary from './components/Summary'
import SubscriptionForm from './components/SubscriptionForm'
import SubscriptionList from './components/SubscriptionList'
import { loadData, parseData, saveData } from './storage'
import type { AppData, Subscription } from './types'

export default function App() {
  const [data, setData] = useState<AppData>(loadData)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [rateInput, setRateInput] = useState(String(data.usdRate))
  const [notice, setNotice] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => saveData(data), [data])

  const summary = useMemo(() => summarize(data.items, data.usdRate), [data])
  const editing = data.items.find((s) => s.id === editingId) ?? null
  const hasUsd = data.items.some((s) => s.currency === 'USD')

  const upsert = (item: Subscription) => {
    setData((d) => {
      const exists = d.items.some((s) => s.id === item.id)
      return { ...d, items: exists ? d.items.map((s) => (s.id === item.id ? item : s)) : [...d.items, item] }
    })
    setEditingId(null)
  }

  const updateItems = (fn: (items: Subscription[]) => Subscription[]) => setData((d) => ({ ...d, items: fn(d.items) }))

  const applyRate = (value: string) => {
    setRateInput(value)
    const n = Number(value)
    if (Number.isFinite(n) && n > 0 && n < 100_000) setData((d) => ({ ...d, usdRate: n }))
  }

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `subscriptions-${new Date().toISOString().slice(0, 10)}.json`
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
      if (data.items.length > 0 && !confirm('현재 목록을 백업 파일 내용으로 바꿀까요?')) return
      setData(parsed)
      setRateInput(String(parsed.usdRate))
      setEditingId(null)
      setNotice(`${parsed.items.length}개 구독을 불러왔어요.`)
    } catch {
      setNotice('파일을 읽지 못했어요.')
    }
  }

  const clearAll = () => {
    if (!confirm('모든 구독을 삭제할까요? 되돌릴 수 없어요.')) return
    setData((d) => ({ ...d, items: [] }))
    setEditingId(null)
  }

  return (
    <div className="app">
      <header className="header">
        <h1>구독 계산기</h1>
        <p className="muted">매달 빠져나가는 구독료를 한눈에 정리해요. 데이터는 이 브라우저에만 저장돼요.</p>
      </header>

      <Summary summary={summary} />

      <SubscriptionForm
        key={editingId ?? 'new'}
        editing={editing}
        onSubmit={upsert}
        onCancel={() => setEditingId(null)}
      />

      <section>
        <h2 className="section-title">
          내 구독 {data.items.length > 0 && <span className="muted">{data.items.length}개</span>}
        </h2>
        <SubscriptionList
          items={data.items}
          usdRate={data.usdRate}
          editingId={editingId}
          onEdit={(id) => {
            setEditingId(id)
            document.querySelector('.form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }}
          onToggle={(id) => updateItems((items) => items.map((s) => (s.id === id ? { ...s, active: !s.active } : s)))}
          onDelete={(id) => {
            updateItems((items) => items.filter((s) => s.id !== id))
            if (editingId === id) setEditingId(null)
          }}
        />
      </section>

      <section className="card settings">
        <h2>설정</h2>
        <label>
          환율 (1 USD = ? 원)
          <input
            type="number"
            inputMode="decimal"
            min="1"
            step="any"
            value={rateInput}
            onChange={(e) => applyRate(e.target.value)}
          />
        </label>
        {hasUsd && <p className="muted small-text">달러 구독은 이 환율로 원화 환산해요. 실제 결제 금액과 다를 수 있어요.</p>}

        <div className="actions wrap">
          <button type="button" className="ghost" onClick={exportJson} disabled={data.items.length === 0}>
            백업 내보내기
          </button>
          <button type="button" className="ghost" onClick={() => fileRef.current?.click()}>
            백업 불러오기
          </button>
          <button type="button" className="ghost danger" onClick={clearAll} disabled={data.items.length === 0}>
            전체 삭제
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={importJson} />
        </div>
        {notice && (
          <p className="muted" role="status">
            {notice}
          </p>
        )}
      </section>

      <footer className="footer muted">서버로 전송되는 데이터 없음 · 브라우저 저장소만 사용</footer>
    </div>
  )
}
