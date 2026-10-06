/** 캔버스 이미지 생성 공용 유틸 */

export const FAMILY = {
  mono: '"Nanum Gothic Coding"',
  hand: '"Nanum Pen Script"',
  round: '"Gowun Dodum"',
} as const

export const font = (px: number, family: string, bold = false) => `${bold ? 700 : 400} ${px}px ${family}, sans-serif`

/** 그릴 글자에 필요한 웹폰트 subset 선로딩. 미로딩 시 대체 글꼴로 그려짐 */
export async function preloadFonts(specs: string[], text: string): Promise<void> {
  if (!('fonts' in document)) return
  const sample = text || '가'
  await Promise.all(specs.map((s) => document.fonts.load(s, sample).catch(() => [])))
}

export function createCanvas(width: number, height: number, scale: number) {
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(width * scale)
  canvas.height = Math.round(height * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas 2d 미지원')
  ctx.scale(scale, scale)
  ctx.textBaseline = 'alphabetic'
  return { canvas, ctx }
}

/** 너비 초과 시 말줄임 처리 */
export function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text
  const chars = [...text]
  while (chars.length > 1 && ctx.measureText(chars.join('') + '…').width > maxWidth) chars.pop()
  return chars.join('') + '…'
}

/** 하단 톱니 절취선 종이 경로 */
export function paperPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, tooth = 14) {
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x + w, y)
  ctx.lineTo(x + w, y + h)
  const n = Math.floor(w / tooth)
  const step = w / n
  for (let i = n; i > 0; i--) {
    ctx.lineTo(x + (i - 0.5) * step, y + h + tooth / 2)
    ctx.lineTo(x + (i - 1) * step, y + h)
  }
  ctx.closePath()
}

export function toBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('이미지 생성 실패'))), 'image/png'),
  )
}
