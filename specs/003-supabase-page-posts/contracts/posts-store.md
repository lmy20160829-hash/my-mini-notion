# Contract: 게시글 데이터 접근 & store 인터페이스

**Feature**: 003-supabase-page-posts | **Date**: 2026-07-16

정적 SPA에서 화면이 의존하는 계약. 화면 컴포넌트는 `useApp()`(store)만 사용하고, store 내부가 `lib/posts.ts`를 통해 Supabase와 통신한다. 보안은 RLS가 강제하므로 아래 함수는 "현재 로그인 사용자" 문맥에서만 유효하다.

## A. store 계약 (`useApp()` — 화면이 사용)

| 멤버 | 시그니처 | 동작 | 관련 요구 |
|---|---|---|---|
| `posts` | `Post[]` | 내 게시글, 최신 우선. `favorite` 없음 | FR-004 |
| `loaded` | `boolean` | 현재 세션의 게시글 로드 완료 여부(게이트) | R6 |
| `createPost` | `(title: string) => Promise<Post \| null>` | 로그인 사용자로 INSERT 후 반환 행 매핑, 목록 prepend. 실패 시 `null` | FR-002, FR-003 |
| `updatePost` | `(id: string, patch: {title?; content?}) => void` | 로컬 즉시 반영 + 600ms 디바운스 UPDATE | FR-007 |
| `deletePost` | `(id: string) => void` | 로컬 즉시 제거 + DELETE. 실패 시 재조회로 복구 | FR-006 |
| `saveNickname` / `setAvatar` | (현행 유지) | 프로필 오버라이드(localStorage) | 범위 외 |

- **제거**: `toggleFavorite`, `login`/`logout`(인증은 `useAuth()`가 담당), `displayName`/`email`(프로필 소관).

### 호출부 변경(비동기화)
- `app/(app)/page.tsx > createPage`: `const post = await app.createPost(title); if (post) router.push(\`/posts/${post.id}\`)`
- `components/AppShell.tsx > newPage`: 동일하게 `await` 후 라우팅.

## B. 데이터 접근 계약 (`lib/posts.ts` — store 내부가 사용)

모든 함수는 브라우저 Supabase 클라이언트(`getSupabase()`)를 사용하고 `{ data, error }`를 확인한다.

| 함수 | 시그니처 | Supabase 연산 | 반환/오류 |
|---|---|---|---|
| `fetchMyPosts` | `() => Promise<Post[]>` | `from("page").select("*").order("created_at",{ascending:false})` | 행→`Post[]`. RLS로 내 글만. error→throw/빈 배열+오류 표면화 |
| `insertPost` | `(title, userId) => Promise<Post>` | `insert(newInsertPayload(title,userId)).select().single()` | 생성 행→`Post` |
| `updatePostFields` | `(id, patch) => Promise<void>` | `update(patch).eq("id", id)` | error 확인 |
| `deletePostById` | `(id) => Promise<void>` | `delete().eq("id", id)` | error 확인 |

- 순수 헬퍼(테스트 우선): `rowToPost`, `sortPosts`, `newInsertPayload` (data-model §2).

## C. 접근 제어 계약 (RLS — 서버 강제)

[`rls-policies.sql`](./rls-policies.sql)의 4개 정책이 아래를 보장한다. 클라이언트 필터와 **이중**으로 작동한다.

| 시나리오 | 기대 결과 |
|---|---|
| 비로그인 사용자가 조회/작성/삭제 | 모든 행 접근 불가(`authenticated` 아님) → 목록 비고 UI는 `/login` 유도 |
| 사용자 A가 B의 글 id로 SELECT | 0행 반환(상세 미표시) |
| 사용자 A가 B의 글 id로 UPDATE/DELETE | 0행 영향(거부, B의 글 유지) |
| 사용자가 `user_id`를 타인으로 위조 INSERT | `with check` 위반으로 거부 |

## D. 오류 처리 계약

| 상황 | 처리 |
|---|---|
| 네트워크/서버 오류 | 사용자 알림(간단 알림/인라인) + 로컬 상태를 서버 진실과 재정합(재조회 또는 롤백) |
| 세션 만료 | 인증 필요 안내; 작성/삭제 거부 |
| 삭제 실패 | 낙관적 제거 롤백(재조회) |

## E. 계약 검증(테스트) 매핑

| 계약 | 테스트(먼저 실패시킬 것) |
|---|---|
| `rowToPost`/`sortPosts`/`newInsertPayload` | 순수 유닛 테스트(경계값·정렬·trim) |
| `fetchMyPosts`/`insertPost`/`updatePostFields`/`deletePostById` | 목킹된 Supabase 클라이언트로 호출 인자·매핑·오류 경로 검증 |
| store 비동기 계약 | `createPost` await 반환, 실패 시 `null`; `deletePost` 낙관/복구 |
| RLS 정책 | quickstart의 수동 다중 사용자 시나리오(§ quickstart) |
