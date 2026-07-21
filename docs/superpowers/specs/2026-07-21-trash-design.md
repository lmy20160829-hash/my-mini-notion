# 휴지통 (소프트 삭제) 설계 — 2026-07-21

노션 Trash 벤치마킹. 삭제의 의미를 하드 삭제에서 소프트 삭제로 바꾸고,
휴지통 화면에서 복원·영구 삭제를 제공한다. `docs/BACKLOG.md` "휴지통 — 소프트 삭제" 항목 기반.

## 범위

- 포함: 소프트 삭제 전환, `/trash` 화면(목록·복원·영구 삭제), 사이드바 "휴지통" 활성화.
- 제외: 자동 영구 삭제 기한(30일 등) — cron/Edge Function이 필요해 이번 범위 밖.

## DB (이미 적용됨 — 마이그레이션 금지)

`page.deleted_at timestamptz null`이 **메인 세션에서 이미 적용·검증되었다.**
에이전트는 마이그레이션을 실행하지 않는다. RLS는 기존 `page_update_own`(소프트 삭제/복원 =
UPDATE)과 `page_delete_own`(영구 삭제 = DELETE)이 그대로 커버한다.

## 데이터 계층 (`lib/posts.ts`)

- `PageRow`에 `deleted_at: string | null` 추가. `Post`에 `deletedAt: number | null`.
- `fetchMyPosts()`: `.is("deleted_at", null)` 필터 추가 — 휴지통 글은 목록·사이드바에서 제외.
- `fetchTrashedPosts()`: `.not("deleted_at", "is", null)` + `deleted_at` 내림차순.
- `softDeletePost(id)`: `update({ deleted_at: <now ISO> })` — **A2 계약 준수**:
  `.select("id")` + 0행이면 throw ("게시글을 찾지 못해 삭제하지 못했습니다.").
- `restorePost(id)`: `update({ deleted_at: null })` — 같은 계약 ("…복원하지 못했습니다.").
- 영구 삭제: 기존 `deletePostById` 재사용(이미 A2 계약 적용됨).

## 상태 (`lib/store.tsx`)

- `deletePost(id)`의 서버 호출을 `deletePostById` → `softDeletePost`로 교체.
  낙관적 제거 + 실패 시 재조회 롤백 + 대기 디바운스 취소는 그대로 유지.
- 휴지통 목록은 스토어에 넣지 않는다 — `/trash` 화면의 로컬 상태로 관리(진입 시 fetch).
  복원 성공 시 스토어 `posts`에 다시 넣어야 하므로 `restoreToList(post: Post)` 액션 추가
  (또는 복원 후 `fetchMyPosts` 재조회 — 구현 단순한 쪽 선택, 스펙상 둘 다 허용).

## 화면 (`app/(app)/trash/page.tsx`)

- 기존 화면 관행(클라이언트 컴포넌트, `useApp`/직접 fetch)을 따른다.
- 목록: 기존 `.post-card` 재사용(클릭 이동 없음 — 커서 기본). 카드 우측에
  "복원"(Button secondary, RotateCcw 아이콘)과 "영구 삭제"(`.detail-delete-btn` 관행) 버튼.
- 영구 삭제는 `window.confirm`으로 확인 후 실행(기존 알림 관행 `notify`와 동일하게 최소 UI).
- 빈 상태: `.empty-state` 재사용 — "휴지통이 비어 있어요." / 설명 한 줄. 아이콘 `Trash2`.
- 로딩: 기존 관행대로 간단히(로드 전 null 또는 문구). 실패: `window.alert`.

## 셸 (`components/AppShell.tsx`)

- 사이드바 "휴지통" `SidebarItem`의 `disabled` 제거(펼침·레일 두 곳), `/trash` 라우팅 +
  `pathname === "/trash"` 활성 표시.
- **design-md-sync 절차 5 필수**: `__tests__/AppShell.pendingItems.test.tsx`의 비활성
  목록에서 휴지통 제거, DESIGN.md §2.5/§3.3의 비활성 서술 갱신.

## 테스트 (TDD)

- posts: `fetchMyPosts` 필터, `fetchTrashedPosts` 쿼리, `softDeletePost`/`restorePost`의
  성공·서버 오류·**0행 throw** 각각.
- store: `deletePost`가 soft delete를 호출하는지, 실패 롤백 유지.
- 화면: 목록 렌더·복원 클릭 시 목록 이탈·빈 상태.

## DESIGN.md 반영

- §4.x "휴지통" 화면 명세 신설(기존 §4.2 형식), §5.3 "글 삭제"를 소프트 삭제 의미로 갱신,
  줄번호 참조 재계산(globals.css를 건드린 경우).
