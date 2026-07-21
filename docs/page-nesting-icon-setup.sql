-- page.parent_id / page.icon — 페이지 중첩(⑤)·이모지 아이콘(⑦) (2026-07-21 적용 완료)
-- 적용 후 실측: 컬럼 존재, page_parent_idx 존재, 행 수 1·본문 md5 스냅샷 일치(무손상).
-- 순환 방지(자기/자손을 부모로 금지)는 앱 레벨(lib/tree.ts)이 강제한다.

alter table public.page add column parent_id bigint references public.page(id) on delete set null;
create index page_parent_idx on public.page(parent_id);
alter table public.page add column icon text check (icon is null or char_length(icon) <= 16);
