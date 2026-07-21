# wt3 — 페이지 중첩 ⑤ · 본문 이미지 ⑥ · 이모지 아이콘 ⑦ · 첨부 업로드 ⑧ (2026-07-21)

오버뷰 스펙(2026-07-21-editor-sprint-overview.md)의 결정을 전제한다. DB는 **이미 적용·
검증 완료**(마이그레이션 금지): `page.parent_id`(자기참조, on delete set null, 인덱스)·
`page.icon`(text ≤16자)·버킷 `post-attachments`(public, 20MB, MIME 11종,
insert/delete own 정책). **파일 소유권**: `lib/editor/media-nodes.ts`(전용)·
`lib/attachments.ts`·`lib/tree.ts`·`components/editor/nodes-media/`·트리 UI. `marks.ts`·
`nodes.ts`·`PostEditor.tsx` 결합부 수정 금지. CSS는 파일 끝 `.tree-*`/`.attach-*`/`.icon-pick-*`.

## ⑤ 페이지 중첩 (§4.7, §5.12)

- 데이터: `PageRow.parent_id`/`Post.parentId` 매핑, `newInsertPayload`에 parentId 옵션.
- 사이드바 "내 글" → 트리: `lib/tree.ts` `buildTree(posts)` 순수 함수(고아·순환 입력도
  안전하게 루트 처리). 들여쓰기 12px/단계, 접기 삼각형(자식 있는 항목만), 접힘 상태는
  localStorage(§5.5 스키마 확장).
- 하위 페이지 생성: 사이드바 항목 hover 액션(`+`) + 상세 브레드크럼이 조상 체인 표시.
- **순환 방지(앱 레벨)**: 부모 후보에서 자기·자손 제외 — `lib/tree.ts` `descendantIds()`.
- 삭제 의미론: 소프트 삭제는 해당 글만 휴지통으로 — 자식은 **루트로 표시**(부모가
  휴지통이면 트리 계산 시 루트 승격). 영구 삭제는 DB `set null`로 자식 루트 승격.
  검색(filterPosts)은 평면 그대로(트리는 표시 계층일 뿐).

## ⑥⑧ 이미지·파일 블록 + 업로드 (§2.13, §5.13)

- `lib/editor/media-nodes.ts`: `image`(사전 설치 Image 확장, `.attach-img` — max-width
  100%, radius-lg) + `fileBlock` 커스텀 노드(attrs: url·name·size — 카드형: `FileText`
  아이콘 + 파일명 + 크기(KB/MB) + 다운로드 링크, `.post-card` 토큰 계열).
- `lib/attachments.ts`:
  - `validateAttachment(file)` — 화이트리스트(이미지 png/jpg/jpeg/gif/webp ≤5MB,
    파일 pdf/zip/txt/md/csv/docx/xlsx ≤20MB), 실패 사유 한국어 메시지.
  - `uploadAttachment(userId, postId, file)` — 경로 `{userId}/{postId}/{uuid}.{ext}`,
    public URL 반환. profile-image 모듈 패턴 준용.
  - `deletePostAttachments(userId, postId)` — 폴더 목록 조회 후 일괄 삭제.
    **실패 시**: `console.error("[attachments] 고아 첨부 발생: {postId}/{경로}", 원인)`
    고정 포맷 로깅, throw 하지 않음(글 삭제 흐름 비차단) — 오버뷰 스펙 §2 승인 정책.
- 진입점: 에디터 `handleDrop`/`handlePaste`(editorProps — PostEditor 결합부가 아니라
  media-nodes.ts가 export 하는 프롭 객체로 제공, 사전 스캐폴드에 연결점 있음) +
  슬래시 메뉴의 이미지/파일 항목(wt1의 insertBlock이 파일 선택 다이얼로그 트리거).
- 업로드 중 표시: 블록 자리에 `.attach-uploading`(§2.7.15 스켈레톤 shimmer 재사용).
  실패는 `window.alert` + 블록 미삽입.
- 영구 삭제 연결: `/trash`의 영구 삭제 성공 후 `deletePostAttachments` 호출(비동기,
  결과 무시 — 위 로깅만).

## ⑦ 페이지 이모지 아이콘 (§4.3 확장, §5.12)

- 상세: 커버 아래·제목 위에 아이콘 버튼(있으면 이모지 40px, 없으면 hover 시
  "아이콘 추가" 유령 버튼). 클릭 → `.icon-pick` 팝오버(고정 이모지 24종 그리드 +
  "제거") — 외부 라이브러리 금지. 선택 즉시 `updatePost(id,{icon})` 저장(디바운스 불요,
  단발 UPDATE — A2 계약 경유).
- 표시: 사이드바 트리·글 카드 타일·브레드크럼에서 `FileText` 대신 이모지(없으면 기존
  아이콘 유지).

## 테스트(TDD) · DESIGN.md

- buildTree(중첩·고아·순환·휴지통 부모), descendantIds, validateAttachment 경계
  (5MB/20MB·확장자), 업로드 경로 규약, deletePostAttachments 실패 로깅 포맷,
  fileBlock 직렬화, 아이콘 저장·표시 폴백.
- DESIGN.md: §2.13·§4.7·§5.12·§5.13·§6.9 신설 + §4.2/§4.3/§3.3 표시 갱신, 목차 갱신.
