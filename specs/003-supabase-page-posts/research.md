# Research: Supabase 페이지 게시글 저장

**Feature**: 003-supabase-page-posts | **Date**: 2026-07-16

Phase 0에서 스펙의 미해결 항목과 기술 선택을 정리한다. 각 항목은 결정(Decision)/근거(Rationale)/대안(Alternatives)으로 기록한다.

## R1. 보안 강제 지점 — RLS (서버 런타임 없음)

- **Decision**: 게시글 접근 제어는 Postgres RLS 정책으로 강제한다. `page` 테이블에 `authenticated` 롤 대상 SELECT/INSERT/UPDATE/DELETE own 정책 4개를 추가한다(모두 `auth.uid() = user_id`). 정책 패턴은 기존 `profile` 테이블 정책을 그대로 미러링한다.
- **Rationale**: 앱이 `output: "export"` 정적 SPA라 신뢰할 수 있는 서버 코드가 없다. 클라이언트 필터링만으로는 다른 사용자의 글을 URL 직접 접근 등으로 우회 조회/삭제할 수 있다(FR-010 위반). RLS는 DB에서 강제되어 우회 불가. `profile`이 이미 동일 패턴을 사용해 정합성이 높다.
- **DB 변경 성격**: RLS 정책 추가는 **컬럼 스키마 변경이 아니다**(테이블 구조 고정 제약 FR-009 준수). `page` 테이블은 이미 `rls_enabled=true`이나 정책이 0개라 현재 기본 거부 상태 → 정책 없이는 기능 자체가 동작하지 않는다.
- **Alternatives**: (a) 클라이언트에서 `user_id`로 필터만 — 보안 우회 가능, 기각. (b) Edge Function/서버 프록시 — 정적 호스팅 원칙과 단순성(YAGNI)에 위배, 기각.

## R2. 게시글 식별자 매핑 (bigint ↔ string)

- **Decision**: 클라이언트 `Post.id`는 계속 `string`으로 두고, 테이블 `id bigint`를 `String(row.id)`로 매핑한다. 라우팅(`/posts/[id]`)과 `find`/`key`는 문자열 그대로 사용. 쿼리 시에는 문자열 id를 그대로 `.eq("id", id)`에 전달한다(Supabase가 bigint로 캐스팅).
- **Rationale**: 기존 URL 라우팅·`useParams<{id:string}>`·`posts.find(p=>p.id===id)` 로직을 그대로 유지해 변경을 국소화. `Post.id: string` 타입도 유지.
- **Alternatives**: `Post.id`를 `number`로 변경 — 라우팅/비교 코드 전반 수정 필요, 이득 없음, 기각.

## R3. 생성 시각 매핑 (timestamptz ↔ epoch ms)

- **Decision**: 테이블 `created_at`(ISO 문자열)을 `new Date(row.created_at).getTime()`로 변환해 `Post.createdAt: number`(epoch ms)에 담는다. 표시는 기존 `formatDate(ts)` 그대로 사용.
- **Rationale**: `formatDate`, 상세 메타 등 기존 표시 로직이 epoch ms를 전제. 변환 함수는 순수 함수라 단위 테스트가 쉽다.
- **Alternatives**: `createdAt`를 문자열로 바꾸고 표시 로직 수정 — 불필요한 파급, 기각.

## R4. INSERT 시 user_id 설정

- **Decision**: 게시글 생성 시 `insert({ title, content: "", user_id: user.id })`로 **명시적으로** 현재 로그인 사용자 id를 넣는다. `user`는 `useAuth().user`에서 얻는다.
- **Rationale**: `page.user_id`의 DB 기본값이 `gen_random_uuid()`라, 명시하지 않으면 소유자 미상의 고아 행이 생긴다. INSERT RLS의 `WITH CHECK (auth.uid() = user_id)`가 타인 id 위조를 차단한다.
- **Alternatives**: DB 트리거로 `user_id = auth.uid()` 자동 설정 — 테이블/DB 오브젝트 추가로 단순성 위배, 클라이언트 명시가 더 명확, 기각.

## R5. store API 비동기화 및 호출부 수정

- **Decision**: `createPost(title)`를 `Promise<Post | null>`로 비동기화한다. 호출부는 `await` 후 반환된 post로 라우팅한다.
  - `app/(app)/page.tsx`의 `createPage`: `const post = await app.createPost(title); if (post) router.push(...)`.
  - `components/AppShell.tsx`의 `newPage`: 동일하게 `await`.
- **Rationale**: 서버 왕복이 필요하고, 생성된 행의 실제 `id`(bigint)로 라우팅해야 한다. 낙관적 임시 id는 실제 id와 달라 상세 진입이 깨진다.
- **Alternatives**: 낙관적 생성 후 백그라운드 동기화 — 임시 id ↔ 실제 id 재조정 복잡, 소규모 앱에 과함, 기각.

## R6. 로딩·세션 연동 (loaded 게이트, 로그인/로그아웃 반응)

- **Decision**: `store`는 `useAuth()`의 `session`을 구독한다.
  - 세션이 생기면(로그인/초기 확인 완료) `select ... order by created_at desc`로 내 글을 불러오고 `loaded=true`.
  - 로그아웃(session=null) 시 `posts=[]`, `loaded` 재설정.
  - `AppShell`의 기존 게이트 `if (!auth.ready || !auth.session || !app.loaded) return null` 유지 → 인증·로딩 전 깜빡임 방지, 비로그인은 `/login`으로 리다이렉트(FR-005 충족, 기존 동작).
- **Rationale**: 기존 게이트/`app.loaded` 계약을 재사용해 로딩·빈·오류 상태 UX를 최소 변경으로 흡수.
- **Alternatives**: 컴포넌트별 개별 fetch — 중복·경합, 기존 store 계약과 불일치, 기각.

## R7. 편집 자동저장 디바운스 (US4)

- **Decision**: `updatePost(id, patch)`는 로컬 상태를 즉시 낙관적으로 갱신(입력 반응성 유지)하고, 서버 UPDATE는 **id별 600ms 디바운스**로 반영한다. 언마운트/라우팅 이탈 시 대기 중 저장을 flush한다.
- **Rationale**: 현재 UI는 키 입력마다 `updatePost` 호출("자동 저장됨"). 매 키 입력마다 네트워크 UPDATE는 과도. 디바운스로 쓰기 횟수를 억제하되 사용자 체감 저장은 유지. UPDATE RLS가 소유자만 허용.
- **Alternatives**: (a) blur/이탈 시에만 저장 — 중간 유실 위험. (b) 키마다 저장 — 과도한 요청. 600ms 디바운스가 절충. 값은 구현 중 조정 가능.

## R8. 삭제·생성 실패 및 오류 UX

- **Decision**: 각 데이터 접근은 `{ data, error }`를 확인한다. 실패 시 사용자에게 알리고(간단히 `window.alert` 또는 상단 인라인 메시지) 로컬 상태를 서버 진실과 어긋나지 않게 유지(낙관적 갱신을 롤백하거나 재조회). 세션 만료(예: 401/RLS 거부)면 인증 필요 안내.
- **Rationale**: 스펙 Edge Case(네트워크 오류/세션 만료) 충족. 정적 SPA라 토스트 인프라가 없으므로 MVP는 최소 알림으로 시작.
- **Alternatives**: 무시하고 낙관적 표시만 — 데이터 정합성 깨짐, 스펙 위반, 기각.

## R9. 목록 정렬 및 데모/시드 제거

- **Decision**: 목록은 `created_at desc`(최신 우선). 기존 `seed()` 및 최초 방문 샘플 데이터는 제거한다. 신규 사용자는 빈 목록 + 기존 빈 상태 UI("첫 글을 만들어 보세요")로 시작.
- **Rationale**: 기존 UI가 최신 우선(prepend)이었고 빈 상태 컴포넌트가 이미 존재. 서버·사용자별 저장에서는 공용 시드가 무의미(Assumptions).
- **Alternatives**: 시드 유지 — 사용자별 저장 원칙과 충돌, 기각.

## R10. 즐겨찾기 제거 범위 (Clarify 결정)

- **Decision**: 즐겨찾기 기능·UI를 완전히 제거한다. 제거 대상:
  - 코드: `Post.favorite`, `toggleFavorite`(store), 목록 `.fav-btn`, 상세 `.detail-fav-btn`, `SidebarItem`의 `favorite` prop/별.
  - 스타일: `globals.css`의 `.fav-btn`/`.detail-fav-btn`/`.sidebar-item__star` 규칙, `--status-favorite` 토큰(`--gold-500`가 즐겨찾기 전용이면 함께 정리).
  - 문서: `DESIGN.md`의 즐겨찾기 컴포넌트(§2.7.2/§2.7.3)·토큰·플로우(§5.3)·Post 타입 표기 갱신.
- **Rationale**: `page` 테이블에 컬럼 없음 + 테이블 변경 금지 + 단순성(YAGNI). "새로고침하면 사라지는" 어정쩡한 상태 방지. 코드와 `DESIGN.md`를 함께 갱신(Principle III).
- **Alternatives**: 클라이언트 한정 유지/컬럼 추가 — Clarify에서 기각됨.

## R11. 프로필 오버라이드(nickname/avatar)는 현행 유지

- **Decision**: `store`의 `nickname`/`avatar`(localStorage 오버라이드)와 `saveNickname`/`setAvatar`는 그대로 둔다. 본 기능은 posts 계층만 Supabase로 전환.
- **Rationale**: 범위 최소화(YAGNI). 프로필은 별도 기능(004/프로필) 소관(Out of Scope).
- **Alternatives**: 프로필도 함께 이전 — 범위 초과, 기각.

## R12. 테스트 전략 (TDD)

- **Decision**:
  - 순수 함수를 `lib/posts.ts`로 추출해 우선 테스트: `rowToPost(row)`(id/createdAt 매핑), `sortPosts`(created_at desc), `newInsertPayload(title, userId)`.
  - 데이터 접근 함수(load/create/update/delete)는 `getSupabase()`를 목킹해 테스트. 목은 실제 `{ data, error }` 구조와 행 형태(`{ id, created_at, title, content, user_id }`)를 완전히 반영.
  - RED(실패 목격)→GREEN(최소 구현)→리팩터. `npm test` 그린·무경고 확인 후 완료.
- **Rationale**: 기존 `lib/profile.ts`(순수 `mergeProfile`) + `__tests__/profile.test.ts` 패턴과 일치. Constitution I·II 준수. 비동기 Server Component 목킹 이슈 회피(모두 클라이언트/순수 함수).
- **Alternatives**: 실 Supabase 통합 테스트 — 외부 의존·불안정, 유닛 레벨엔 과함(별도 수동 quickstart로 커버), 기각.
