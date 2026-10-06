import { barcodeBars } from '../calc'
import type { Row, Size, Tone } from '../receiptRows'
import { FONT_FAMILY, type ReceiptTheme } from '../themes'
import { createCanvas, fitText, font, paperPath, preloadFonts, toBlob } from './canvas'

const PAPER_W = 600
const PAD = 40
const MARGIN = 44
const SCALE = 2
const PX: Record<Size, number> = { xs: 15, sm: 18, md: 20, lg: 28 }
const DESK = '#e9e0cf'

const inner = PAPER_W - PAD * 2

function rowHeight(row: Row): number {
  switch (row.t) {
    case 'shop':
      return 84
    case 'text':
      return PX[row.size ?? 'md'] * 1.6
    case 'kv':
      return PX[row.size ?? 'md'] * 1.6
    case 'dash':
      return 22
    case 'item':
      return 64
    case 'total':
      return 56
    case 'barcode':
      return 100
    case 'empty':
      return row.lines.length * 28 + 40
  }
}

/** 화면과 같은 Row 목록으로 영수증 PNG 생성 */
export async function renderReceiptPng(rows: Row[], theme: ReceiptTheme): Promise<Blob> {
  const family = FONT_FAMILY[theme.font]
  const allText = rows
    .map((r) => ('text' in r ? r.text : '') + ('k' in r ? r.k + r.v : '') + ('name' in r ? r.name + r.sub + r.amount : '') + ('en' in r ? r.en : ''))
    .join('')
  await preloadFonts([font(20, family), font(20, family, true)], allText)

  const contentH = rows.reduce((h, r) => h + rowHeight(r), 0)
  const paperH = contentH + PAD * 2
  const W = PAPER_W + MARGIN * 2
  const H = paperH + MARGIN * 2 + 14
  const { canvas, ctx } = createCanvas(W, H, SCALE)

  const color = (tone: Tone = 'ink') => (tone === 'faint' ? theme.faint : tone === 'accent' ? theme.accent : theme.ink)

  ctx.fillStyle = DESK
  ctx.fillRect(0, 0, W, H)

  ctx.save()
  ctx.shadowColor = 'rgba(60, 40, 20, 0.28)'
  ctx.shadowBlur = 24
  ctx.shadowOffsetY = 8
  ctx.fillStyle = theme.paper
  paperPath(ctx, MARGIN, MARGIN, PAPER_W, paperH)
  ctx.fill()
  ctx.restore()

  const left = MARGIN + PAD
  const right = left + inner
  const center = left + inner / 2
  let y = MARGIN + PAD

  for (const row of rows) {
    const h = rowHeight(row)
    switch (row.t) {
      case 'shop': {
        ctx.fillStyle = theme.ink
        ctx.textAlign = 'center'
        ctx.font = font(34, family, true)
        ctx.letterSpacing = '8px'
        ctx.fillText(row.text, center + 4, y + 40)
        ctx.font = font(13, family)
        ctx.letterSpacing = '5px'
        ctx.fillText(row.en, center + 2, y + 66)
        ctx.letterSpacing = '0px'
        break
      }
      case 'text': {
        const px = PX[row.size ?? 'md']
        ctx.font = font(px, family, row.bold)
        ctx.fillStyle = color(row.tone)
        const centered = row.align === 'center'
        ctx.textAlign = centered ? 'center' : 'left'
        ctx.fillText(fitText(ctx, row.text, inner), centered ? center : left, y + px * 1.15)
        break
      }
      case 'kv': {
        const px = PX[row.size ?? 'md']
        ctx.font = font(px, family, row.bold)
        ctx.fillStyle = color(row.tone)
        const vw = ctx.measureText(row.v).width
        ctx.textAlign = 'left'
        ctx.fillText(fitText(ctx, row.k, inner - vw - 16), left, y + px * 1.15)
        ctx.textAlign = 'right'
        ctx.fillText(row.v, right, y + px * 1.15)
        break
      }
      case 'dash': {
        ctx.strokeStyle = theme.ink
        ctx.globalAlpha = 0.5
        ctx.lineWidth = 1.5
        ctx.setLineDash([6, 5])
        ctx.beginPath()
        ctx.moveTo(left, y + h / 2)
        ctx.lineTo(right, y + h / 2)
        ctx.stroke()
        ctx.setLineDash([])
        ctx.globalAlpha = 1
        break
      }
      case 'item': {
        const voided = row.state === 'void'
        const cut = row.state === 'cut'
        ctx.font = font(PX.md, family, true)
        ctx.fillStyle = voided ? theme.accent : cut ? theme.faint : theme.ink
        ctx.textAlign = 'right'
        const aw = ctx.measureText(row.amount).width
        ctx.fillText(row.amount, right, y + 26)
        if (cut) strike(ctx, right - aw, right, y + 19, theme.faint)

        const name = fitText(ctx, (cut ? '✂ ' : '') + row.name, inner - aw - 20)
        ctx.fillStyle = voided || cut ? theme.faint : theme.ink
        ctx.textAlign = 'left'
        ctx.fillText(name, left, y + 26)
        if (voided) strike(ctx, left, left + ctx.measureText(name).width, y + 19, theme.faint)

        ctx.font = font(PX.xs, family)
        ctx.fillStyle = theme.faint
        ctx.fillText(fitText(ctx, row.sub, inner), left, y + 50)
        break
      }
      case 'total': {
        ctx.fillStyle = theme.ink
        ctx.font = font(PX.md, family, true)
        ctx.textAlign = 'left'
        ctx.fillText(row.k, left, y + 38)
        ctx.font = font(34, family, true)
        ctx.textAlign = 'right'
        ctx.fillText(row.v, right, y + 40)
        break
      }
      case 'barcode': {
        ctx.fillStyle = theme.ink
        const bw = inner
        for (const b of barcodeBars(row.seed)) ctx.fillRect(left + (b.x / 220) * bw, y + 10, (b.w / 220) * bw, 56)
        ctx.font = font(14, family)
        ctx.textAlign = 'center'
        ctx.letterSpacing = '4px'
        ctx.fillText(row.code, center, y + 88)
        ctx.letterSpacing = '0px'
        break
      }
      case 'empty': {
        ctx.font = font(PX.sm, family)
        ctx.fillStyle = theme.faint
        ctx.textAlign = 'center'
        row.lines.forEach((l, i) => ctx.fillText(l, center, y + 36 + i * 28))
        break
      }
    }
    y += h
  }

  return toBlob(canvas)
}

function strike(ctx: CanvasRenderingContext2D, x1: number, x2: number, y: number, color: string) {
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(x1, y)
  ctx.lineTo(x2, y)
  ctx.stroke()
  ctx.restore()
}
