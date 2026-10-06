import type { ThemeId } from './types'

export interface ReceiptTheme {
  id: ThemeId
  label: string
  shop: string
  shopEn: string
  meta: string[]
  /** 머리말 아래 추가 문구. 시드로 주문번호 등 생성 */
  headExtra?: (seed: number) => string
  /** 합계 아래 테마 고유 줄 */
  extras: [string, string][]
  closing: string
  font: 'mono' | 'round'
  paper: string
  ink: string
  faint: string
  accent: string
}

export const THEMES: Record<ThemeId, ReceiptTheme> = {
  mart: {
    id: 'mart',
    label: '마트',
    shop: '구독상회',
    shopEn: 'SUBSCRIPTION MART',
    meta: ['서울특별시 내지갑구 자동결제로 12', '대표 : 나 · 영업시간 : 24시간 365일'],
    extras: [],
    closing: '*** 고객용 ***',
    font: 'mono',
    paper: '#fffdf6',
    ink: '#2b2622',
    faint: '#8c8478',
    accent: '#c8423a',
  },
  store: {
    id: 'store',
    label: '편의점',
    shop: '구독24',
    shopEn: 'SUB24 CONVENIENCE',
    meta: ['내지갑점 · 자동결제로 24', '연중무휴 · 결제는 쉬지 않습니다'],
    extras: [
      ['구독 포인트 적립', '0P'],
      ['2+1 행사 상품', '해당 없음'],
    ],
    closing: '*** 영수증은 넣어두세요 ***',
    font: 'mono',
    paper: '#fbfdff',
    ink: '#1d2733',
    faint: '#7c8794',
    accent: '#1f7a4d',
  },
  cafe: {
    id: 'cafe',
    label: '카페',
    shop: 'CAFE SUBSCRIBE',
    shopEn: '카 페 구 독',
    meta: ['오늘도 자동으로 주문되었습니다', 'Wi-Fi : my-wallet / PW : unsubscribe'],
    headExtra: (seed) => `주문번호 ${100 + (seed % 900)}`,
    extras: [['진동벨', '매달 울림']],
    closing: '☕ 맛있게 구독하세요',
    font: 'mono',
    paper: '#fbf6ee',
    ink: '#3b2a20',
    faint: '#9a8573',
    accent: '#8a5a2b',
  },
  dabang: {
    id: 'dabang',
    label: '다방',
    shop: '구독다방',
    shopEn: '— since 매달 —',
    meta: ['종로구 월정액길 7 (2층)', '마담 : 나 · 쌍화차 주문 받습니다'],
    extras: [['계란 노른자 추가', '무료']],
    closing: '*** 또 오이소 ***',
    font: 'round',
    paper: '#f6ecd6',
    ink: '#4a2c1a',
    faint: '#9b7b5c',
    accent: '#a3322a',
  },
}

export const THEME_IDS = Object.keys(THEMES) as ThemeId[]

export const isThemeId = (v: unknown): v is ThemeId => typeof v === 'string' && v in THEMES

export const FONT_FAMILY: Record<ReceiptTheme['font'], string> = {
  mono: '"Nanum Gothic Coding"',
  round: '"Gowun Dodum"',
}
