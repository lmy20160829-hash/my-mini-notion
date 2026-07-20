-- ============================================================
-- page 테이블 RLS 정책 — 게시글 소유권 강제 (003-supabase-page-posts)
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 Run.
-- 여러 번 실행해도 안전하도록 전부 idempotent 하게 작성했다.
--
-- ⚠️ 테이블 구조는 변경하지 않는다 (FR-009 / SC-006).
--    컬럼 추가·변경·삭제 없음 — 접근 제어 정책만 추가한다.
--
-- 이 정책이 적용되기 전까지는 page 테이블이 "정책 0개 = 기본 거부" 상태라
-- 앱에서 글 조회·작성·수정·삭제가 모두 실패한다. 반드시 먼저 적용할 것.
-- ============================================================

-- 1) RLS 활성화 (이미 켜져 있어도 무해)
alter table public.page enable row level security;

-- 2) 자신의 글만 조회 (FR-004)
drop policy if exists "page_select_own" on public.page;
create policy "page_select_own"
  on public.page for select
  to authenticated
  using (auth.uid() = user_id);

-- 3) 로그인 사용자만 작성 + 소유자 위조 차단 (FR-002, FR-003)
drop policy if exists "page_insert_own" on public.page;
create policy "page_insert_own"
  on public.page for insert
  to authenticated
  with check (auth.uid() = user_id);

-- 4) 자신의 글만 수정 (FR-007)
drop policy if exists "page_update_own" on public.page;
create policy "page_update_own"
  on public.page for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 5) 자신의 글만 삭제 (FR-006)
drop policy if exists "page_delete_own" on public.page;
create policy "page_delete_own"
  on public.page for delete
  to authenticated
  using (auth.uid() = user_id);

-- 확인: 아래 쿼리가 4개 행(page_select_own/insert/update/delete_own)을 반환해야 한다.
-- select policyname, cmd from pg_policies where schemaname = 'public' and tablename = 'page';
