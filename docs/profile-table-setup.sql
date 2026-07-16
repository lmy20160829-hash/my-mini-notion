-- ============================================================
-- profile 테이블 설정 — 로그인 시 구글 인증 정보 저장을 위한 준비
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 Run.
-- 여러 번 실행해도 안전하도록 전부 idempotent 하게 작성했다.
-- ============================================================

-- 1) 저장할 컬럼 추가 (이름은 이미 있음 → email, avatar_url 추가)
alter table public.profile
  add column if not exists email text,
  add column if not exists avatar_url text;

-- 2) 사용자당 한 행만 유지.
--    앱은 upsert(onConflict: user_id) 로 저장하므로 user_id 에 유니크가 필요하다.
--    유니크 인덱스는 IF NOT EXISTS 가 되어 재실행에 안전하다.
create unique index if not exists profile_user_id_key
  on public.profile (user_id);

-- 3) RLS 활성화 (이미 켜져 있어도 무해)
alter table public.profile enable row level security;

-- 4) 본인 행만 읽고/쓰도록 정책 부여 (로그인한 사용자 = auth.uid()).
--    재실행 안전을 위해 먼저 drop 후 create.
drop policy if exists "profile_select_own" on public.profile;
create policy "profile_select_own"
  on public.profile for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "profile_insert_own" on public.profile;
create policy "profile_insert_own"
  on public.profile for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "profile_update_own" on public.profile;
create policy "profile_update_own"
  on public.profile for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
