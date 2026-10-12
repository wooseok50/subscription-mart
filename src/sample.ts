import { addDays, toDateString } from './schedule'
import type { Currency, Cycle, Subscription } from './types'

/** 첫 방문용 예시 목록. 실제 서비스 가격이 아닌 어림값이며, 결제일은 오늘 기준으로 분산함 */
const SAMPLE: { name: string; price: number; currency?: Currency; cycle?: Cycle; category: string; offset: number }[] = [
  { name: '영상 스트리밍 (예시)', price: 13_500, category: '영상', offset: 4 },
  { name: '음악 스트리밍 (예시)', price: 10_900, category: '음악', offset: 11 },
  { name: '클라우드 저장공간 (예시)', price: 3_300, category: '클라우드', offset: -2 },
  { name: 'AI 도구 (예시)', price: 20, currency: 'USD', category: '생산성', offset: 17 },
  { name: '쇼핑 멤버십 (예시)', price: 7_900, category: '쇼핑', offset: 23 },
  { name: '운동 앱 연간권 (예시)', price: 59_000, cycle: 'yearly', category: '기타', offset: 40 },
]

export function sampleItems(today: Date): Subscription[] {
  return SAMPLE.map((s, i) => ({
    id: `sample-${i}-${crypto.randomUUID()}`,
    name: s.name,
    price: s.price,
    currency: s.currency ?? 'KRW',
    cycle: s.cycle ?? 'monthly',
    category: s.category,
    active: true,
    // 과거 날짜로 두어 누적 모드에서도 값이 보이게 함
    startDate: toDateString(addDays(today, s.offset - 365)),
  }))
}

/** 자주 잊는 구독 목록. 누르면 주문서 품목에 채움 */
export const FORGOTTEN: { name: string; category: string }[] = [
  { name: '통신사 부가서비스', category: '기타' },
  { name: '앱스토어 정기결제', category: '기타' },
  { name: '클라우드 추가 용량', category: '클라우드' },
  { name: '배달앱 멤버십', category: '쇼핑' },
  { name: '웹툰·웹소설 이용권', category: '영상' },
  { name: '뉴스·매거진 구독', category: '교육' },
  { name: '운동·명상 앱', category: '기타' },
  { name: '게임 패스', category: '게임' },
  { name: '도메인·호스팅', category: '기타' },
  { name: '온라인 강의', category: '교육' },
]
