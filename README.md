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
| Vitest | 5.0.x |
| Node.js | 22.12+ (Vite 8·Vitest 5 요구사항) |

## 실행

```bash
npm install
npm run dev
```

## 검증

```bash
npm run check
```

lint → 테스트 → 빌드 → `npm audit --audit-level=high` 순서로 실행함. GitHub Actions(`.github/workflows/ci.yml`)도 같은 단계 실행함.

`npm run preview`는 `vercel.json`의 보안 헤더를 그대로 적용하므로 CSP 위반을 배포 전에 확인할 수 있음.

## 보안

서버·DB·로그인이 없는 정적 사이트. 사용자 데이터는 브라우저 `localStorage`와 공유 링크 해시(`#s=`)에만 존재함.

| 항목 | 적용 내용 |
| --- | --- |
| CSP | 스크립트·스타일·폰트·이미지 모두 자기 출처만 허용. 인라인 스크립트·`eval` 불가. 인라인 style 속성만 허용(테마 색 변수용) |
| 클릭재킹 | `frame-ancestors 'none'`, `X-Frame-Options: DENY` |
| 기타 헤더 | `nosniff`, `Referrer-Policy: no-referrer`, `COOP: same-origin`, 불필요 브라우저 기능 `Permissions-Policy`로 차단 |
| HTTPS | Vercel이 HTTP→HTTPS 308 리다이렉트, 커스텀 도메인 HSTS(`max-age=63072000`) 기본 적용 |
| 외부 입력 검증 | 공유 링크·백업 파일·저장소 값은 `parseData`로 형식·범위 검증. 이름 50자, 항목 200개, 해시 16,000자, 파일 1MB 상한. 프로토타입 키(`toString` 등) 차단 |
| XSS | 사용자 문자열은 React 텍스트로만 출력(`dangerouslySetInnerHTML` 미사용) |
| 장애 복구 | 렌더링 오류 시 `ErrorBoundary`가 백업·초기화 화면 표시 |
| 의존성 | `npm audit` CI 검사, Dependabot 주간 업데이트 |

잔여 위험

- 공유 링크에는 구독 이름·금액·결제일이 그대로 담김(암호화 아님). 링크를 받은 사람은 내용 확인 가능함
- `localStorage`는 같은 기기·브라우저 사용자가 열람 가능함
- 서비스 워커는 로컬 미리보기 창에서 등록 검증 불가. 배포 후 DevTools → Application에서 확인 필요함
- 서비스 워커 문제 발생 시: `public/sw.js`를 등록 해제 코드로 교체 후 재배포

재검토 시점: 외부 스크립트·API·분석 도구 추가 시, 또는 의존성 major 업데이트 시

## Vercel 배포 (Hobby 플랜, 서브도메인)

1. GitHub 저장소에 push
2. Vercel 대시보드 → Add New → Project → 저장소 Import
3. Framework Preset `Vite` 자동 감지 (Build: `npm run build`, Output: `dist`)
4. Deploy 후 `*.vercel.app` 주소에서 동작 확인
5. Settings → Domains → Add Domain → 서브도메인 입력 (예: `receipt.example.com`)
6. 도메인 DNS 관리처에 **CNAME** 레코드 추가. 값은 대시보드에 표시된 프로젝트 고유 값 사용 (예: `xxxx.vercel-dns-017.com`)
7. 대시보드에서 Valid Configuration·인증서 발급 확인 (자동)
8. Settings → Environment Variables에 `SITE_URL=https://receipt.example.com` 추가 후 재배포 (OG 이미지·canonical 절대 주소용)

배포 후 확인

- 보안 헤더: 브라우저 DevTools → Network → 문서 응답 헤더
- 링크 미리보기: 카카오톡 대화창에 주소 붙여넣기 (캐시 갱신은 카카오 개발자 사이트의 공유 디버거 사용)
- 서비스 워커: DevTools → Application → Service workers

Hobby 플랜은 개인·비상업 용도로 한정됨. 최신 한도는 https://vercel.com/pricing 확인.
