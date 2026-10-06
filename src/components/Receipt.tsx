import type { CSSProperties } from 'react'
import { barcodeBars } from '../calc'
import type { Row } from '../receiptRows'
import { FONT_FAMILY, type ReceiptTheme } from '../themes'

export interface Stamp {
  key: number
  title: string
  sub: string
}

interface Props {
  rows: Row[]
  theme: ReceiptTheme
  editingId?: string | null
  printingId?: string | null
  stamp?: Stamp | null
  onSelect?: (id: string) => void
  onCut?: (id: string) => void
}

function Barcode({ seed }: { seed: number }) {
  return (
    <svg className="barcode" viewBox="0 0 220 40" preserveAspectRatio="none" aria-hidden="true">
      {barcodeBars(seed).map((b) => (
        <rect key={b.x} x={b.x} y="0" width={b.w} height="40" />
      ))}
    </svg>
  )
}

export default function Receipt({ rows, theme, editingId, printingId, stamp, onSelect, onCut }: Props) {
  const vars = {
    '--r-paper': theme.paper,
    '--r-ink': theme.ink,
    '--r-faint': theme.faint,
    '--r-accent': theme.accent,
    '--r-font': FONT_FAMILY[theme.font],
  } as CSSProperties

  return (
    <article className={`receipt theme-${theme.id}`} style={vars} aria-label={`${theme.shop} 영수증`}>
      {rows.map((row, i) => {
        switch (row.t) {
          case 'shop':
            return (
              <header key={i} className="r-head">
                <p className="r-shop">{row.text}</p>
                <p className="r-shop-en">{row.en}</p>
              </header>
            )
          case 'text':
            return (
              <p key={i} className={`r-text ${row.align ?? 'left'} ${row.tone ?? 'ink'} ${row.size ?? 'md'}${row.bold ? ' bold' : ''}`}>
                {row.text}
              </p>
            )
          case 'kv':
            return (
              <div key={i} className={`r-kv ${row.tone ?? 'ink'} ${row.size ?? 'md'}${row.bold ? ' bold' : ''}`}>
                <span>{row.k}</span>
                <span>{row.v}</span>
              </div>
            )
          case 'dash':
            return <div key={i} className="r-dash" />
          case 'total':
            return (
              <div key={i} className="r-total">
                <span>{row.k}</span>
                <strong>{row.v}</strong>
              </div>
            )
          case 'barcode':
            return (
              <div key={i} className="r-barcode">
                <Barcode seed={row.seed} />
                <p>{row.code}</p>
              </div>
            )
          case 'empty':
            return (
              <p key={i} className="r-empty">
                {row.lines.map((l) => (
                  <span key={l}>{l}</span>
                ))}
              </p>
            )
          case 'item': {
            const body = (
              <>
                <span className="r-row">
                  <span className="r-name">
                    {row.state === 'cut' && <span aria-hidden="true">✂ </span>}
                    {row.name}
                  </span>
                  <span className="r-amount">{row.amount}</span>
                </span>
                <span className="r-sub">{row.sub}</span>
              </>
            )
            const cls = `r-line ${row.state}${editingId === row.id ? ' selected' : ''}${printingId === row.id ? ' printing' : ''}`
            return (
              <div key={row.id} className={cls}>
                {onSelect ? (
                  <button type="button" className="r-main" onClick={() => onSelect(row.id)} aria-label={`${row.name} 수정`}>
                    {body}
                  </button>
                ) : (
                  <div className="r-main">{body}</div>
                )}
                {onCut && row.state !== 'void' && (
                  <button
                    type="button"
                    className={`r-cut no-print${row.state === 'cut' ? ' on' : ''}`}
                    onClick={() => onCut(row.id)}
                    aria-pressed={row.state === 'cut'}
                    aria-label={`${row.name} 해지 시뮬레이션`}
                    title={row.state === 'cut' ? '해지 취소' : '해지해 보기'}
                  >
                    ✂
                  </button>
                )}
              </div>
            )
          }
        }
      })}

      {stamp && (
        <div key={stamp.key} className="r-stamp no-print" role="status">
          <strong>{stamp.title}</strong>
          <span>{stamp.sub}</span>
        </div>
      )}
    </article>
  )
}
