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

---

## 셀프 코드 리뷰 미수정 항목 (2026-07-20)

wt1~wt4 머지 통합본을 세 각도(머지 정합성 / 런타임·보안 / 문서·테스트)로 리뷰한 결과 중,
이번에 고치지 않고 남긴 것들. 고친 것은 A1(자기소개 저장 실패 표면화), A3(로그아웃 시
프로필 오버라이드 정리), A4(error_description 이중 디코딩), 죽은 CSS 제거, DESIGN.md
사실 오류 정정, CI PR 트리거다.

### A2. RLS 거부된 UPDATE/DELETE가 에러가 아니라 0행 — 롤백 경로가 죽은 코드 (높음)

`lib/posts.ts` `deletePostById`/`updatePostFields`, `lib/store.tsx` `deletePost`/`flush`.

Postgres의 RLS `USING` 절은 **행 필터**다. 조건에 맞지 않으면 에러가 아니라 0행이 되고,
PostgREST는 204/`error: null`로 응답한다. `pg_policies` 실측으로 확인했다 —
`page_delete_own`은 `qual`만 있고 `with_check`가 없다. INSERT만 `with_check`라 42501을 낸다.

결과: 남의 글을 지우거나 세션이 끊긴 상태에서 지우면 화면에서는 사라지는데 DB에는 남고,
낙관적 롤백(`.catch(refetch)`)은 **영원히 실행되지 않는다**. 디바운스 편집도 마찬가지로
"자동 저장됨"을 표시한 채 서버에는 안 쓰인다.

수정 방향: `.select("id")`를 붙여 영향받은 행을 돌려받고 0행이면 실패로 처리한다
(A1에서 `saveIntroduction`에 적용한 방식과 동일). `lib/posts.ts`의 반환 계약이 바뀌므로
`store.tsx`의 호출부와 `__tests__/store.test.tsx`의 목도 함께 손봐야 해서 범위가 있다.

### A5. 로그아웃·계정 전환 시 대기 중인 디바운스 타이머가 취소되지 않음 (중간)

`lib/store.tsx` 세션 effect. `pending` Map은 `flush()`와 언마운트 정리로만 비워진다.
글을 타이핑하다 600ms 안에 로그아웃하면 타이머가 익명 클라이언트로 발사돼 0행으로 끝난다
(A2 때문에 조용히). 빠른 계정 전환 시에는 B의 토큰으로 A의 행 id에 PATCH가 나간다 —
RLS가 막으므로 유출은 없지만 역시 무성음이다. `deletePost`는 자기 id의 타이머를 취소하는데
(`store.tsx`), 세션 해제 경로에는 같은 처리가 없다.

### A6. `updatePost` 실패 시 롤백 없음 (중간)

`flush`가 await 전에 pending 항목을 지우고, 실패는 `window.alert`만 띄운다. 로컬 상태는
거부된 값을 그대로 들고 있고 재시도도 없어 새로고침하면 사라진다. `deletePost`는 최소한
refetch로 서버 진실에 맞추려 한다.

### A7. 탭 닫기·하드 이동 시 편집 유실 (중간)

`lib/store.tsx`의 언마운트 flush 주석은 "이탈 시 유실 방지"를 주장하지만, `AppProvider`는
루트 레이아웃에 있어 SPA 이동으로 언마운트되지 않고, React는 탭 닫기에 정리를 돌리지 않는다.
`beforeunload`/`pagehide`/`visibilitychange` 핸들러가 없다(grep 확인). 마지막 타건 후
600ms 안에 탭을 닫으면 그 편집은 사라진다. 주석이 사실과 다른 것도 함께 고칠 것.

### A8. 로딩 표시 없음 (낮음)

`components/AppShell.tsx`가 `!app.loaded`일 때 `null`을 반환한다. Supabase 응답이 느리거나
멈추면 완전한 백지에 스피너도 타임아웃도 없다. 로그아웃 직후에도 `loaded`가 false로 돌아가
리다이렉트가 완료될 때까지 백지다.

### ~~A9. 아바타 업로드 크기 제한 없음 (낮음)~~ — 해소됨 (2026-07-20)

원래 문제: `app/(app)/mypage/page.tsx`가 어떤 파일이든 data URL로 읽어 localStorage에
저장했다. 3MB 사진이면 base64로 ~4MB라 5MB 쿼터를 넘고, `store.tsx`의 빈 `catch {}`가
`QuotaExceededError`를 삼켜 별명·사이드바 상태까지 조용히 저장되지 않았다.

프로필 이미지 Supabase 연동으로 근본 원인이 사라졌다 — 사진은 이제 localStorage가 아니라
Storage `profile-image` 버킷에 올라가고 경로만 `profile.image_path`에 저장된다.
`validateImageFile`이 픽 시점에 형식·용량(1byte~5MB)을 검사하고 실패는 알림으로 표면화한다.
localStorage 스키마에서 `avatar` 필드 자체가 제거됐다(§5.5). 관련: `lib/profile-image.ts`,
`__tests__/profile-image.test.ts`, `__tests__/MyPage.profileImage.test.tsx`.

### T1. `AppShell.sidebarCollapse.test.tsx` "펼친 상태로 재마운트" 테스트가 재마운트하지 않음

한 번 렌더하고 접히지 않았음만 단언한다. `beforeEach`가 `sidebarCollapsed` 없이 시드하므로
사실상 기본값 재확인이고, **펼침 상태의 영속화가 완전히 깨져도 통과한다**. 형제 테스트인
US3-2는 `cleanup()` + 재렌더를 제대로 한다. 같은 방식으로 고칠 것.

### T2. 같은 파일의 레일 툴팁 테스트가 레일 특정적이지 않음

`SidebarItem`이 `title`을 항상 설정하므로 펼침 상태에서도 동일하게 통과한다. FR-009(레일에서
이름 확인)를 검증하지 못한다. 이웃 테스트처럼 레일에 남는 항목의 정확한 목록을 단언할 것.

### T3. 삭제-디바운스 취소 상호작용 미테스트

`lib/store.tsx`가 삭제 시 해당 id의 대기 타이머를 취소하는 동작은 DESIGN.md §5.2가 보장한다고
명시하는데 테스트가 없다. 디바운스와 언마운트 flush는 각각 테스트되지만 조합은 비어 있다.

### T4. 게시글 소유자 격리는 실행 가능한 테스트가 없음 (구조적 한계)

`lib/posts.ts`는 의도적으로 클라이언트 필터를 걸지 않고 RLS에 위임한다. 따라서 RLS 정책이
퇴행해도 jsdom 단위 테스트로는 잡히지 않는다. 실제 두 계정으로 하는 수동 시나리오
(`specs/003-supabase-page-posts/quickstart.md` S1–S5)가 유일한 검증 수단이다.
