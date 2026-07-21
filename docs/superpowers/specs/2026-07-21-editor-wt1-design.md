# wt1 — 플로팅 서식 툴바 ① · 슬래시 커맨드 ② · 페이지 템플릿 ⑨ (2026-07-21)

오버뷰 스펙(2026-07-21-editor-sprint-overview.md)의 결정을 전제한다.
**파일 소유권**: wt1은 `lib/editor/marks.ts`(전용)·`lib/editor/insert.ts`(신규)·
`lib/editor/templates.ts`(신규)·`components/editor/FormatToolbar.tsx`·
`components/editor/SlashMenu.tsx`·`components/editor/TemplatePicker.tsx`만 만진다.
`lib/editor/nodes.ts`·`media-nodes.ts`(wt2·wt3 소유)와 `PostEditor.tsx` 결합부는 수정 금지
(P2 사전 스캐폴드가 이미 결합해 둠). CSS는 globals.css 파일 끝 `.fmt-*`/`.slash2-*`/`.tpl-*`.

## ① 플로팅 서식 툴바 (§2.10, §6.8)

- 마크 6종: 굵게(Bold)·기울임(Italic)·밑줄(Underline)·취소선(Strike)·인라인 코드(Code)·
  링크(Link) — 사전 설치된 패키지의 마크 확장을 `lib/editor/marks.ts` 배열에 등록.
- UI: 텍스트 선택 시에만 뜨는 말풍선(`@tiptap/react/menus`의 BubbleMenu). `.fmt-bar`:
  `--surface-card` + `--border-subtle` + `--shadow-lg` + radius-lg + `mnPop` 등장(§1.5).
  버튼은 기존 `.icon-btn` 재사용(활성 마크 = `.is-active` 배경 `--surface-active`).
- 링크: 버튼 클릭 → 미니 입력(`.fmt-link-input`, `.input-sm` 토큰 재사용) → Enter 적용,
  빈 값 = 링크 해제. `rel="noopener noreferrer nofollow"` 기본(Link 확장 기본값 유지).
- 키보드: Cmd/Ctrl+B·I·U·Shift+S·E(코드)는 확장 기본 단축키 그대로.

## ② 슬래시 커맨드 메뉴 (§2.11, §5.11)

- `@tiptap/suggestion` 기반, 트리거 `/`. **항목은 `lib/editor/blocks.ts`의 BLOCKS만 소비**
  — 하드코딩 금지. keywords로 실시간 필터, 매치 없으면 "결과 없음" 한 줄.
- 삽입 실행은 `lib/editor/insert.ts`의 `insertBlock(editor, spec)` 하나로 —
  `spec.type`/`attrs`를 노드 생성 커맨드로 매핑한다. **wt2 노드가 아직 없는 타입은
  스키마에 등록돼 있지 않으면 항목을 자동 숨김**(`editor.schema.nodes[spec.type]` 존재
  검사) — 머지 순서(wt2 먼저)와 무관하게 단독으로도 깨지지 않는 안전장치.
- UI `.slash2-*`: 기존 컴포저 슬래시 메뉴(§2.7.8)와 **별개 컴포넌트**(그 화면은 불변),
  같은 토큰(카드·hover·`__tile` 등)으로 시각 일관성 유지. 위/아래/Enter/Esc 키보드 탐색.

## ⑨ 페이지 템플릿 (§5.11, §6.8)

- `lib/editor/templates.ts`: 3종 — 회의록(제목1 "회의록"+날짜 문단+참석자 불릿+안건
  번호 목록+액션아이템 체크박스), 할 일(제목1+체크박스 목록 3칸), 메모(제목1+문단).
  형식은 `EditorDoc` 조각, 노드 타입은 BLOCKS의 type 문자열만 사용.
- 노출: **빈 글**(content_doc 없음 && content 빈 문자열) 상세 진입 시 본문 위에
  `.tpl-row` — "빈 페이지 / 회의록 / 할 일 / 메모" 4버튼(Button secondary). 선택 시
  문서 삽입 + dual-write 저장, 행 사라짐. 타이핑을 시작해도 사라짐(노션 관행).
- 템플릿 doc 단위 테스트는 JSON 구조 단언(에디터 렌더 불요) — 스키마 미등록 노드가
  있어도 wt1 단독 테스트가 성립한다.

## 테스트(TDD) · DESIGN.md

- marks 등록/툴바 표시 조건/링크 적용·해제, BLOCKS 필터 로직(키워드·빈 결과),
  insertBlock 스키마 가드, 템플릿 JSON 구조·빈 글 노출 조건.
- DESIGN.md: §2.10·§2.11 신설, §5.11 신설, §6.8 카피(버튼 라벨·"결과 없음" 등),
  목차 갱신. globals.css는 파일 끝 추가만 → 기존 줄번호 참조 무영향 확인.
