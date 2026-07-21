-- post-attachments 버킷 — 본문 첨부(⑧) (2026-07-21 적용 완료)
-- 적용 후 실측: 버킷 public·20MB·MIME 11종, 정책 2종 본문(qual/with_check) 확인,
-- Security Advisor 신규 경고 0건.
-- 경로 규약 {user_id}/{post_id}/{uuid}.{ext} — 첫 폴더가 소유자.
-- 이미지 5MB 상한·확장자 화이트리스트는 클라이언트(lib/attachments.ts)와 이중 방어.
-- 영구 삭제 시 첨부 삭제 실패 = 고아 첨부 → 고정 포맷 로깅 + BACKLOG "고아 첨부 정리".

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'post-attachments', 'post-attachments', true, 20971520,
  array[
    'image/png','image/jpeg','image/gif','image/webp',
    'application/pdf','application/zip','text/plain','text/markdown','text/csv',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
);

create policy post_attachments_insert_own on storage.objects
  for insert to authenticated
  with check (bucket_id = 'post-attachments' and (storage.foldername(name))[1] = auth.uid()::text);

create policy post_attachments_delete_own on storage.objects
  for delete to authenticated
  using (bucket_id = 'post-attachments' and (storage.foldername(name))[1] = auth.uid()::text);
