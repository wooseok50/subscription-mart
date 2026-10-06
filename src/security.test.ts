import { describe, expect, it } from 'vitest'
import { decodeShare, encodeShare } from './share'
import { DEFAULT_DATA, parseData } from './storage'
import { isThemeId } from './themes'
import type { AppData } from './types'

/** 외부 입력(공유 링크, 백업 파일, localStorage) 검증 테스트 */

const b64 = (o: unknown) => '#s=' + Buffer.from(JSON.stringify(o)).toString('base64url')

const sample: AppData = {
  ...DEFAULT_DATA,
  theme: 'cafe',
  items: [
    { id: 'x', name: '넷플릭스', price: 17000, currency: 'KRW', cycle: 'monthly', category: '영상', active: true, startDate: '2026-01-15' },
    { id: 'y', name: 'Claude', price: 20, currency: 'USD', cycle: 'monthly', category: '생산성', active: false, startDate: null },
  ],
}

describe('isThemeId', () => {
  it('정의된 테마만 허용', () => {
    expect(isThemeId('mart')).toBe(true)
    expect(isThemeId('dabang')).toBe(true)
  })

  it('프로토타입 키 차단', () => {
    for (const k of ['toString', 'constructor', '__proto__', 'hasOwnProperty', 'valueOf']) expect(isThemeId(k)).toBe(false)
  })
})

describe('공유 링크', () => {
  it('인코딩 후 디코딩 시 내용 보존', () => {
    const out = decodeShare(encodeShare(sample))!
    expect(out.theme).toBe('cafe')
    expect(out.items.map(({ name, price, currency, cycle, category, active, startDate }) => ({ name, price, currency, cycle, category, active, startDate }))).toEqual(
      sample.items.map(({ name, price, currency, cycle, category, active, startDate }) => ({ name, price, currency, cycle, category, active, startDate })),
    )
  })

  it('프로토타입 키 테마는 기본 테마로 대체', () => {
    const out = decodeShare(b64({ v: 1, r: 1400, t: 'toString', i: [['a', 1, 0, 1, 0, 1, 0]] }))
    expect(out?.theme).toBe('mart')
  })

  it('형식 오류·잘린 값은 null', () => {
    for (const h of ['', '#s=', '#s=%%%', '#s=bm90IGpzb24', '#x=abc', b64(null), b64([]), b64({ v: 2, i: [] })]) {
      expect(decodeShare(h)).toBeNull()
    }
  })

  it('항목 없으면 null', () => expect(decodeShare(b64({ v: 1, r: 1400, t: 'mart', i: [] }))).toBeNull())

  it('과도하게 긴 해시 거부', () => expect(decodeShare('#s=' + 'A'.repeat(20_000))).toBeNull())

  it('잘못된 항목만 버리고 나머지 유지', () => {
    const out = decodeShare(
      b64({
        v: 1,
        r: 1400,
        t: 'mart',
        i: [
          ['정상', 1000, 0, 1, 0, 1, '2026-01-01'],
          ['음수', -5, 0, 1, 0, 1, 0],
          ['문자열가격', '1000', 0, 1, 0, 1, 0],
          ['초과가격', 2_000_000_000, 0, 1, 0, 1, 0],
          ['주기오류', 1000, 0, 9, 0, 1, 0],
          [{ evil: 1 }, 1000, 0, 1, 0, 1, 0],
          'not-array',
        ],
      }),
    )
    expect(out?.items.map((s) => s.name)).toEqual(['정상'])
  })

  it('이름 길이 제한, 잘못된 날짜·분류 보정', () => {
    const out = decodeShare(b64({ v: 1, r: 1400, t: 'mart', i: [['가'.repeat(500), 1000, 0, 1, 99, 1, '2026-02-30']] }))!
    expect(out.items[0].name).toHaveLength(50)
    expect(out.items[0].category).toBe('기타')
    expect(out.items[0].startDate).toBeNull()
  })

  it('HTML 문자열은 텍스트 그대로 유지 (React 출력 시 이스케이프)', () => {
    const out = decodeShare(b64({ v: 1, r: 1400, t: 'mart', i: [['<img src=x onerror=alert(1)>', 1000, 0, 1, 0, 1, 0]] }))!
    expect(out.items[0].name).toBe('<img src=x onerror=alert(1)>')
  })
})

describe('parseData (백업·저장소)', () => {
  it('비정상 환율은 기본값', () => {
    expect(parseData({ items: [], usdRate: -1 })?.usdRate).toBe(DEFAULT_DATA.usdRate)
    expect(parseData({ items: [], usdRate: 'x' })?.usdRate).toBe(DEFAULT_DATA.usdRate)
  })

  it('항목 수 상한 200개', () => {
    const items = Array.from({ length: 500 }, (_, i) => ({ id: String(i), name: 'n', price: 1, currency: 'KRW', cycle: 'monthly', active: true }))
    expect(parseData({ items })?.items).toHaveLength(200)
  })

  it('__proto__ 키가 있어도 오염 없음', () => {
    const parsed = JSON.parse('{"items":[],"__proto__":{"polluted":true},"theme":"__proto__"}')
    const out = parseData(parsed)!
    expect(out.theme).toBe('mart')
    expect(({} as Record<string, unknown>).polluted).toBeUndefined()
  })

  it('items 배열이 아니면 null', () => {
    expect(parseData({ items: 'x' })).toBeNull()
    expect(parseData(null)).toBeNull()
  })
})
