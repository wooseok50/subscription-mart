import { bestConversion, unitKRW, type Conversion } from './calc'
import { paymentsBetween } from './schedule'
import { CATEGORY_COLOR, type RefItem, type Subscription } from './types'

const CAT_TITLE: Record<string, string> = {
  영상: '정주행 장인',
  음악: '귀호강 수집가',
  클라우드: '디지털 창고지기',
  생산성: '효율 중독자',
  게임: '시즌패스 수집가',
  쇼핑: '새벽배송 VIP',
  교육: '평생 학습러',
  기타: '다방면 구독러',
}

export interface WrapStats {
  from: Date
  to: Date
  total: number
  monthly: number
  count: number
  top: { name: string; amount: number } | null
  peak: { date: Date; amount: number; names: string[] } | null
  categories: { category: string; amount: number; ratio: number; color: string }[]
  nickname: string
  conversion: Conversion | null
}

/** 결산 카드 통계. 해지 시뮬레이션은 반영하지 않은 실제 1년 기준 */
export function wrapStats(items: Subscription[], usdRate: number, refs: RefItem[], today: Date): WrapStats {
  const to = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate())
  const active = items.filter((s) => s.active)
  const DEFAULT = { weekly: 52, monthly: 12, yearly: 1 } as const

  const perItem = active.map((s) => {
    const dates = s.startDate ? paymentsBetween(s, today, to) : []
    const count = s.startDate ? dates.length : DEFAULT[s.cycle]
    return { s, dates, amount: count * unitKRW(s, usdRate) }
  })
  const total = perItem.reduce((sum, p) => sum + p.amount, 0)

  // 같은 날짜 결제 합산으로 가장 큰 날 선정
  const byDate = new Map<number, { date: Date; amount: number; names: string[] }>()
  for (const p of perItem) {
    for (const d of p.dates) {
      const cur = byDate.get(d.getTime()) ?? { date: d, amount: 0, names: [] }
      cur.amount += unitKRW(p.s, usdRate)
      cur.names.push(p.s.name)
      byDate.set(d.getTime(), cur)
    }
  }
  const peak = [...byDate.values()].sort((a, b) => b.amount - a.amount || a.date.getTime() - b.date.getTime())[0] ?? null

  const catMap = new Map<string, number>()
  for (const p of perItem) catMap.set(p.s.category, (catMap.get(p.s.category) ?? 0) + p.amount)
  const categories = [...catMap]
    .map(([category, amount]) => ({ category, amount, ratio: total > 0 ? amount / total : 0, color: CATEGORY_COLOR[category] ?? CATEGORY_COLOR['기타'] }))
    .sort((a, b) => b.amount - a.amount)

  const topItem = [...perItem].sort((a, b) => b.amount - a.amount)[0]
  const n = active.length
  const prefix = n >= 8 ? '구독 부자 ' : n >= 5 ? '프로 ' : n > 0 && n <= 2 ? '미니멀 ' : ''
  const nickname = categories[0] ? prefix + CAT_TITLE[categories[0].category] : '구독 새내기'

  return {
    from: today,
    to: new Date(to.getFullYear(), to.getMonth(), to.getDate() - 1),
    total,
    monthly: total / 12,
    count: n,
    top: topItem ? { name: topItem.s.name, amount: topItem.amount } : null,
    peak,
    categories,
    nickname,
    conversion: total > 0 ? bestConversion(total, refs) : null,
  }
}
