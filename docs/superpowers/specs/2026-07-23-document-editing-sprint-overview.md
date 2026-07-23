# 기본 문서 작업 스프린트 — 오버뷰 스펙 (2026-07-23)

컨플루언스 편집기 벤치마킹. 표를 그리고 서식 있는 문서를 만드는 게 핵심이다.
기존 노션식 3종(플로팅 서식 툴바·슬래시 메뉴·드래그 핸들)은 그대로 유지한다.
이 문서는 사용자 승인을 받은 공통 결정의 단일 원본이며, 워크트리별 상세 계획이
이를 참조한다(지난 2026-07-21 에디터 스프린트와 같은 조직).

## 0. 범위 (우선순위 순)

- **① 표 — 이번 스프린트의 주인공.** Tiptap Table 확장: 삽입(기본 3×3, 헤더 행
  포함), 행/열 추가·삭제, Tab 셀 이동, 셀 안 텍스트 서식, 셀 배경색(헤더 강조).
  슬래시 메뉴 `/표` + 블록 레지스트리 등재.
- **② 상단 고정 툴바.** 본문 상단 sticky: 텍스트 스타일 드롭다운(일반/제목1·2·3/
  인용) · B·I·U·S · 글자색·배경색 · 정렬(좌/중/우) · 목록 3종 · 링크 · 이미지 ·
  표 삽입 · 실행취소·재실행. 기존 플로팅·슬래시와 충돌 없이 공존.
- **③ 신규 서식.** 글자색(Color/TextStyle) · 배경색(Highlight) · 정렬(TextAlign).
  팔레트는 DESIGN.md 토큰.

### 비범위 → `docs/BACKLOG.md` 기록

- **셀 병합/분할** — 이번 표는 균일 격자만. Tiptap `mergeCells`는 후속.
- **@멘션** — `@tiptap/extension-mention` 미설치, 이번 범위 밖.
- **레이아웃(다단 컬럼)** — 컨플루언스 layout 매크로류, 별도 과제.
- **버전 이력** — 문서 스냅샷/diff, 별도 과제.
- **노션식 데이터베이스(속성 시스템·보드/칸반 뷰)** — `BACKLOG.md` "데이터베이스"
  항목이며 **이 인라인 표와 다른 별개 기능**이다. 혼동 금지: 이번 "표"는 문서 안
  Tiptap Table 블록이고, 데이터베이스는 속성·뷰를 가진 구조화 데이터다.

## 1. 확정 결정 (2026-07-23 사용자 승인)

1. **엔진: Tiptap v3(설치 실측 3.28.0) 유지.** 신규 확장 설치 후 각 package.json의
   `license`가 MIT임을 실측한다(지난 스프린트 관례 — `npm view <pkg> license`).
   설치 대상:
   - 표: `@tiptap/extension-table`, `-table-row`, `-table-cell`, `-table-header`
   - 글자색: `@tiptap/extension-color` + `@tiptap/extension-text-style`(Color 전제)
   - 배경색: `@tiptap/extension-highlight`
   - 정렬: `@tiptap/extension-text-align`
   - 승격: `@tiptap/extension-underline`·`@tiptap/extension-link`는 현재 starter-kit
     전이 의존으로만 잡혀 있어 hoisting에 의존한다. 명시적 dependency로 승격한다.

2. **표 셀 텍스트 투영(승인).** `docToText`/`docToPreview`가 표 셀을 뭉개지 않도록
   `nodeText`에 **표 타입 특례**만 추가한다:
   - `tableRow`: 자식 셀 텍스트를 **공백**(" ")으로 join
   - `table`: 자식 행 텍스트를 **줄바꿈**("\n")으로 join
   - 그 외 모든 타입: 현행 재귀(`content.map(nodeText).join("")`) 유지
   - 결과: 3×2 표 → `"이름 역할\n감 PM\n을 디자인"`. 카드 미리보기(첫 블록)는
     표가 첫 블록이면 첫 행 `"이름 역할"`.
   - 불변식 `docToText(content_doc) === content`는 `buildEditPatch`가 같은 함수로
     `content`를 기록하므로 그대로 성립. `textToDoc`은 표를 만들지 않으므로 표의
     왕복 가역성은 계약 대상이 아니다(플레인 텍스트→표 역변환 없음, 명시).

3. **색 팔레트: 컨플루언스식 넓게(승인).** 글자색·배경색 각각 8종. DESIGN.md
   §1.1.6에 신설, 라이트/다크 2값, 대비 검증. 구성:
   - **글자색(8)**: 기본(상속) · 회색 · 빨강 · 주황 · 노랑 · 초록 · 파랑 · 보라
   - **배경색/형광펜(8)**: 없음 · 회색 · 빨강 · 주황 · 노랑 · 초록 · 파랑 · 보라(연한 배경)
   - 씨앗 재사용: 기존 원시 hue(`--red-500 #f0483e`, `--amber-500 #f5a623`,
     `--gold-500 #ffbd18`, `--green-500 #2eb872`, `--blue-500`)를 기준으로 글자용
     (진한 색조)·배경용(연한 색조) 변형을 파생. 회색은 gray 램프, 보라는 신설.
     노랑 글자색은 흰 배경 가독성 위해 진한 겨자색조로 조정한다(대비 검증).
   - 저장: Color/Highlight는 마크 attribute로 `content_doc`에 인라인 저장(스키마
     변경 없음). 색 값은 **CSS 변수 참조 문자열이 아니라 실제 hex**를 저장한다 —
     Tiptap Color/Highlight가 인라인 style로 직렬화하기 때문. 팔레트 hex를 상수로
     고정해 토큰과 1:1 대응시킨다.

4. **표 조작 UI: 표 셀 플로팅 툴바(승인).** 표 셀에 커서가 있을 때 뜨는 작은
   플로팅 툴바 — 기존 `FormatToolbar`의 BubbleMenu 패턴을 재사용하고 `shouldShow`를
   "표 안일 때"로 둔다. 행 위/아래 삽입, 열 좌/우 삽입, 행 삭제, 열 삭제, 헤더 행
   토글, 셀 배경색. Tab 셀 이동은 확장 기본 제공. 상단 툴바(②)의 "표"는 **삽입만**
   담당하고 조작은 이 플로팅 툴바가 맡는다.

5. **작업 방식: git 워크트리 병렬(승인).** 지난 스프린트와 같은 파일 소유권 매트릭스·
   DESIGN.md 섹션 사전배정·globals.css 접두사 분리·머지별 게이트. 실행 순서는 §5.

## 2. 파일 소유권 매트릭스 (충돌 원천 차단)

지난 스프린트의 "결합부(PostEditor.tsx `extensions` 배열) 불변, 소유 파일에 확장
추가" 규칙을 잇는다. 단 이번엔 결합부에 **표 노드 spread 한 줄 추가**가 불가피하다
(표는 기존 워크트리 소유 파일이 없다). 이 한 줄은 Phase 0에서 미리 넣어 자리를
확보하고, 이후 워크트리는 결합부를 건드리지 않는다.

| 영역 | 소유 파일 | globals.css 접두사 | DESIGN.md 섹션 |
|---|---|---|---|
| 표(①) + 표 플로팅 툴바 | `lib/editor/table-nodes.ts`(신규), `components/editor/TableToolbar.tsx`(신규), `blocks.ts`·`insert.ts`·`doc.ts` 편집 | `.tbl-*` | §2.15, §5.14 일부 |
| 색 서식(③ 색) | `lib/editor/marks.ts`(Color/Highlight/TextStyle 추가) | `.clr-*` | §1.1.6, §2.16 일부 |
| 정렬 서식(③ 정렬) | `lib/editor/nodes.ts`(TextAlign 추가) | `.align-*` | §5.14 일부 |
| 상단 툴바(②) | `components/editor/TopToolbar.tsx`(신규), 공용 훅 추출 | `.toptb-*` | §2.14 |

**공용 훅 추출**: 상단 툴바와 플로팅 서식 툴바가 마크 활성상태·토글 로직을 공유하도록
`FormatToolbar`의 `useEditorState` selector와 `MARK_ACTIONS`를 공용 훅
(`lib/editor/useFormatState.ts` 등)으로 뽑아 양쪽이 소비한다(중복 최소화).

## 3. 표 상세 설계 (①)

- **노드**: `lib/editor/table-nodes.ts`에 `Table.configure({ resizable: true })` +
  `TableRow` + `TableHeader` + `TableCell`을 배열로 export(`TABLE_NODES`).
  `PostEditor.tsx` 결합부에 `...TABLE_NODES` spread(Phase 0에서 추가).
- **레지스트리**: `blocks.ts`에 `{ id: "table", type: "table", label: "표",
  keywords: ["표", "table", "그리드", "grid"] }` 추가 + `__tests__/editor-blocks.test.ts`
  **같은 커밋 갱신**(계약 파일).
- **삽입**: `insert.ts` `switch`에 `case "table"` 추가 →
  `editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()`.
  기존 `default`(`insertContent`)로는 유효 행/셀 구조가 안 만들어진다.
- **아이콘**: `SlashMenu.tsx` `BLOCK_ICONS`에 `table: Table`(lucide) 매핑.
- **CSS `.tbl-*`**(globals.css 파일 끝): 셀 border(`--border-default`), 헤더 배경
  (`--surface-subtle`), 선택 셀 하이라이트, 리사이즈 핸들, `table-layout: fixed`.
  DESIGN.md 토큰만 사용.
- **표 플로팅 툴바**: `TableToolbar.tsx`(§1.4 결정). 커맨드 매핑 —
  `addRowBefore`/`addRowAfter`/`addColumnBefore`/`addColumnAfter`/`deleteRow`/
  `deleteColumn`/`toggleHeaderRow`/`setCellAttribute("backgroundColor", …)`.

## 4. 상단 툴바 상세 설계 (②)

- **구조**: `components/editor/TopToolbar.tsx`, `<EditorContent>`의 **형제**로 렌더
  (순수 React 컴포넌트 — BubbleMenu/Suggestion 같은 플러그인 아님 → 플러그인 충돌
  없음). `.detail-content` 위에 `position: sticky; top: 0`(스크롤 컨테이너는
  `.app-main`). z-index는 핸들(20)·슬래시(30)보다 낮게 잡아 겹칠 때 메뉴가 위로.
- **구성(요청 순서)**: 텍스트 스타일 드롭다운(카드 팝오버 관례) · B·I·U·S(마크 토글) ·
  글자색·배경색 팝오버(`.clr-*`) · 정렬 3버튼 · 목록 3버튼 · 링크(기존 `applyLink`) ·
  이미지(기존 `openAttachmentPicker`) · 표 삽입(`insertTable`) · undo/redo.
- **공존**: 플로팅 서식 툴바(선택 시)·슬래시(`/`)·드래그 핸들(hover)은 그대로 유지.
  상단은 항상 보이는 항구적 진입점, 플로팅은 선택 컨텍스트. 기능 중복은 공용 훅으로
  로직을 공유해 흡수한다(§2).

## 5. 실행 순서·머지 순서

지난 스프린트 조직(파일 소유권·섹션 사전배정·접두사 분리·머지별 게이트) 계승.

```
Phase 0 (순차, 메인): 의존성 설치 + MIT 실측 + 결합부에 ...TABLE_NODES 자리 확보
                      + 공용 훅(useFormatState) 추출 + main 푸시(워크트리 기준점)
   ↓
Phase T (순차, 단일): 표 전부 — table-nodes·blocks·insert·doc.ts 투영·TableToolbar·
                      .tbl-* CSS·테스트. nodes.ts를 선점 확정(정렬과의 순서 보장).
   ↓
Phase F (병렬 2워크트리): wt-color = marks.ts(Color/Highlight/TextStyle) + 색 팝오버
                         wt-align = nodes.ts(TextAlign) + .align-* CSS
   ↓ (머지: wt-align → wt-color, 또는 역순 — 파일 소유가 갈려 무관)
Phase B (순차, 머지 후): 상단 툴바 — 표·색·정렬 커맨드를 모두 소비하므로 마지막.
```

각 Phase 끝 `npm test && npm run build` 게이트. 스킬 3종(supabase-verify·
design-md-sync·commit-hygiene) 전 과정 준수. 이번 스프린트는 Supabase 스키마 변경이
없으므로(표·색·정렬 전부 `content_doc` JSON 인라인) supabase-verify는 "스키마 변경
없음 확인" 용도로만 적용.

## 6. DESIGN.md 섹션 계획 (사전 배정 — 선점 충돌 방지)

| 번호 | 내용 | 담당 Phase |
|---|---|---|
| §1.1.6 | 색 팔레트(글자색·배경색) 토큰 | Phase F(wt-color) |
| §2.14 | 상단 고정 툴바 | Phase B |
| §2.15 | 표(셀·헤더·리사이즈·플로팅 툴바) | Phase T |
| §2.16 | 글자색·배경색 팝오버 | Phase F(wt-color) |
| §4.3.1 | 블록 카탈로그에 "표" 항목 추가 | Phase T |
| §5.14 | 표·서식·툴바 편집 동작 | 각 Phase 해당분 |
| §6.10 | 표·툴바·색 카피 인벤토리 | Phase B |

- **"상단 고정 툴바 없음" 서술 2곳 갱신**(이번 스프린트가 뒤집음):
  `docs/superpowers/specs/2026-07-21-editor-sprint-overview.md:3`(과거 결정 — 이번
  스프린트가 대체함을 각주로 표기), `DESIGN.md:699`(§2.10 FormatToolbar 용도 서술).
- globals.css는 **파일 끝** 추가(접두사 `.tbl-*`·`.toptb-*`·`.clr-*`·`.align-*`)로
  기존 52개 줄번호 참조 불변. 목차는 최상위 챕터만 나열하므로 수정 불필요.
- 카드 팝오버 관례(`--surface-card`/`--border-subtle`/`--radius-lg`/`--shadow-lg`/
  `mnPop 0.14s`/reduced-motion none) 재사용 — 드롭다운·색 팝오버에 동일 적용.

## 7. 테스트 전략 (기존 3분할 관례 계승)

`__tests__/PostEditor.test.tsx:7-9`의 "jsdom에서 ProseMirror 타이핑 시뮬레이션은
신뢰 불가" 원칙에 따라 3분할:

1. **헤드리스 커맨드**(`editor-*.test.ts`): `new Editor({element, extensions})`로
   `insertTable`·행열 조작 커맨드·`setColor`·`toggleHighlight`·`setTextAlign` 실행 후
   `isActive`/`getAttributes`/`getHTML` 검증.
2. **doc.ts 단위**(`editor-doc-blocks.test.ts` 확장): 표 투영(셀=공백·행=줄바꿈),
   미리보기 첫 행, 불변식 `docToText(content_doc)===content` 유지.
3. **계약**(`editor-blocks.test.ts`): 표 등재.
4. **컴포넌트 렌더/aria**: `TopToolbar`·`TableToolbar` 버튼 존재·aria·팝오버 열림
   (타이핑 아닌 마운트·클릭 검증).
5. **dual-write 관통**(`store.test.tsx`): 표 포함 문서 저장 페이로드.
6. **회귀**: 현재 기준선 472 테스트/빌드 그린 유지.

## 8. 리스크·완화

- **표 리사이즈 + `output: export` 정적 빌드 호환** — Table resizable은 클라이언트
  플러그인이라 SSR 영향 없음. Phase 0 빌드 게이트로 조기 확인.
- **색 인라인 style CSP** — Tiptap Color/Highlight는 `style="color:…"` 인라인.
  현 앱은 아티팩트 CSP 대상이 아니므로 무관하나, 값은 팔레트 hex 상수로 고정해
  임의 색 입력을 막는다(팝오버 스와치만 노출).
- **표 셀 안의 블록** — 표 셀은 문단만 허용(`content: "paragraph+"`)해 셀 안 표
  중첩·블록 폭주를 막는다. 셀 안 텍스트 서식(마크)은 허용.
- **상단 툴바 sticky와 `.detail-charcount`(bottom sticky) 공존** — top/bottom이라
  직접 충돌 없음. 같은 스크롤 컨테이너 공유만 확인.
