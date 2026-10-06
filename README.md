# 구독상회 — 1년치 구독 영수증

> 매달 조금씩, 1년이면 영수증 한 장.

지금 쓰는 구독을 주문서에 적으면 앞으로 1년 동안 낼 돈을 감열지 영수증으로 뽑아주는 웹앱.

## 화면 구성

| 단계 | 내용 |
| --- | --- |
| 01 주문서 작성 | 손글씨 주문서 스타일 입력. 품목·금액(원/USD)·주기·분류·결제일 |
| 02 영수증 | '앞으로 1년' / '지금까지(누적)' 전환, 마트·편의점·카페·다방 테마, ✂ 해지 시뮬레이션, 일시정지·삭제 시 '해지 완료' 도장. 품목 클릭 시 수정 |
| 공유 | 공유하기(휴대폰 공유 시트로 영수증 이미지 전송), 이미지 저장(PNG), 링크 복사, 결산 카드(9:16), 인쇄·PDF |
| 03 결제 일정표 | 탁상 달력 형태의 월별 결제일, 해당 월 결제 합계, 30일 이내 D-day 목록 |
| 04 계산대 서랍 | 환율, 환산 기준가(예시값, 직접 수정), JSON 백업·복원, 앱 설치 안내 |

- 결제일 기준 반복 계산. 31일 결제는 짧은 달에 말일로 처리함
- 결제일 미입력 구독은 주기별 기본 횟수(주 52 / 월 12 / 연 1)로 계산함. 누적 모드에서는 제외함
- 영수증 화면과 저장 이미지는 같은 줄 데이터(`src/receiptRows.ts`)로 그림
- 공유 링크는 목록을 URL 해시(`#s=...`)에 담음. 해시는 서버로 전송되지 않음. 받은 사람 브라우저에는 저장하지 않음
- 서버 없음. 데이터는 브라우저 `localStorage`에만 저장됨
- PWA: `manifest.webmanifest`, `sw.js`(프로덕션 빌드에서만 등록)
- 라이트/다크 모드, 모바일 대응, `prefers-reduced-motion` 대응

## 링크 미리보기(OG)

`index.html`의 `__SITE_URL__`을 빌드 시 절대 주소로 치환함 (`vite.config.ts`).

- Vercel: 시스템 환경변수 `VERCEL_PROJECT_PRODUCTION_URL` 자동 사용. 프로젝트 설정 → Environment Variables의 *Enable access to System Environment Variables*가 켜져 있어야 함
- 직접 지정: `SITE_URL=https://example.com npm run build`

아이콘·OG 이미지 재생성 (Windows, Edge 필요):

```bash
powershell -ExecutionPolicy Bypass -File scripts/build-brand.ps1
```

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
