-- Contract: RLS policies for public.page
-- Feature: 003-supabase-page-posts
-- NOTE: 접근 제어(정책) 추가일 뿐 테이블 구조는 변경하지 않는다 (FR-009).
-- 적용은 Supabase 마이그레이션(apply_migration)으로 수행한다.
-- 패턴은 기존 public.profile 정책을 미러링한다.

-- 전제: page.rls_enabled = true (이미 활성). 정책이 없으면 기본 거부 상태.
alter table public.page enable row level security; -- 멱등(이미 활성)

-- 자신의 글만 조회 (FR-004)
create policy page_select_own
  on public.page
  for select
  to authenticated
  using (auth.uid() = user_id);

-- 로그인 사용자만 작성 + 소유자 위조 차단 (FR-002, FR-003)
create policy page_insert_own
  on public.page
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- 자신의 글만 수정 (FR-007)
create policy page_update_own
  on public.page
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 자신의 글만 삭제 (FR-006)
create policy page_delete_own
  on public.page
  for delete
  to authenticated
  using (auth.uid() = user_id);
