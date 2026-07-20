# 백로그

나중에 다룰 후보. 지금 당장 막고 있는 건 아니지만 근거와 맥락을 남겨 둔다.

---

## 정적 배포에서 SPA 라우팅 제대로 하기 — 글 상세의 동적 세그먼트 제거

**상태:** 후보 (2026-07-20 기록)

**배경**

`output: "export"`는 동적 라우트로 들어오는 모든 param이 `generateStaticParams()`에
열거돼 있을 것을 요구한다. 이 앱의 글 ID는 런타임 데이터(Supabase `page` 행)라 빌드
시점에 알 수 없어서 `app/(app)/posts/[id]/page.tsx`가 `placeholder` 하나만 열거한다.

그 결과 `/posts/1/` 직접 접속이 `next dev`에서 500으로 거부됐다. 지금은 **A안**으로
막아 뒀다 — `next.config.ts`에서 export를 프로덕션 빌드에서만 켠다(`__tests__/nextConfig.staticExport.test.ts`).

**A안이 남긴 것**

- dev: 딥링크·새로고침 정상(200).
- 정적 배포: `/posts/1/`에 해당하는 파일이 없어 여전히 `404.html` 폴백으로 렌더된다
  (`.github/workflows/deploy.yml`의 `cp out/index.html out/404.html`).
  화면은 정상이지만 **HTTP 상태가 404**다 — SEO·모니터링 관점에서는 부정확하다.
- dev가 export 제약을 검증하지 않는다. export 비호환 코드는 CI의 `next build`가 잡는다.

**B안 (이 백로그 항목)**

동적 세그먼트를 없앤다. `/posts/[id]` → 쿼리 파라미터(`/posts?id=1`) 또는 그에 준하는
클라이언트 전용 라우팅.

- 얻는 것: `generateStaticParams` 자체가 불필요. dev와 정적 배포가 **완전히 동일하게**
  동작하고, 딥링크가 진짜 200을 받는다. `404.html` 폴백 트릭도 이 라우트에는 불필요해진다.
- 비용: `useParams()` → `useSearchParams()`(App Router에서는 Suspense 경계 필요),
  `router.push("/posts/" + id)` 호출부 전부 수정, 관련 테스트 수정. URL 모양이 덜 예쁘다.

**언제 하나**

정적 호스팅에서의 SPA 라우팅을 주제로 다룰 때. 교재로서는 "왜 정적 export에서 동적
라우트가 곤란한가"를 보여주기 좋은 소재다.

**관련 파일**

- `next.config.ts` (A안 적용 지점)
- `app/(app)/posts/[id]/page.tsx` (`generateStaticParams`)
- `app/(app)/posts/[id]/PostDetailClient.tsx` (`useParams`)
- `.github/workflows/deploy.yml` (404.html 폴백)
- `__tests__/nextConfig.staticExport.test.ts` (A안 회귀 방지)
