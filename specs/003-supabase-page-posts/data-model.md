# Data Model: Supabase 페이지 게시글 저장

**Feature**: 003-supabase-page-posts | **Date**: 2026-07-16

## 1. 저장소 테이블 `public.page` (기존 — 구조 변경 금지)

| 컬럼 | 타입 | 제약/기본값 | 용도 |
|---|---|---|---|
| `id` | `bigint` | identity(BY DEFAULT), PK | 게시글 식별자 |
| `created_at` | `timestamptz` | default `now()` | 생성 시각 |
| `title` | `text` | nullable | 제목 |
| `content` | `text` | nullable | 본문 |
| `user_id` | `uuid` | FK → `auth.users.id`, default `gen_random_uuid()` | 소유자 |

- RLS: `rls_enabled = true`. **현재 정책 0개(기본 거부)** → 본 기능에서 정책 추가 필요(§3).
- **불변**: 컬럼 추가/변경/삭제 금지(FR-009). 특히 `favorite` 컬럼은 추가하지 않는다.
- 주의: `user_id` 기본값이 `gen_random_uuid()`이므로 INSERT 시 반드시 `auth.uid()`를 명시(§R4).

## 2. 클라이언트 엔티티 `Post` (변경)

```ts
// lib/store.tsx — favorite 제거
export type Post = {
  id: string;        // String(page.id)
  title: string;     // page.title ?? ""
  content: string;   // page.content ?? ""
  createdAt: number; // new Date(page.created_at).getTime()
};
```

- 기존 대비 변경: **`favorite: boolean` 필드 제거**(R10).
- `id`는 문자열 유지(R2), `createdAt`은 epoch ms 유지(R3).

### 행 ↔ 엔티티 매핑 (순수 함수, `lib/posts.ts`)

| 함수 | 시그니처 | 규칙 |
|---|---|---|
| `rowToPost` | `(row) => Post` | `id: String(row.id)`, `title: row.title ?? ""`, `content: row.content ?? ""`, `createdAt: Date.parse(row.created_at)` |
| `sortPosts` | `(Post[]) => Post[]` | `createdAt` 내림차순(최신 우선) |
| `newInsertPayload` | `(title, userId) => {title, content, user_id}` | `title: (title ?? "").trim()`, `content: ""`, `user_id: userId` |

## 3. RLS 정책 (신규 — 접근 제어 추가, 구조 변경 아님)

`profile` 테이블의 기존 정책을 미러링. 대상 롤 `authenticated`.

| 정책명 | 명령 | USING | WITH CHECK | 매핑 요구사항 |
|---|---|---|---|---|
| `page_select_own` | SELECT | `auth.uid() = user_id` | — | FR-004 자신의 글만 조회 |
| `page_insert_own` | INSERT | — | `auth.uid() = user_id` | FR-002/FR-003 로그인 사용자만 작성·소유자 기록 |
| `page_update_own` | UPDATE | `auth.uid() = user_id` | `auth.uid() = user_id` | FR-007 자신의 글만 수정 |
| `page_delete_own` | DELETE | `auth.uid() = user_id` | — | FR-006 자신의 글만 삭제 |

- 익명(비로그인) 사용자는 `authenticated` 롤이 아니므로 어떤 행도 접근 불가 → FR-005 충족.
- DDL 계약은 [`contracts/rls-policies.sql`](./contracts/rls-policies.sql) 참조.

## 4. 상태 전이 (게시글 라이프사이클)

```
[없음] --createPost(로그인)--> [저장됨(내 소유)]
[저장됨] --updatePost(제목/내용, 디바운스)--> [저장됨(갱신)]
[저장됨] --deletePost--> [삭제됨(영구)]
```

- 생성: 로그인 필요(비로그인 시 UI 진입 차단 + RLS 거부).
- 조회: 소유자 본인만(RLS SELECT).
- 수정/삭제: 소유자 본인만(RLS UPDATE/DELETE). 타인 글 대상 시도는 거부되어 무변화.

## 5. store 상태 (변경)

```ts
type AppState = {
  loaded: boolean;          // 현재 세션의 게시글 로드 완료 여부(게이트)
  posts: Post[];            // 내 게시글(최신 우선)
  nickname: string | null;  // (유지) 프로필 오버라이드 — localStorage
  avatar: string | null;    // (유지) 프로필 오버라이드 — localStorage
};
```

- `loaded`: 세션 확정 후 서버 조회 완료 시 true. 로그아웃 시 재설정.
- `posts`: Supabase에서 로드. `toggleFavorite` 제거.
- `nickname`/`avatar`: 현행 유지(R11).

## 6. 검증 규칙

- 제목/내용 빈 값 허용(기존 동작, Assumptions). 저장 시 제목은 trim.
- 삭제는 되돌릴 수 없음(상세 화면 confirm 유지).
- 소유권 위반 작업은 클라이언트 필터 + RLS 이중으로 차단(단일 실패점 없음).
