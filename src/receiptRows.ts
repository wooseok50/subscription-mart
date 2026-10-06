import { footerMessage, formatKRW, formatNum, formatPrice, formatQty, hashString, type Receipt, type ReceiptLine } from './calc'
import type { ReceiptTheme } from './themes'
import { CYCLE_LABEL } from './types'

export type Tone = 'ink' | 'faint' | 'accent'
export type Size = 'xs' | 'sm' | 'md' | 'lg'

/** 영수증 한 줄 단위 표현. 화면(React)과 이미지(canvas) 공용 */
export type Row =
  | { t: 'shop'; text: string; en: string }
  | { t: 'text'; text: string; align?: 'left' | 'center'; tone?: Tone; size?: Size; bold?: boolean }
  | { t: 'kv'; k: string; v: string; tone?: Tone; size?: Size; bold?: boolean }
  | { t: 'dash' }
  | { t: 'item'; id: string; name: string; amount: string; sub: string; state: 'normal' | 'void' | 'cut' }
  | { t: 'total'; k: string; v: string }
  | { t: 'barcode'; seed: number; code: string }
  | { t: 'empty'; lines: string[] }

const pad = (n: number) => String(n).padStart(2, '0')
export const fmtDate = (d: Date) => `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`

interface Ctx {
  usdRate: number
  printedAt: Date
}

function itemRow(l: ReceiptLine, voided: boolean, mode: Receipt['mode']): Row {
  const { item, count, amount, cut } = l
  const unknown = mode === 'life' && !item.startDate
  let sub = `${CYCLE_LABEL[item.cycle]} ${formatPrice(item)} × ${count}회`
  if (!item.startDate) sub = mode === 'life' ? `${CYCLE_LABEL[item.cycle]} ${formatPrice(item)} · 결제일 미입력` : `${sub} (결제일 미입력)`
  if (cut) sub += ' · 해지 예정'
  return {
    t: 'item',
    id: item.id,
    name: item.name,
    amount: voided ? 'VOID' : unknown ? '-' : formatNum(amount),
    sub,
    state: voided ? 'void' : cut ? 'cut' : 'normal',
  }
}

export function receiptSeed(receipt: Receipt): number {
  return hashString([...receipt.lines, ...receipt.voided].map((l) => l.item.id + l.amount).join('|') + receipt.mode)
}

export function buildRows(receipt: Receipt, theme: ReceiptTheme, ctx: Ctx): Row[] {
  const rows: Row[] = []
  const seed = receiptSeed(receipt)
  const code = `${fmtDate(receipt.from).replaceAll('.', '')}-${String(seed % 10000).padStart(4, '0')}`
  const life = receipt.mode === 'life'
  const all = [...receipt.lines, ...receipt.voided]
  const { printedAt: now } = ctx

  rows.push({ t: 'shop', text: theme.shop, en: theme.shopEn })
  for (const m of theme.meta) rows.push({ t: 'text', text: m, align: 'center', tone: 'faint', size: 'xs' })
  if (theme.headExtra) rows.push({ t: 'text', text: theme.headExtra(seed), align: 'center', size: 'lg', bold: true })

  rows.push({ t: 'dash' })
  rows.push({ t: 'kv', k: '영수증번호', v: code, size: 'xs' })
  rows.push({ t: 'kv', k: '출력일시', v: `${fmtDate(now)} ${pad(now.getHours())}:${pad(now.getMinutes())}`, size: 'xs' })
  rows.push({ t: 'kv', k: life ? '구독기간' : '청구기간', v: `${fmtDate(receipt.from)} ~ ${fmtDate(receipt.to)}`, size: 'xs' })
  rows.push({ t: 'dash' })
  rows.push({ t: 'kv', k: '품목', v: '금액', tone: 'faint', size: 'xs' })
  rows.push({ t: 'dash' })

  if (all.length === 0) {
    rows.push({ t: 'empty', lines: ['아직 출력할 내역이 없습니다.', '주문서에 구독을 적어주세요.'] })
  } else {
    for (const l of receipt.lines) rows.push(itemRow(l, false, receipt.mode))
    for (const l of receipt.voided) rows.push(itemRow(l, true, receipt.mode))
  }

  rows.push({ t: 'dash' })
  if (receipt.cutAmount > 0) {
    rows.push({ t: 'kv', k: '소계', v: formatKRW(receipt.subtotal), size: 'sm' })
    rows.push({ t: 'kv', k: '✂ 해지 할인', v: `-${formatKRW(receipt.cutAmount)}`, size: 'sm', tone: 'accent', bold: true })
  }
  rows.push({ t: 'total', k: life ? '누적 TOTAL' : '합계 TOTAL', v: formatKRW(receipt.total) })

  if (life) {
    rows.push({ t: 'kv', k: '첫 결제 이후', v: `${formatNum(receipt.days)}일`, size: 'sm' })
    if (receipt.days > 0) rows.push({ t: 'kv', k: '하루 평균', v: formatKRW(receipt.total / receipt.days), size: 'sm' })
  } else {
    rows.push({ t: 'kv', k: '월 평균', v: formatKRW(receipt.total / 12), size: 'sm' })
    rows.push({ t: 'kv', k: '하루 평균', v: formatKRW(receipt.total / 365), size: 'sm' })
    if (receipt.saved > 0) rows.push({ t: 'kv', k: '일시정지로 아낀 돈', v: `-${formatKRW(receipt.saved)}`, size: 'sm', tone: 'accent' })
  }
  for (const [k, v] of theme.extras) rows.push({ t: 'kv', k, v, size: 'sm', tone: 'faint' })

  if (receipt.cutConversion) {
    const { ref, qty } = receipt.cutConversion
    rows.push({ t: 'text', text: `✂ 해지하면 ${ref.emoji} ${ref.label} ${formatQty(qty)}${ref.unit} 아껴요`, tone: 'accent', size: 'sm', bold: true })
  }

  if (receipt.total > 0 && receipt.conversions.length > 0) {
    rows.push({ t: 'dash' })
    rows.push({ t: 'text', text: '이 돈이면…', bold: true })
    for (const { ref, qty } of receipt.conversions) {
      rows.push({ t: 'kv', k: `${ref.emoji} ${ref.label}`, v: `${formatQty(qty)}${ref.unit}`, size: 'sm', bold: true })
    }
  }

  rows.push({ t: 'dash' })
  rows.push({ t: 'text', text: footerMessage(receipt), align: 'center', bold: true })

  const fine = life
    ? ['* 현재 가격 기준 추정치예요']
    : ['* 전 품목 자동 갱신 · 해지는 각 서비스에서']
  if (all.some((l) => l.item.currency === 'USD')) fine.push(`* 1 USD = ${formatNum(ctx.usdRate)}원 기준 환산`)
  if (receipt.undated > 0) fine.push(life ? '* 결제일 미입력 품목은 누적에서 제외' : '* 결제일 미입력 품목은 기본 횟수로 계산')
  for (const f of fine) rows.push({ t: 'text', text: f, tone: 'faint', size: 'xs' })

  rows.push({ t: 'barcode', seed, code })
  rows.push({ t: 'text', text: theme.closing, align: 'center', tone: 'faint', size: 'xs' })
  return rows
}
