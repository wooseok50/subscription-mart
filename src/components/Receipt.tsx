import { footerMessage, formatKRW, formatNum, formatPrice, hashString, type Receipt as ReceiptData, type ReceiptLine } from '../calc'
import { CYCLE_LABEL } from '../types'

interface Props {
  receipt: ReceiptData
  usdRate: number
  editingId: string | null
  printingId: string | null
  printedAt: Date
  onSelect: (id: string) => void
}

const fmtDate = (d: Date) => `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`

function Barcode({ seed }: { seed: number }) {
  // 시드 기반 의사난수로 막대 폭 결정
  let s = seed || 1
  const bars: { x: number; w: number }[] = []
  let x = 0
  while (x < 220) {
    s = (Math.imul(s, 1103515245) + 12345) >>> 0
    const w = 1 + (s % 3)
    bars.push({ x, w })
    x += w + 1 + ((s >> 8) % 3)
  }
  return (
    <svg className="barcode" viewBox="0 0 220 40" preserveAspectRatio="none" aria-hidden="true">
      {bars.map((b) => (
        <rect key={b.x} x={b.x} y="0" width={b.w} height="40" />
      ))}
    </svg>
  )
}

function Line({ line, voided, active, printing, onSelect }: { line: ReceiptLine; voided?: boolean; active: boolean; printing: boolean; onSelect: () => void }) {
  const { item, count, amount } = line
  return (
    <li className={`r-line${voided ? ' voided' : ''}${active ? ' selected' : ''}${printing ? ' printing' : ''}`}>
      <button type="button" onClick={onSelect} aria-label={`${item.name} 수정`}>
        <span className="r-row">
          <span className="r-name">{item.name}</span>
          <span className="r-amount">{voided ? 'VOID' : formatNum(amount)}</span>
        </span>
        <span className="r-sub">
          {CYCLE_LABEL[item.cycle]} {formatPrice(item)} × {count}회
          {!item.startDate && ' (결제일 미입력)'}
        </span>
      </button>
    </li>
  )
}

export default function Receipt({ receipt, usdRate, editingId, printingId, printedAt: now, onSelect }: Props) {
  const all = [...receipt.lines, ...receipt.voided]
  const seed = hashString(all.map((l) => l.item.id + l.amount).join('|'))
  const receiptNo = `${fmtDate(receipt.from).replaceAll('.', '')}-${String(seed % 10000).padStart(4, '0')}`
  const hasUsd = all.some((l) => l.item.currency === 'USD')

  return (
    <div className="receipt-wrap">
      <div className={`printer${printingId ? ' busy' : ''}`} aria-hidden="true">
        <span className="led" />
        <span className="slot" />
      </div>

      <article className="receipt" aria-label="1년치 구독 영수증">
        <header className="r-head">
          <p className="r-shop">구독상회</p>
          <p className="r-shop-en">SUBSCRIPTION MART</p>
          <p className="r-meta">서울특별시 내지갑구 자동결제로 12</p>
          <p className="r-meta">대표 : 나 · 영업시간 : 24시간 365일</p>
        </header>

        <div className="r-dash" />
        <dl className="r-info">
          <div>
            <dt>영수증번호</dt>
            <dd>{receiptNo}</dd>
          </div>
          <div>
            <dt>출력일시</dt>
            <dd>
              {fmtDate(now)} {String(now.getHours()).padStart(2, '0')}:{String(now.getMinutes()).padStart(2, '0')}
            </dd>
          </div>
          <div>
            <dt>청구기간</dt>
            <dd>
              {fmtDate(receipt.from)} ~ {fmtDate(receipt.to)}
            </dd>
          </div>
        </dl>
        <div className="r-dash" />

        <div className="r-cols">
          <span>품목</span>
          <span>금액</span>
        </div>
        <div className="r-dash thin" />

        {all.length === 0 ? (
          <p className="r-empty">
            아직 출력할 내역이 없습니다.
            <br />
            주문서에 구독을 적어주세요.
          </p>
        ) : (
          <ul className="r-lines">
            {receipt.lines.map((l) => (
              <Line key={l.item.id} line={l} active={editingId === l.item.id} printing={printingId === l.item.id} onSelect={() => onSelect(l.item.id)} />
            ))}
            {receipt.voided.map((l) => (
              <Line key={l.item.id} line={l} voided active={editingId === l.item.id} printing={printingId === l.item.id} onSelect={() => onSelect(l.item.id)} />
            ))}
          </ul>
        )}

        <div className="r-dash" />
        <div className="r-total">
          <span>합계 TOTAL</span>
          <strong>{formatKRW(receipt.total)}</strong>
        </div>
        <div className="r-kv">
          <span>월 평균</span>
          <span>{formatKRW(receipt.monthlyAvg)}</span>
        </div>
        <div className="r-kv">
          <span>하루 평균</span>
          <span>{formatKRW(receipt.total / 365)}</span>
        </div>
        {receipt.saved > 0 && (
          <div className="r-kv saved">
            <span>일시정지로 아낀 돈</span>
            <span>-{formatKRW(receipt.saved)}</span>
          </div>
        )}

        {receipt.total > 0 && receipt.conversions.length > 0 && (
          <>
            <div className="r-dash" />
            <p className="r-section">이 돈이면…</p>
            <ul className="r-conv">
              {receipt.conversions.map(({ ref, qty }) => (
                <li key={ref.id}>
                  <span>
                    {ref.emoji} {ref.label}
                  </span>
                  <span>
                    {qty >= 10 ? formatNum(qty) : qty.toFixed(1)}
                    {ref.unit}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}

        <div className="r-dash" />
        <p className="r-message">{footerMessage(receipt.total)}</p>
        <p className="r-fine">
          * 전 품목 자동 갱신 · 해지는 각 서비스에서
          {hasUsd && (
            <>
              <br />* 1 USD = {formatNum(usdRate)}원 기준 환산
            </>
          )}
          <br />* 환산 기준가는 설정에서 바꿀 수 있어요
        </p>

        <Barcode seed={seed} />
        <p className="r-barcode-no">{receiptNo}</p>
        <p className="r-customer">*** 고객용 ***</p>
      </article>
    </div>
  )
}
