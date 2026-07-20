---
description: "Task list for 003-supabase-page-posts"
---

# Tasks: Supabase 페이지 게시글 저장

**Input**: Design documents from `specs/003-supabase-page-posts/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: 이 프로젝트 헌법(Principle I, NON-NEGOTIABLE)이 TDD를 의무화하므로 **모든 구현 작업 앞에 실패 테스트가 온다**. 각 테스트는 구현 전 RED(실패)를 직접 목격한 뒤 GREEN으로 전환한다.

**Organization**: 작업은 사용자 스토리(US1~US4)별로 그룹화되어 독립적으로 구현·테스트 가능하다.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 병렬 가능(서로 다른 파일, 미완 의존 없음)
- **[Story]**: US1~US4 매핑(Setup/Foundational/Polish는 라벨 없음)
- 모든 작업에 정확한 파일 경로 포함

## Path Conventions

단일 웹 프런트엔드(Next.js App Router). 소스는 리포지토리 루트의 `lib/`, `app/`, `components/`. 테스트는 `__tests__/`(기존 관례, 예: `__tests__/profile.test.ts`) 또는 소스 옆 콜로케이션.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 인증 기반 확보 및 환경 준비 (구현 전 필수 선행)

- [ ] T001 `004-supabase-google-login`을 이 브랜치(`003-supabase-page-posts`, worktree `wt1`)로 병합/리베이스하여 인증 기반을 확보한다. 확인: `lib/supabase.ts`, `lib/auth.tsx`, `lib/profile.ts`, `app/layout.tsx`(AuthProvider/AppProvider 래핑), 004 버전 `app/(app)/page.tsx`·`PostDetailClient.tsx`·`components/AppShell.tsx`·`components/ui/SidebarItem.tsx` 존재.
- [ ] T002 `npm install` 실행 후 `node_modules/next/dist/docs/`의 정적 export 관련 가이드를 확인한다(Principle IV — 코드 작성 전 프레임워크 문서 우선).
- [ ] T003 `.env.local`에 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`를 설정한다(004 `.env.example` 기준).
- [ ] T004 베이스라인 확인: `npm test`가 병합 직후 그린인지 실행해 확인한다(기존 테스트 무결).

**Checkpoint**: 인증 기반 + 의존성 + 환경변수 준비 완료.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 모든 스토리가 공유하는 데이터 매핑 계층, 게시글 타입/즐겨찾기 제거(빌드 게이트), RLS 보안 정책. 이 단계 없이는 어떤 스토리도 시작할 수 없다.

**⚠️ CRITICAL**: 이 단계 완료 전에는 US 작업을 시작하지 않는다.

- [ ] T005 [P] `__tests__/posts.test.ts`에 순수 헬퍼 실패 테스트 작성 — `rowToPost`(id→String, created_at→epoch ms, null→""), `sortPosts`(created_at 내림차순), `newInsertPayload`(title trim, content "", user_id). RED 확인.
- [ ] T006 `lib/posts.ts` 생성 후 순수 헬퍼(`rowToPost`, `sortPosts`, `newInsertPayload`) 구현으로 T005를 GREEN 전환(최소 구현).
- [ ] T007 `lib/store.tsx`에서 즐겨찾기 제거: `Post` 타입의 `favorite` 필드 삭제, `toggleFavorite` 제거, `seed()`의 favorite 값 제거(또는 seed 자체는 T015에서 정리). 타입 변경으로 인한 컴파일 파급은 T008에서 해소.
- [ ] T008 [P] 즐겨찾기 UI 제거 — `app/(app)/page.tsx`(목록 `.fav-btn`·`Star`·`toggleFavorite` 호출), `app/(app)/posts/[id]/PostDetailClient.tsx`(`.detail-fav-btn`·`Star`), `components/AppShell.tsx`(`favorite={post.favorite}` prop), `components/ui/SidebarItem.tsx`(`favorite` prop·`.sidebar-item__star`·`Star` 렌더) 삭제.
- [ ] T009 [P] 즐겨찾기 스타일/토큰 제거 및 문서 동기화 — **먼저 `DESIGN.md`를 읽고**(Principle III), `app/globals.css`의 `.fav-btn`/`.detail-fav-btn`/`.sidebar-item__star` 규칙과 `--status-favorite` 토큰(즐겨찾기 전용이면 `--gold-500` 포함) 제거, `DESIGN.md`의 즐겨찾기 컴포넌트(§2.7.2/§2.7.3)·토큰·플로우(§5.3)·`Post` 타입 표기를 코드와 일치하도록 갱신.
- [ ] T010 RLS 정책 적용 — `specs/003-supabase-page-posts/contracts/rls-policies.sql`의 4개 정책(`page_select_own`/`page_insert_own`/`page_update_own`/`page_delete_own`)을 Supabase 마이그레이션(apply_migration)으로 적용. 확인: `pg_policies`에 4개 존재. (테이블 구조 변경 아님 — 정책만 추가.)
- [ ] T011 즐겨찾기 제거 + 타입 변경 후 `npm test` 및 타입체크가 그린인지 확인(무경고).

**Checkpoint**: 공유 계층·보안 정책 준비 완료 → 스토리 구현 시작 가능.

---

## Phase 3: User Story 1 - 로그인 사용자만 게시글 작성·저장 (Priority: P1) 🎯 MVP

**Goal**: 로그인 사용자가 새 글을 작성하면 Supabase `page` 테이블에 저장되고, 새로고침·재접속 후에도 자신의 목록에 유지된다. 비로그인 사용자는 작성 불가.

**Independent Test**: 로그인 → `/page 첫 글` 작성 → 새로고침 후에도 목록/상세에 유지. Supabase에 `user_id`가 내 계정인 행 생성. 로그아웃 상태에서는 작성 UI 진입이 막힘.

### Tests for User Story 1 (RED first) ⚠️

- [ ] T012 [P] [US1] `__tests__/posts.test.ts`에 `insertPost` 실패 테스트 — 목킹된 Supabase 클라이언트로 `newInsertPayload`(user_id 포함) 전달과 반환 행→`Post` 매핑 검증. RED.
- [ ] T013 [P] [US1] `__tests__/store.test.tsx`에 `createPost` 실패 테스트 — 성공 시 반환 `Post`를 목록 맨 앞에 추가하고 반환, 오류 시 `null` 반환. (목킹 Supabase + AuthProvider 문맥). RED.

### Implementation for User Story 1

- [ ] T014 [US1] `lib/posts.ts`에 `insertPost(title, userId)`와 `fetchMyPosts()` 구현(`insert(...).select().single()`, `select("*").order("created_at",{ascending:false})` + `rowToPost`/`sortPosts`). T012 GREEN.
- [ ] T015 [US1] `lib/store.tsx` 리팩터: `useAuth()` 세션 구독 → 세션 확정 시 `fetchMyPosts`로 로드하고 `loaded=true`; `createPost`를 `async`(=`insertPost`)로 전환해 반환 `Post` prepend; 게시글의 localStorage 저장/`seed()` 제거(`nickname`/`avatar`의 localStorage는 유지). T013 GREEN.
- [ ] T016 [US1] 비동기 호출부 수정 — `app/(app)/page.tsx`의 `createPage`와 `components/AppShell.tsx`의 `newPage`에서 `await app.createPost(...)` 후 반환 post로 `router.push(\`/posts/${post.id}\`)`(null이면 미이동).
- [ ] T017 [US1] 생성/로드 실패 오류 표면화 — 실패 시 사용자 알림(간단 인라인/알림) 및 로컬 상태를 서버 진실과 어긋나지 않게 유지(`contracts/posts-store.md` §D).

**Checkpoint**: US1 독립 동작 — 작성·영속·본인 목록 표시 확인 가능(MVP).

---

## Phase 4: User Story 2 - 자신의 글만 조회 (Priority: P1)

**Goal**: 각 사용자는 자신의 글만 목록·상세에서 보고, 타인 글은 어디에도 노출되지 않으며 비로그인은 게시글이 보이지 않는다.

**Independent Test**: A가 글 작성 → B로 로그인 시 A의 글 0건, B가 A의 글 URL 직접 접근해도 미표시. 로그아웃 시 목록 비고 `/login` 유도.

### Tests for User Story 2 (RED first) ⚠️

- [ ] T018 [P] [US2] `__tests__/store.test.tsx`에 실패 테스트 — 로그아웃(session=null) 시 `posts`가 비워지고 `loaded`가 재설정됨; 재로그인 시 새 세션 글로 로드. RED.
- [ ] T019 [P] [US2] `__tests__/posts.test.ts`에 `fetchMyPosts` 실패 테스트 — `page`에서 `created_at desc`로 조회(수동 user 필터 없이 RLS 의존)하고 행을 `Post[]`로 매핑. RED.

### Implementation for User Story 2

- [ ] T020 [US2] `lib/store.tsx`에서 로그아웃 반응 구현 — `session`이 null이 되면 `posts=[]`, `loaded` 재설정. T018 GREEN. (조회 격리는 T010의 `page_select_own` RLS가 서버에서 강제.)
- [ ] T021 [US2] `app/(app)/posts/[id]/PostDetailClient.tsx`에서 비소유/미존재 글 처리 확인 — 비동기 로드 완료(`app.loaded`) 후 내 목록에 없는 id면 `/`로 리다이렉트되도록 검증/보완.
- [ ] T022 [US2] 비로그인 게이트·빈 상태 확인 — `components/AppShell.tsx`의 `auth.ready && !auth.session → /login`과 빈 목록 UI가 비동기 로드에서도 정상 동작함을 확인(quickstart S2).

**Checkpoint**: US1+US2 독립 동작 — 소유자별 격리 조회 확인.

---

## Phase 5: User Story 3 - 자신의 글만 삭제 (Priority: P2)

**Goal**: 사용자는 자신의 글만 삭제할 수 있고, 타인 글 삭제 시도는 거부된다.

**Independent Test**: 본인 글 삭제 → 목록/서버에서 제거, 새로고침 후에도 없음. 타인 글 id 삭제 시도는 0행 영향(유지).

### Tests for User Story 3 (RED first) ⚠️

- [ ] T023 [P] [US3] `__tests__/posts.test.ts`에 `deletePostById(id)` 실패 테스트 — `delete().eq("id", id)` 호출·오류 경로 검증. RED.
- [ ] T024 [P] [US3] `__tests__/store.test.tsx`에 `deletePost` 실패 테스트 — 낙관적 로컬 제거, 서버 오류 시 재조회로 복구. RED.

### Implementation for User Story 3

- [ ] T025 [US3] `lib/posts.ts`에 `deletePostById(id)` 구현. T023 GREEN.
- [ ] T026 [US3] `lib/store.tsx`의 `deletePost`를 서버 연동으로 전환 — 낙관적 제거 + 실패 시 `fetchMyPosts` 재조회 복구. T024 GREEN. (소유권은 `page_delete_own` RLS가 강제.)
- [ ] T027 [US3] `app/(app)/posts/[id]/PostDetailClient.tsx` 삭제 플로우 확인 — confirm 후 `deletePost` → `/`로 이동이 비동기에서 정상 동작.

**Checkpoint**: US1~US3 독립 동작 — 본인 글 삭제 확인.

---

## Phase 6: User Story 4 - 자신의 글 편집 저장 (Priority: P3)

**Goal**: 사용자는 자신의 글 제목·내용을 수정하고 변경이 서버에 저장된다.

**Independent Test**: 본인 글 제목·내용 수정 → 디바운스 후 저장, 새로고침 시 변경 유지.

### Tests for User Story 4 (RED first) ⚠️

- [ ] T028 [P] [US4] `__tests__/posts.test.ts`에 `updatePostFields(id, patch)` 실패 테스트 — `update(patch).eq("id", id)` 호출·오류 경로 검증. RED.
- [ ] T029 [P] [US4] `__tests__/store.test.tsx`에 `updatePost` 디바운스 실패 테스트 — 로컬 즉시 반영 + 600ms 디바운스로 서버 1회 flush(타이머 페이크). RED.

### Implementation for User Story 4

- [ ] T030 [US4] `lib/posts.ts`에 `updatePostFields(id, patch)` 구현. T028 GREEN.
- [ ] T031 [US4] `lib/store.tsx`의 `updatePost`를 낙관적 로컬 반영 + id별 600ms 디바운스 서버 flush + 언마운트/이탈 시 flush로 전환. T029 GREEN. (소유권은 `page_update_own` RLS가 강제.)
- [ ] T032 [US4] `app/(app)/posts/[id]/PostDetailClient.tsx` 편집 확인 — 제목/내용 입력이 `updatePost`로 저장되고 "자동 저장됨" 표기 유지, 새로고침 시 반영.

**Checkpoint**: 모든 스토리(US1~US4) 독립 동작.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: 다중 스토리 공통 마무리 및 완료 게이트

- [ ] T033 [P] `specs/003-supabase-page-posts/quickstart.md`의 수동 시나리오 S1~S5를 실제 2개 계정으로 검증(RLS·격리·삭제·편집·즐겨찾기 부재).
- [ ] T034 [P] `DESIGN.md` 최종 일관성 점검 — 즐겨찾기 관련 잔여 표기(토큰·컴포넌트·플로우·아이콘)가 코드와 일치하게 완전히 제거되었는지 확인.
- [ ] T035 [P] 사용하지 않는 코드/임포트 정리 — 즐겨찾기 제거로 남은 `Star` 임포트 등 touched 파일 전반 정리.
- [ ] T036 완료 게이트(Constitution I) — `npm test` 전체 실행해 그린 + 무경고 확인, 각 새 함수 테스트 존재·RED 목격·최소 구현 체크.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 즉시 시작. T001(004 병합)이 이후 모든 파일의 전제.
- **Foundational (Phase 2)**: Setup 완료 후. 모든 US를 차단. T006(헬퍼)·T007(타입)·T010(RLS)이 핵심 전제.
- **User Stories (Phase 3~6)**: Foundational 완료 후. 우선순위 P1(US1,US2) → P2(US3) → P3(US4).
- **Polish (Phase 7)**: 원하는 스토리 완료 후.

### User Story Dependencies

- **US1 (P1)**: Foundational 후 시작. `fetchMyPosts`(T014)를 도입 — US2가 이를 재사용.
- **US2 (P1)**: Foundational 후 시작. 조회 격리는 RLS(T010)가 강제. US1의 로드 경로와 겹치므로 US1 직후가 자연스럽다(로그아웃 반응만 추가).
- **US3 (P2)**: Foundational 후 시작. store `deletePost`만 서버 연동으로 교체(독립).
- **US4 (P3)**: Foundational 후 시작. store `updatePost`만 디바운스 서버 연동으로 교체(독립).

### Within Each User Story

- 테스트(RED) → 구현(GREEN) → 통합 순서. `lib/posts.ts`(데이터) → `lib/store.tsx`(상태) → 화면 컴포넌트.
- 같은 파일(`lib/store.tsx`)을 여러 스토리가 순차 수정하므로 스토리 간 [P] 아님.

### Parallel Opportunities

- Foundational: T005(테스트)와, 타입 변경(T007) 이후 T008(UI 제거)·T009(CSS/문서)는 서로 다른 파일이라 [P].
- 각 스토리의 테스트 두 개(posts.test.ts / store.test.tsx)는 서로 다른 파일이라 [P].
- Polish의 T033/T034/T035는 [P].

---

## Parallel Example: Foundational

```bash
# 타입 변경(T007) 후, 즐겨찾기 흔적 제거를 병렬로:
Task: "T008 즐겨찾기 UI 제거 (page.tsx / PostDetailClient.tsx / AppShell.tsx / SidebarItem.tsx)"
Task: "T009 즐겨찾기 스타일·토큰 제거 + DESIGN.md 동기화 (globals.css / DESIGN.md)"
```

## Parallel Example: User Story 1

```bash
# US1 실패 테스트를 함께 작성(서로 다른 파일):
Task: "T012 insertPost 테스트 in __tests__/posts.test.ts"
Task: "T013 createPost(async) 테스트 in __tests__/store.test.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Phase 1 Setup(특히 T001 004 병합) → 2. Phase 2 Foundational(헬퍼·즐겨찾기 제거·RLS) → 3. Phase 3 US1 → **중단·검증**: 로그인 작성·영속·본인 목록 표시. 준비되면 데모.

### Incremental Delivery

1. Setup + Foundational → 기반 완료
2. US1(작성·영속) → 독립 검증 → 데모(MVP)
3. US2(격리 조회) → 독립 검증
4. US3(삭제) → 독립 검증
5. US4(편집 저장) → 독립 검증

### 주의

- 중간 상태 허용: US1 완료~US3/US4 이전에는 삭제/편집이 아직 서버 미연동일 수 있음(로컬 반영). 각 스토리에서 서버 연동으로 승격.
- 완료 선언 전 항상 `npm test` 그린·무경고(Constitution I 완료 체크리스트).

---

## Notes

- [P] = 서로 다른 파일, 미완 의존 없음.
- TDD 의무: 구현 전 실패 테스트의 RED를 직접 목격(Constitution I·II). 목은 실제 `{data,error}`·행 구조를 완전히 반영, 목 자체를 검증하지 않음.
- 보안은 RLS(T010)가 서버에서 강제 — 클라이언트 필터와 이중.
- 테이블 구조 불변: 정책만 추가, 컬럼 변경 없음(FR-009 / SC-006).
- 태스크 또는 논리 그룹마다 커밋.
