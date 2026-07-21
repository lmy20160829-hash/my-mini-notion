-- page.content_doc — 에디터 블록 문서(Tiptap JSON) 컬럼 (2026-07-21 적용 완료)
--
-- 가산적 이행(손실 제로, 스펙 2026-07-21-editor-sprint-overview.md §3):
--   * 기존 content(플레인 텍스트)는 절대 재작성·삭제하지 않는다.
--   * NULL = 블록 편집 이력 없는 글 → 클라이언트가 textToDoc(content)로 즉석 변환.
--   * NOT NULL이면 docToText(content_doc) = content 계약 — 에디터가 dual-write.
-- 적용 후 실측 검증: 컬럼 jsonb 존재, 행 수/본문 md5 스냅샷과 일치 확인함.

alter table public.page add column content_doc jsonb;
