# 구독 계산기

매달 나가는 구독료를 등록하고 월·연·하루 기준 지출과 카테고리별 비중을 보여주는 웹앱.

- 서버 없음. 모든 데이터는 브라우저 `localStorage`에만 저장됨
- 주간·월간·연간 결제 주기와 USD 구독(환율 직접 입력) 지원
- JSON 백업 내보내기/불러오기 지원 (불러올 때 항목 검증 후 반영)

## 기술 스택

| 항목 | 버전 |
| --- | --- |
| Vite | 8.3.x |
| React | 19.x |
| TypeScript | 6.0.x |
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
3. Framework Preset이 `Vite`로 자동 감지됨 (Build: `npm run build`, Output: `dist`)
4. Deploy

또는 CLI 사용:

```bash
npx vercel
```

`vercel.json`에 보안 헤더(CSP, nosniff 등) 설정함. 외부 리소스를 추가하면 CSP 수정 필요함.

Hobby 플랜은 개인·비상업 용도로 한정됨. 최신 한도는 https://vercel.com/pricing 확인.
