-- ============================================================
-- 프로필 이미지 저장소 설정 — 마이 페이지 "사진 변경"을 위한 준비
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 Run.
-- 여러 번 실행해도 안전하도록 전부 idempotent 하게 작성했다.
--
-- 전제: Storage 에 `profile-image` 버킷이 **공개(public)** 로 만들어져 있어야 한다.
--       (대시보드 → Storage → New bucket → Public 체크)
--       공개 버킷이라 읽기는 URL 로 바로 되지만, 쓰기는 아래 정책이 없으면
--       storage.objects 의 RLS 에 막혀 업로드가 조용히 실패한다.
-- ============================================================

-- 1) profile 테이블에 이미지 경로 컬럼 추가.
--    다운로드 URL 의 뒷부분(버킷명 이후)만 저장한다 — 앞부분은 환경변수
--    NEXT_PUBLIC_SUPABASE_STORAGE_URL 에 있다. 파일명은 uuidv4 라 충돌하지 않는다.
alter table public.profile
  add column if not exists image_path text;

-- 2) 버킷이 없으면 공개 버킷으로 만든다(이미 있으면 그대로 둔다).
insert into storage.buckets (id, name, public)
values ('profile-image', 'profile-image', true)
on conflict (id) do nothing;

-- 3) 로그인한 사용자가 profile-image 버킷에 올리고/바꾸고/지울 수 있게 한다.
--    재실행 안전을 위해 먼저 drop 후 create.
--    NOTE: 파일명이 uuidv4 라 경로만으로는 소유자를 알 수 없다. 즉 이 정책은
--    "로그인한 사용자면 이 버킷에 쓸 수 있다"까지만 보장하고, 남의 파일을 지우지
--    못하게 하지는 않는다. 앱은 자기 image_path 만 다루고, 어떤 파일이 누구 것인지는
--    profile 행(RLS 로 본인만 조회 가능)을 통해서만 드러난다.
drop policy if exists "profile_image_insert_authenticated" on storage.objects;
create policy "profile_image_insert_authenticated"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'profile-image');

drop policy if exists "profile_image_update_authenticated" on storage.objects;
create policy "profile_image_update_authenticated"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'profile-image')
  with check (bucket_id = 'profile-image');

-- 사진을 바꾸면 앱이 이전 파일을 지운다(고아 파일 방지).
drop policy if exists "profile_image_delete_authenticated" on storage.objects;
create policy "profile_image_delete_authenticated"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'profile-image');

-- 4) 읽기 정책은 **일부러 만들지 않는다.**
--    공개 버킷의 public URL 은 RLS 를 거치지 않으므로 사진 표시에 select 가 필요 없고,
--    넓은 select 정책을 붙이면 클라이언트가 버킷의 파일 **전체 목록**을 조회할 수 있어
--    다른 사용자의 프로필 사진 경로가 노출된다(Supabase security advisor
--    `public_bucket_allows_listing`). 앱도 list() 를 쓰지 않는다.
--    이전 버전에서 만들었다면 지운다.
drop policy if exists "profile_image_select_public" on storage.objects;
