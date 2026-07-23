# 에디터 전면 고도화 스프린트 — 오버뷰 스펙 (2026-07-21)

노션 사용자 조사 기반 9개 기능. 상단 고정 툴바 없음.[^1] 데이터베이스(테이블·보드 뷰)는
범위 제외(BACKLOG "다음 스프린트 1순위"). 이 문서는 사용자 승인을 받은 공통 결정의
단일 원본이며, 워크트리별 상세 스펙이 이를 참조한다.

[^1]: (이 결정은 2026-07-23 문서 작업 스프린트가 대체 — DESIGN.md §2.14)

## 확정 결정 (2026-07-21 사용자 승인)

1. **엔진: Tiptap v3** — 설치 시점 실측 3.28.0, `@tiptap/react`·`@tiptap/starter-kit`·
   `@tiptap/pm` 모두 MIT(npm view로 확인). 헤드리스 — UI는 전부 DESIGN.md 토큰으로
   직접 스타일링한다.
2. **첨부 정책(⑧)**:
   - 화이트리스트 — 이미지: png/jpg/jpeg/gif/webp (**svg 제외** — XSS 벡터).
     일반 파일: pdf/zip/txt/md/csv/docx/xlsx.
   - 용량 상한 — 이미지 5MB(기존 `validateImageFile`과 통일), 일반 파일 20MB.
   - 저장 위치 — 신규 버킷 `post-attachments`, 경로 `{user_id}/{post_id}/{uuid}.{ext}`,
     RLS: 본인 폴더만 insert/delete, select는 public(글 공유 없음 — 단일 사용자 열람이지만
     URL 노출 시 접근 가능함을 스펙에 명시. 비공개 필요 시 signed URL은 후속 과제).
   - **글 삭제 시 첨부 처리(승인된 실패 처리 포함)**:
     - 소프트 삭제(휴지통 이동): 첨부 **유지** — 복원 대비.
     - 영구 삭제: 해당 글 폴더의 첨부 **삭제 시도**. 글 행 삭제를 먼저 확정하고 첨부
       삭제는 후속(첨부 삭제 실패가 글 삭제를 막지 않는다).
     - **삭제 실패 시**: `console.error("[attachments] 고아 첨부 발생: {post_id}/{경로}", 원인)`
       로 로깅하고 사용자 흐름은 중단하지 않는다. 이렇게 남은 파일은 **고아 첨부**로
       정의하며, 주기 정리는 `docs/BACKLOG.md` "고아 첨부 정리" 항목이 담당한다
       (Edge Function/cron — 이번 범위 밖). 로그 포맷을 고정해 두는 이유: 백로그 착수 시
       고아 목록을 로그·Storage 목록 대조로 재구성할 수 있게 하기 위함이다.
3. **마이그레이션(손실 제로)**: `page.content_doc jsonb null` 가산 + dual read/write.
   읽기: `content_doc` 우선, 없으면 `textToDoc(content)`. 쓰기: `content_doc`과 함께
   플레인 projection `docToText()`를 `content`에 항상 기록(검색·폴백 보존).
   불변식: `content_doc`이 있으면 `docToText(content_doc) === content`. 원본 `content`
   컬럼은 재작성·삭제하지 않는다.

## 블록 레지스트리 계약 (`lib/editor/blocks.ts` — P1에서 확정)

wt1(슬래시 메뉴·템플릿)과 wt2(블록 구현)의 접점. wt1은 이 레지스트리만 소비하고,
wt2는 레지스트리에 선언된 노드 이름을 그대로 구현한다. 노드 이름(Tiptap type):
`paragraph` `heading`(level 1–3) `bulletList` `orderedList` `taskList` `blockquote`
`callout` `toggle` `horizontalRule` `image` `fileBlock`.

## DESIGN.md 섹션 번호 사전 배정 (선점 충돌 방지 — 지난 라운드 §4.5 전례)

| 번호 | 내용 | 담당 |
|---|---|---|
| §2.10 | 플로팅 서식 툴바 | wt1 |
| §2.11 | 에디터 슬래시 커맨드 메뉴 | wt1 |
| §2.12 | 드래그 핸들 | wt2 |
| §2.13 | 이미지·파일 블록 | wt3 |
| §4.3.1 | 본문 블록 타입 카탈로그 | wt2 |
| §4.7 | 사이드바 페이지 트리(중첩) | wt3 |
| §5.10 | 서식·블록 편집 동작 | wt2 |
| §5.11 | 슬래시 메뉴·템플릿 동작 | wt1 |
| §5.12 | 페이지 중첩 동작 | wt3 |
| §5.13 | 첨부 업로드(DnD·붙여넣기) 동작 | wt3 |
| §6.8 | 에디터·템플릿 카피 | wt1 |
| §6.9 | 트리·첨부 카피 | wt3 |

globals.css 추가는 전 워크트리 **파일 끝**에만(줄번호 밀림 최소화), 접두사 분리:
wt1 `.fmt-*`/`.slash2-*`, wt2 `.blk-*`/`.handle-*`, wt3 `.tree-*`/`.attach-*`.

## 실행 순서·머지 순서

P1 엔진 도입(순차, 메인) → P1.5 중앙 DB 선행(`parent_id`·`icon`·버킷+RLS) + main
푸시(워크트리 기준점) → P2 병렬: wt1 ①②⑨ / wt2 ③④ / wt3 ⑤⑥⑦⑧ →
P3 순차 머지 **wt2 → wt1 → wt3** (②가 ④의 블록을 삽입하므로) + 머지별
`npm test && npm run build` → P4 최종 실측·배포 확인.

전 과정 스킬 3종(supabase-verify · design-md-sync · commit-hygiene) 준수.
