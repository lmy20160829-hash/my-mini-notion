# wt2 — 드래그 핸들 ③ · 블록 타입 ④ (2026-07-21)

오버뷰 스펙(2026-07-21-editor-sprint-overview.md)의 결정을 전제한다.
**파일 소유권**: wt2는 `lib/editor/nodes.ts`(전용)와
`components/editor/DragHandle.tsx`·커스텀 노드 컴포넌트(`components/editor/nodes/`)만
만진다. `marks.ts`(wt1)·`media-nodes.ts`(wt3)·`PostEditor.tsx` 결합부 수정 금지.
CSS는 globals.css 파일 끝 `.blk-*`/`.handle-*`.

## ④ 블록 타입 (§4.3.1, §5.10)

`lib/editor/blocks.ts` 계약의 노드를 `lib/editor/nodes.ts`에 등록한다
(이미지·파일 블록은 wt3 소유 — 여기서 구현하지 않는다):

- **사전 설치 확장 사용**: heading(level 1–3 제한), bulletList/orderedList/listItem,
  taskList/taskItem(중첩 허용), blockquote, horizontalRule.
- **커스텀 노드 2종**:
  - `callout`: 배경 `--accent-soft` + radius-lg + 아이콘(💡 고정, P1 범위) + 내부 문단.
  - `toggle`: 제목행(펼침 삼각형 `ChevronRight`, 회전 애니메이션 `--dur-fast`) + 접히는
    본문 영역. 접힘 상태는 노드 attrs(`open`)로 문서에 저장.
- **마크다운 단축 입력**(입력 규칙): `# `→제목1, `## `→제목2, `### `→제목3, `- `→불릿,
  `1. `→번호, `[] `→체크박스, `> `→인용, `---`→구분선. 확장 기본 inputRules 활용.
- 타이포·간격 등 시각 값은 전부 §1 토큰. 제목은 §1.2 스케일 준용(예: h1 26/700,
  h2 20/700, h3 17/700 — DESIGN.md §4.3.1에 확정 기록).

## ③ 드래그 핸들 (§2.12, §5.10)

- `@tiptap/extension-drag-handle`(MIT 전환 실측 확인됨) + React 래퍼. 블록 hover 시
  왼쪽 여백에 `⋮⋮`(`GripVertical` 16, `--text-placeholder` → hover `--text-muted`).
- 드래그 = 블록 이동(PM 기본). 클릭 = 메뉴(`.handle-menu`, §2.7.8 슬래시 메뉴와 같은
  카드 토큰): **타입 변환**(BLOCKS 중 스키마에 존재하는 텍스트 블록으로), **복제**,
  **삭제**. 메뉴 항목·라벨은 §6 카피 표에 기록.
- 접근성: 핸들 버튼 `aria-label="블록 옮기기"`, 메뉴 키보드 탐색(위/아래/Enter/Esc).

## 테스트(TDD) · DESIGN.md

- 노드 등록(스키마에 13개 중 11개 존재 — image/fileBlock 제외), 입력 규칙 변환,
  callout/toggle 직렬화 왕복(getJSON→setContent), toggle open attrs, 핸들 메뉴 액션
  (변환·복제·삭제)의 문서 결과.
- `docToText` projection이 새 블록에서도 텍스트를 보존하는지(중첩 재귀) 단언 —
  검색·글자수·불변식이 의존한다.
- DESIGN.md: §2.12·§4.3.1·§5.10 신설, §6 카피, 목차 갱신. globals.css 파일 끝 추가만.
