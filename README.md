# 구독상회 — 1년치 구독 영수증

> 매달 조금씩, 1년이면 영수증 한 장.

지금 쓰는 구독을 주문서에 적으면 앞으로 1년 동안 낼 돈을 감열지 영수증으로 뽑아주는 웹앱.

## 화면 구성

| 단계 | 내용 |
| --- | --- |
| 01 주문서 작성 | 손글씨 주문서 스타일 입력. 품목·금액(원/USD)·주기·분류·결제일 |
| 02 1년치 영수증 | 오늘부터 1년간 실제 결제 횟수 기준 청구 내역, 합계·월/하루 평균, 일시정지(VOID) 절약액, '이 돈이면' 환산, 바코드. 품목 클릭 시 수정 |
| 03 결제 일정표 | 탁상 달력 형태의 월별 결제일, 해당 월 결제 합계, 30일 이내 D-day 목록 |
| 04 계산대 서랍 | 환율, 환산 기준가(예시값, 직접 수정), JSON 백업·복원 |

- 결제일 기준 반복 계산. 31일 결제는 짧은 달에 말일로 처리함
- 결제일 미입력 구독은 주기별 기본 횟수(주 52 / 월 12 / 연 1)로 계산함
- 영수증만 인쇄·PDF 저장 가능 (`인쇄 · PDF` 버튼)
- 서버 없음. 데이터는 브라우저 `localStorage`에만 저장됨
- 라이트/다크 모드, 모바일 대응, `prefers-reduced-motion` 대응

## 기술 스택

| 항목 | 버전 |
| --- | --- |
| Vite | 8.3.x |
| React | 19.x |
| TypeScript | 6.0.x |
| 폰트 | Nanum Gothic Coding · Nanum Pen Script · Gowun Dodum (`@fontsource`, OFL-1.1, 자체 호스팅) |
| Node.js | 20.19+ 또는 22.12+ (Vite 8 요구사항) |

## 실행

```bash
npm install
npm run dev
```

## 검증

```bash
npm run build
npm run lint
npm audit
```

## Vercel 배포 (Hobby 플랜)

1. GitHub 저장소에 push
2. Vercel 대시보드 → Add New → Project → 저장소 Import
3. Framework Preset `Vite` 자동 감지 (Build: `npm run build`, Output: `dist`)
4. Deploy

`vercel.json`에 보안 헤더(CSP 등) 설정함. 폰트는 번들에 포함되어 외부 요청 없음. 외부 리소스 추가 시 CSP 수정 필요함.

Hobby 플랜은 개인·비상업 용도로 한정됨. 최신 한도는 https://vercel.com/pricing 확인.
