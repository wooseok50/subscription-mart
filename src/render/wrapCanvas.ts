import { formatKRW, formatQty } from '../calc'
import { fmtDate } from '../receiptRows'
import type { WrapStats } from '../wrap'
import { createCanvas, FAMILY, fitText, font, paperPath, preloadFonts, toBlob } from './canvas'

const W = 1080
const H = 1920
const PAPER = '#ffffff'
const INK = '#1f1b18'
const FAINT = '#8a8279'
const STAMP = '#e5443a'

/** 인스타 스토리 비율(9:16) 결산 카드 */
export async function renderWrapPng(stats: WrapStats, siteHost: string): Promise<Blob> {
  const text = [
    stats.nickname,
    stats.top?.name ?? '',
    stats.peak?.names.join('') ?? '',
    stats.categories.map((c) => c.category).join(''),
    stats.conversion ? stats.conversion.ref.label + stats.conversion.ref.unit : '',
    '나의 구독 결산 앞으로 1년 동안 낼 구독료 월 평균 구독 수 하루 가장 비싼 지갑이 아픈 날 분류별 비중 이 돈이면 내 영수증도 뽑아보기 원 개 회 년 월 일 외 건 SUBSCRIPTION WRAPPED 구독상회',
    siteHost,
  ].join('')
  await preloadFonts([font(40, FAMILY.mono), font(40, FAMILY.mono, true), font(40, FAMILY.hand), font(40, FAMILY.round)], text)

  const { canvas, ctx } = createCanvas(W, H, 1)

  // 화면과 같은 밝은 크림 바탕 + 파스텔 조명
  ctx.fillStyle = '#fffaf1'
  ctx.fillRect(0, 0, W, H)
  const glow = (x: number, y: number, r: number, color: string) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r)
    g.addColorStop(0, color)
    g.addColorStop(1, 'rgba(255, 255, 255, 0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)
  }
  glow(120, 60, 900, 'rgba(255, 214, 92, 0.55)')
  glow(1080, 700, 800, 'rgba(255, 170, 140, 0.4)')
  glow(400, 1920, 900, 'rgba(120, 220, 180, 0.35)')

  ctx.textAlign = 'left'
  ctx.fillStyle = STAMP
  ctx.font = font(28, FAMILY.mono)
  ctx.letterSpacing = '6px'
  ctx.fillText('구독상회 · SUBSCRIPTION WRAPPED', 90, 150)
  ctx.letterSpacing = '0px'

  ctx.fillStyle = INK
  ctx.font = font(124, FAMILY.hand)
  ctx.fillText('나의 구독 결산', 86, 290)
  ctx.fillStyle = '#6e665e'
  ctx.font = font(32, FAMILY.round)
  ctx.fillText(`${fmtDate(stats.from)} ~ ${fmtDate(stats.to)} · 앞으로 1년`, 92, 350)

  // 영수증 종이
  const px = 90
  const py = 410
  const pw = W - px * 2
  const ph = 1300
  ctx.save()
  ctx.shadowColor = 'rgba(80, 50, 20, 0.28)'
  ctx.shadowBlur = 50
  ctx.shadowOffsetY = 18
  ctx.fillStyle = PAPER
  paperPath(ctx, px, py, pw, ph, 28)
  ctx.fill()
  ctx.restore()

  const L = px + 64
  const R = px + pw - 64
  const inner = R - L
  let y = py + 100

  const dash = () => {
    ctx.save()
    ctx.strokeStyle = INK
    ctx.globalAlpha = 0.45
    ctx.lineWidth = 2.5
    ctx.setLineDash([12, 9])
    ctx.beginPath()
    ctx.moveTo(L, y)
    ctx.lineTo(R, y)
    ctx.stroke()
    ctx.restore()
  }

  ctx.fillStyle = FAINT
  ctx.font = font(34, FAMILY.mono)
  ctx.fillText('1년 동안 낼 구독료', L, y)
  y += 120
  ctx.fillStyle = INK
  ctx.font = font(118, FAMILY.mono, true)
  ctx.fillText(fitText(ctx, formatKRW(stats.total), inner), L, y)
  y += 80

  const cols = [
    ['월 평균', formatKRW(stats.monthly)],
    ['구독 수', `${stats.count}개`],
    ['하루', formatKRW(stats.total / 365)],
  ]
  const cw = inner / 3
  cols.forEach(([k, v], i) => {
    ctx.fillStyle = FAINT
    ctx.font = font(28, FAMILY.mono)
    ctx.fillText(k, L + cw * i, y)
    ctx.fillStyle = INK
    ctx.font = font(40, FAMILY.mono, true)
    ctx.fillText(fitText(ctx, v, cw - 16), L + cw * i, y + 56)
  })
  y += 110
  dash()
  y += 75

  const kv = (k: string, v: string, sub?: string) => {
    ctx.fillStyle = FAINT
    ctx.font = font(30, FAMILY.mono)
    ctx.textAlign = 'left'
    ctx.fillText(k, L, y)
    ctx.fillStyle = INK
    ctx.font = font(44, FAMILY.mono, true)
    ctx.fillText(fitText(ctx, v, inner), L, y + 62)
    if (sub) {
      ctx.fillStyle = FAINT
      ctx.font = font(28, FAMILY.mono)
      ctx.fillText(fitText(ctx, sub, inner), L, y + 108)
    }
    y += sub ? 165 : 125
  }

  if (stats.top) kv('가장 비싼 구독', stats.top.name, `1년 ${formatKRW(stats.top.amount)}`)
  if (stats.peak) {
    const d = stats.peak.date
    const names = stats.peak.names.length > 2 ? `${stats.peak.names.slice(0, 2).join(', ')} 외 ${stats.peak.names.length - 2}건` : stats.peak.names.join(', ')
    kv('지갑이 가장 아픈 날', `${d.getMonth() + 1}월 ${d.getDate()}일 ${formatKRW(stats.peak.amount)}`, names)
  }

  if (stats.categories.length > 0) {
    dash()
    y += 65
    ctx.fillStyle = FAINT
    ctx.font = font(30, FAMILY.mono)
    ctx.fillText('분류별 비중', L, y)
    y += 30
    for (const c of stats.categories.slice(0, 4)) {
      y += 44
      ctx.fillStyle = INK
      ctx.font = font(30, FAMILY.mono)
      ctx.textAlign = 'left'
      ctx.fillText(c.category, L, y)
      ctx.textAlign = 'right'
      ctx.fillText(`${Math.round(c.ratio * 100)}%`, R, y)
      ctx.textAlign = 'left'
      const barX = L + 150
      const barW = inner - 150 - 100
      ctx.fillStyle = '#f1ece4'
      ctx.fillRect(barX, y - 20, barW, 16)
      ctx.fillStyle = c.color
      ctx.fillRect(barX, y - 20, Math.max(barW * c.ratio, 6), 16)
    }
    y += 40
  }

  if (stats.conversion) {
    y = Math.max(y, py + ph - 160)
    dash()
    y += 65
    const { ref, qty } = stats.conversion
    ctx.fillStyle = INK
    ctx.font = font(36, FAMILY.mono, true)
    ctx.textAlign = 'center'
    ctx.fillText(fitText(ctx, `이 돈이면 ${ref.emoji} ${ref.label} ${formatQty(qty)}${ref.unit}`, inner), W / 2, y)
    ctx.textAlign = 'left'
  }

  // 별명 도장
  ctx.save()
  ctx.translate(W - 250, py + 40)
  ctx.rotate((-9 * Math.PI) / 180)
  ctx.font = font(64, FAMILY.hand)
  const tw = Math.min(ctx.measureText(stats.nickname).width, 520)
  const bw = tw + 64
  ctx.strokeStyle = STAMP
  ctx.lineWidth = 6
  ctx.globalAlpha = 0.9
  ctx.strokeRect(-bw / 2, -54, bw, 108)
  ctx.lineWidth = 2
  ctx.strokeRect(-bw / 2 + 10, -44, bw - 20, 88)
  ctx.fillStyle = STAMP
  ctx.textAlign = 'center'
  ctx.fillText(fitText(ctx, stats.nickname, 520), 0, 20)
  ctx.restore()

  ctx.textAlign = 'center'
  ctx.fillStyle = STAMP
  ctx.font = font(52, FAMILY.hand)
  ctx.fillText('내 영수증도 뽑아보기 →', W / 2, H - 112)
  if (siteHost) {
    ctx.fillStyle = '#6e665e'
    ctx.font = font(28, FAMILY.mono)
    ctx.fillText(siteHost, W / 2, H - 62)
  }

  return toBlob(canvas)
}
