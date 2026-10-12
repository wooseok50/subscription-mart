import { useEffect, useMemo, useRef, useState, type ChangeEvent, type CSSProperties } from 'react'
import { buildReceipt, formatKRW, type ReceiptMode } from './calc'
import HeroBoard from './components/HeroBoard'
import InsightPanel from './components/InsightPanel'
import OrderForm from './components/OrderForm'
import PaymentCalendar from './components/PaymentCalendar'
import Receipt, { type Stamp } from './components/Receipt'
import ReceiptControls from './components/ReceiptControls'
import WrapCardModal from './components/WrapCardModal'
import { buildRows } from './receiptRows'
import { renderReceiptPng } from './render/receiptCanvas'
import { sampleItems } from './sample'
import { startOfToday } from './schedule'
import { copyText, decodeShare, downloadBlob, shareImage, shareUrl, type ShareResult } from './share'
import { DEFAULT_REFS, loadData, parseData, saveData } from './storage'
import { THEMES } from './themes'
import type { AppData, Subscription, ThemeId } from './types'
import { wrapStats } from './wrap'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const NO_CUTS: ReadonlySet<string> = new Set()

const RESULT_TEXT: Record<ShareResult, string> = {
  shared: '공유했어요.',
  downloaded: '이미지를 저장했어요.',
  copied: '링크를 복사했어요. 카톡 대화창에 붙여넣어 보세요.',
  cancelled: '',
  failed: '복사하지 못했어요. 다시 시도해 주세요.',
}

const readShared = () => decodeShare(location.hash)

export default function App() {
  const [data, setData] = useState<AppData>(loadData)
  const [shared, setShared] = useState<AppData | null>(readShared)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [printingId, setPrintingId] = useState<string | null>(null)
  const [mode, setMode] = useState<ReceiptMode>('year')
  const [cuts, setCuts] = useState<ReadonlySet<string>>(NO_CUTS)
  const [stamp, setStamp] = useState<Stamp | null>(null)
  const [wrapOpen, setWrapOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<{ key: number; text: string } | null>(null)
  const [rateInput, setRateInput] = useState(String(data.usdRate))
  const [notice, setNotice] = useState('')
  const [prefill, setPrefill] = useState<{ name: string; category: string; nonce: number } | null>(null)
  const [installEvt, setInstallEvt] = useState<BeforeInstallPromptEvent | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const orderRef = useRef<HTMLElement>(null)
  const [today] = useState(startOfToday)
  const [printedAt] = useState(() => new Date())

  useEffect(() => saveData(data), [data])

  useEffect(() => {
    const onHash = () => {
      setShared(readShared())
      setMode('year')
    }
    const onInstall = (e: Event) => {
      e.preventDefault()
      setInstallEvt(e as BeforeInstallPromptEvent)
    }
    addEventListener('hashchange', onHash)
    addEventListener('beforeinstallprompt', onInstall)
    return () => {
      removeEventListener('hashchange', onHash)
      removeEventListener('beforeinstallprompt', onInstall)
    }
  }, [])

  // 연출용 상태 자동 해제
  useEffect(() => {
    if (!printingId) return
    const t = setTimeout(() => setPrintingId(null), 1200)
    return () => clearTimeout(t)
  }, [printingId])
  useEffect(() => {
    if (!stamp) return
    const t = setTimeout(() => setStamp(null), 1900)
    return () => clearTimeout(t)
  }, [stamp])
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2600)
    return () => clearTimeout(t)
  }, [toast])

  const readOnly = shared !== null
  const viewing = shared ?? data
  const theme = THEMES[viewing.theme]
  const receipt = useMemo(
    () => buildReceipt(viewing.items, viewing.usdRate, viewing.refs, today, mode, readOnly ? NO_CUTS : cuts),
    [viewing, today, mode, readOnly, cuts],
  )
  const rows = useMemo(() => buildRows(receipt, theme, { usdRate: viewing.usdRate, printedAt }), [receipt, theme, viewing.usdRate, printedAt])
  const editing = data.items.find((s) => s.id === editingId) ?? null
  // 결산 카드는 열 때 한 번만 계산 (재렌더 시 이미지 재생성 방지)
  const wrap = useMemo(() => (wrapOpen ? wrapStats(data.items, data.usdRate, data.refs, today) : null), [wrapOpen, data, today])
  const hasItems = viewing.items.length > 0

  const notify = (text: string) => text && setToast({ key: Date.now(), text })
  const updateItems = (fn: (items: Subscription[]) => Subscription[]) => setData((d) => ({ ...d, items: fn(d.items) }))
  const dropCut = (id: string) =>
    setCuts((c) => {
      if (!c.has(id)) return c
      const next = new Set(c)
      next.delete(id)
      return next
    })

  const upsert = (item: Subscription) => {
    updateItems((items) => (items.some((s) => s.id === item.id) ? items.map((s) => (s.id === item.id ? item : s)) : [...items, item]))
    setPrintingId(item.id)
    setEditingId(null)
    setPrefill(null)
  }

  const toggleActive = (id: string) => {
    const target = data.items.find((s) => s.id === id)
    if (!target) return
    updateItems((items) => items.map((s) => (s.id === id ? { ...s, active: !s.active } : s)))
    if (target.active) {
      setStamp({ key: Date.now(), title: '해지 완료', sub: target.name })
      dropCut(id)
    }
    setEditingId(null)
  }

  const remove = (id: string) => {
    const target = data.items.find((s) => s.id === id)
    updateItems((items) => items.filter((s) => s.id !== id))
    if (target) setStamp({ key: Date.now(), title: '해지 완료', sub: target.name })
    dropCut(id)
    setEditingId(null)
  }

  const toggleCut = (id: string) =>
    setCuts((c) => {
      const next = new Set(c)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const fillSample = () => {
    setData((d) => ({ ...d, items: sampleItems(today) }))
    setPrintingId(null)
    notify('예시로 채웠어요. 금액은 어림값이니 내 구독으로 바꿔 보세요.')
  }

  const pickForgotten = (name: string, category: string) => {
    setEditingId(null)
    setPrefill({ name, category, nonce: Date.now() })
    orderRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const select = (id: string) => {
    setEditingId(id)
    orderRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const setTheme = (id: ThemeId) => {
    if (shared) setShared({ ...shared, theme: id })
    else setData((d) => ({ ...d, theme: id }))
  }

  const fileStamp = () => new Date().toISOString().slice(0, 10)
  const shareMessage = () =>
    `${mode === 'life' ? '지금까지 낸' : '앞으로 1년 낼'} 구독료 ${formatKRW(receipt.total)} 🧾\n내 구독 영수증 보기 → ${shareUrl(viewing)}`

  const withBusy = async (fn: () => Promise<void>) => {
    if (busy) return
    setBusy(true)
    try {
      await fn()
    } catch {
      notify('이미지를 만들지 못했어요.')
    } finally {
      setBusy(false)
    }
  }

  const saveImage = () =>
    withBusy(async () => {
      downloadBlob(await renderReceiptPng(rows, theme), `subscription-receipt-${fileStamp()}.png`)
      notify(RESULT_TEXT.downloaded)
    })

  const shareReceipt = () =>
    withBusy(async () => {
      const blob = await renderReceiptPng(rows, theme)
      notify(RESULT_TEXT[await shareImage(blob, `subscription-receipt-${fileStamp()}.png`, shareMessage())])
    })

  const copyLink = async () => notify(RESULT_TEXT[await copyText(shareUrl(viewing))])

  const leaveShared = () => {
    history.replaceState(null, '', location.pathname + location.search)
    setShared(null)
    setMode('year')
  }

  const importShared = () => {
    if (!shared) return
    if (data.items.length > 0 && !confirm('내 영수증을 이 목록으로 바꿀까요? 지금 목록은 사라져요.')) return
    setData((d) => ({ ...d, items: shared.items.map((s) => ({ ...s, id: crypto.randomUUID() })), usdRate: shared.usdRate, theme: shared.theme }))
    setRateInput(String(shared.usdRate))
    leaveShared()
    notify('목록을 가져왔어요. 내 상황에 맞게 고쳐 보세요.')
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
    downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), `subscription-receipt-${fileStamp()}.json`)
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
      setCuts(NO_CUTS)
      setNotice(`${parsed.items.length}개 구독을 불러왔어요.`)
    } catch {
      setNotice('파일을 읽지 못했어요.')
    }
  }

  const clearAll = () => {
    if (!confirm('영수증을 통째로 버릴까요? 되돌릴 수 없어요.')) return
    setData((d) => ({ ...d, items: [] }))
    setEditingId(null)
    setCuts(NO_CUTS)
  }

  const install = async () => {
    if (!installEvt) return
    await installEvt.prompt()
    const { outcome } = await installEvt.userChoice
    setInstallEvt(null)
    if (outcome === 'accepted') notify('홈 화면에 설치했어요.')
  }
  const standalone = typeof matchMedia === 'function' && matchMedia('(display-mode: standalone)').matches

  return (
    <div className="page">
      <header className="hero no-print">
        <div className="hero-copy">
          <p className="eyebrow">🧾 구독상회 · SUBSCRIPTION MART</p>
          {readOnly ? (
            <>
              <h1>
                누군가 보낸 <em>구독 영수증</em>이
                <br />
                도착했어요.
              </h1>
              <p className="lede">친구가 1년 동안 낼 구독료를 영수증으로 뽑아 보냈어요. 내 것도 궁금하다면 지금 바로 뽑아 보세요.</p>
              <div className="btn-row hero-cta">
                <button type="button" className="btn solid" onClick={leaveShared}>
                  나도 뽑아보기 →
                </button>
                <button type="button" className="btn ghost" onClick={importShared}>
                  이 목록으로 시작하기
                </button>
              </div>
              <p className="muted small hero-note">링크에 담긴 목록만 보여줘요. 내 브라우저에 저장되지 않아요.</p>
            </>
          ) : (
            <>
              <h1>
                매달 조금씩,
                <br />
                1년이면 <em>영수증 한 장.</em>
              </h1>
              <p className="lede">
                넷플릭스 하나, 클라우드 하나. 따로 보면 커피 몇 잔 값이지만 1년치를 모아 뽑아보면 이야기가 달라져요. 지금 쓰는 구독을 적으면
                앞으로 1년 동안 낼 돈을 영수증으로 출력해 드려요.
              </p>
              <ol className="hero-steps">
                <li style={{ '--c': 'var(--accent)' } as CSSProperties}>
                  <b>1</b> 주문서에 적고
                </li>
                <li style={{ '--c': 'var(--sun)' } as CSSProperties}>
                  <b>2</b> 1년치 영수증 뽑고
                </li>
                <li style={{ '--c': 'var(--mint)' } as CSSProperties}>
                  <b>3</b> ✂ 해지해 보고
                </li>
                <li style={{ '--c': 'var(--sky)' } as CSSProperties}>
                  <b>4</b> 친구에게 공유
                </li>
              </ol>
            </>
          )}
        </div>
        <HeroBoard
          items={viewing.items}
          usdRate={viewing.usdRate}
          refs={viewing.refs}
          today={today}
          readOnly={readOnly}
          onSample={readOnly ? undefined : fillSample}
          onStart={readOnly ? undefined : () => orderRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
        />
      </header>

      <main className="counter">
        {readOnly ? (
          <section className="col-order no-print" aria-labelledby="step-shared">
            <h2 id="step-shared" className="step">
              <span>✉</span> 받은 영수증 살펴보기
              <small>어떤 구독에 많이 쓰는지 한눈에 봐요</small>
            </h2>
            <InsightPanel items={viewing.items} usdRate={viewing.usdRate} refs={viewing.refs} today={today} />
          </section>
        ) : (
          <section className="col-order no-print" ref={orderRef} aria-labelledby="step1">
            <h2 id="step1" className="step">
              <span>01</span> 주문서 작성
              <small>지금 쓰는 구독을 하나씩 적어요. 영수증 품목을 누르면 여기서 고칠 수 있어요</small>
            </h2>
            <OrderForm
              key={editingId ?? `new-${prefill?.nonce ?? 0}`}
              editing={editing}
              prefill={prefill}
              onSubmit={upsert}
              onToggle={toggleActive}
              onDelete={remove}
              onCancel={() => setEditingId(null)}
            />
            <InsightPanel items={data.items} usdRate={data.usdRate} refs={data.refs} today={today} onPick={pickForgotten} />
          </section>
        )}

        <section className="col-receipt" aria-labelledby="step2">
          <h2 id="step2" className="step no-print">
            <span>02</span> {mode === 'life' ? '누적 영수증' : '1년치 영수증'}
            <small>{mode === 'life' ? '처음 결제한 날부터 오늘까지 낸 돈이에요' : '오늘부터 1년 동안 실제로 결제될 횟수로 계산해요'}</small>
          </h2>
          <ReceiptControls
            theme={viewing.theme}
            mode={mode}
            cutCount={cuts.size}
            onTheme={setTheme}
            onMode={setMode}
            onClearCuts={readOnly ? undefined : () => setCuts(NO_CUTS)}
          />
          <div className="receipt-wrap">
            <div className={`printer no-print${printingId ? ' busy' : ''}`} aria-hidden="true">
              <span className="led" />
              <span className="slot" />
            </div>
            <Receipt
              rows={rows}
              theme={theme}
              editingId={editingId}
              printingId={printingId}
              stamp={stamp}
              onSelect={readOnly ? undefined : select}
              onCut={readOnly || mode !== 'year' ? undefined : toggleCut}
            />
          </div>

          <div className="share-bar no-print">
            <button type="button" className="btn stamp" onClick={shareReceipt} disabled={!hasItems || busy}>
              공유하기
            </button>
            <button type="button" className="btn ghost" onClick={saveImage} disabled={!hasItems || busy}>
              이미지 저장
            </button>
            <button type="button" className="btn ghost" onClick={copyLink} disabled={!hasItems}>
              링크 복사
            </button>
            {!readOnly && (
              <button type="button" className="btn ghost" onClick={() => setWrapOpen(true)} disabled={!hasItems}>
                결산 카드
              </button>
            )}
            <button type="button" className="btn ghost" onClick={() => window.print()} disabled={!hasItems}>
              인쇄 · PDF
            </button>
          </div>
          {!readOnly && hasItems && <p className="share-note muted no-print">링크에는 구독 이름·금액·결제일이 담겨요. 받은 사람만 볼 수 있어요.</p>}
        </section>
      </main>

      {!readOnly && (
        <section className="schedule no-print" aria-labelledby="step3">
          <h2 id="step3" className="step">
            <span>03</span> 결제 일정표
            <small>언제 얼마가 빠져나가는지 달력으로 확인해요</small>
          </h2>
          <PaymentCalendar items={data.items} usdRate={data.usdRate} today={today} onSelect={select} />
        </section>
      )}

      {!readOnly && (
        <details className="drawer no-print">
          <summary>
            <span className="step">
              <span>04</span> 계산대 서랍 <small>환율 · 환산 기준 · 백업 · 앱 설치</small>
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
              <button type="button" className="btn small ghost" onClick={() => setData((d) => ({ ...d, refs: DEFAULT_REFS }))}>
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

            <div className="drawer-group">
              <h3>앱으로 설치</h3>
              {standalone ? (
                <p className="muted small">이미 앱으로 실행 중이에요.</p>
              ) : installEvt ? (
                <>
                  <p className="muted small">홈 화면에 두고 앱처럼 열 수 있어요. 오프라인에서도 열려요.</p>
                  <button type="button" className="btn small ghost" onClick={install}>
                    홈 화면에 설치
                  </button>
                </>
              ) : (
                <p className="muted small">
                  iPhone은 Safari 공유 버튼 → ‘홈 화면에 추가’, Android는 브라우저 메뉴 → ‘앱 설치’로 설치할 수 있어요.
                </p>
              )}
            </div>
          </div>
        </details>
      )}

      <footer className="foot no-print">
        구독상회는 실제 가게가 아니에요 · 서버로 보내는 데이터 없음 · 모든 기록은 내 브라우저에만
        <br />
        <a href="/privacy">개인정보 처리 안내</a> · <a href="mailto:woosuck6008@gmail.com">문의</a>
      </footer>

      {wrap && (
        <WrapCardModal
          stats={wrap}
          shareText={`나의 구독 결산 🧾 ${shareUrl(data)}`}
          onClose={() => setWrapOpen(false)}
          onResult={(r) => notify(RESULT_TEXT[r])}
        />
      )}

      {toast && (
        <div key={toast.key} className="toast no-print" role="status">
          {toast.text}
        </div>
      )}
    </div>
  )
}
