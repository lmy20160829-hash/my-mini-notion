# 기본 문서 작업 스프린트 구현 계획 — 표·상단 툴바·색/정렬 서식

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 문서 안 인라인 표(Tiptap Table), 상단 고정 툴바, 글자색·배경색·정렬 서식을 미니 노션 에디터에 추가한다.

**Architecture:** 기존 "결합부(PostEditor `extensions`) 불변, 소유 파일에 확장 추가, UI는 EditorContent 형제" 규칙을 잇는다. 표·색·정렬은 전부 `content_doc` JSON에 인라인 저장(스키마 변경 없음). `docToText` 재귀에 표 특례만 더해 검색·미리보기 품질을 지킨다. 상단 툴바는 순수 React 컴포넌트로 형제 추가하고, 플로팅 서식 툴바와 활성상태 로직을 공용 훅으로 공유한다.

**Tech Stack:** Next.js(사설 포크), Tiptap v3.28.0, React 19, TypeScript, Vitest + @testing-library/react(jsdom), Supabase(page.content_doc jsonb).

## Global Constraints

- **엔진**: Tiptap v3.28.0. 신규 확장은 설치 후 `npm view <pkg> license`로 MIT 실측.
- **결합부 불변**: `components/editor/PostEditor.tsx`의 `extensions` 배열은 Phase 0에서 `...TABLE_NODES` 한 줄 추가 후 동결. 이후 워크트리는 소유 파일(`marks.ts`/`nodes.ts`/`table-nodes.ts`)에만 확장 추가.
- **계약 파일 동시 갱신**: `lib/editor/blocks.ts` 변경은 `__tests__/editor-blocks.test.ts`와 **같은 커밋**.
- **dual-write 불변식**: `docToText(content_doc) === content`. `buildEditPatch`가 항상 함께 기록.
- **표 셀 투영**: `tableRow`=셀을 공백으로, `table`=행을 줄바꿈으로, 그 외 현행 재귀.
- **표 셀 content**: `"(paragraph | bulletList | orderedList | taskList)+"` — 문단·목록·마크만, 표 중첩·기타 블록 차단.
- **색 저장**: Color/Highlight는 인라인 hex 마크. 팔레트 hex를 상수로 고정(임의 색 차단).
- **globals.css**: 파일 **끝**에만 추가(접두사 `.tbl-*`·`.toptb-*`·`.clr-*`·`.align-*`) — 기존 52개 줄번호 참조 불변. reduced-motion에서 팝오버 `animation: none`.
- **텍스트 스타일 드롭다운 범위**: 일반/제목1·2·3/인용 한정(콜아웃·토글은 슬래시 담당).
- **커밋 메시지**: 한국어 + conventional prefix + `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- **검증 게이트**: 각 Phase 끝 `npm test && npm run build`. 현재 기준선 472 테스트 그린.

---

## Phase 0 — 준비 (메인 브랜치, 순차)

### Task 0.1: 의존성 설치 + MIT 실측

**Files:**
- Modify: `package.json` (dependencies)

- [ ] **Step 1: 확장 설치**

```bash
npm install @tiptap/extension-table@^3.28.0 @tiptap/extension-table-row@^3.28.0 \
  @tiptap/extension-table-cell@^3.28.0 @tiptap/extension-table-header@^3.28.0 \
  @tiptap/extension-color@^3.28.0 @tiptap/extension-text-style@^3.28.0 \
  @tiptap/extension-highlight@^3.28.0 @tiptap/extension-text-align@^3.28.0 \
  @tiptap/extension-underline@^3.28.0 @tiptap/extension-link@^3.28.0
```

- [ ] **Step 2: MIT 라이선스 실측**

```bash
for p in extension-table extension-table-row extension-table-cell extension-table-header \
  extension-color extension-text-style extension-highlight extension-text-align \
  extension-underline extension-link; do
  echo "$p: $(node -p "require('@tiptap/$p/package.json').license")"
done
```
Expected: 전부 `MIT`. 하나라도 아니면 중단하고 사용자에게 보고.

- [ ] **Step 3: 빌드 확인 (설치가 기존 빌드를 깨지 않는지)**

Run: `npm run build`
Expected: 성공(기존과 동일한 라우트 출력).

- [ ] **Step 4: 커밋**

```bash
git add package.json package-lock.json
git commit -m "chore: 표·색·정렬 Tiptap 확장 설치 + underline/link 명시 승격 (전부 MIT 실측)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

### Task 0.2: 결합부 자리 확보 + 공용 서식 상태 훅 추출

빈 `TABLE_NODES` 배열을 만들어 결합부에 spread를 미리 넣고(Phase T가 채운다), 상단 툴바와 플로팅 툴바가 공유할 활성상태 훅을 `FormatToolbar`에서 뽑는다.

**Files:**
- Create: `lib/editor/table-nodes.ts`
- Create: `lib/editor/useFormatState.ts`
- Modify: `components/editor/PostEditor.tsx` (extensions 배열)
- Modify: `components/editor/FormatToolbar.tsx` (훅·MARK_ACTIONS를 공용 파일에서 import)
- Test: `__tests__/editor-table-nodes.test.ts`, `__tests__/useFormatState.test.tsx`

**Interfaces:**
- Produces: `export const TABLE_NODES: AnyExtension[]` (Phase 0에서 `[]`, Phase T가 채움)
- Produces: `export const MARK_ACTIONS: MarkAction[]` (marks 5종, 공용)
- Produces: `export function useFormatState(editor): { bold, italic, underline, strike, code, link, textAlign, isInTable, ... }`

- [ ] **Step 1: 빈 TABLE_NODES 테스트**

```ts
// __tests__/editor-table-nodes.test.ts
import { describe, expect, test } from "vitest";
import { TABLE_NODES } from "@/lib/editor/table-nodes";

describe("TABLE_NODES", () => {
  test("배열을 export한다 (Phase 0: 빈 상태)", () => {
    expect(Array.isArray(TABLE_NODES)).toBe(true);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run __tests__/editor-table-nodes.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: 빈 소유 파일 생성**

```ts
// lib/editor/table-nodes.ts
import type { AnyExtension } from "@tiptap/react";

/**
 * 표 노드 확장 — **Phase T 전용 소유 파일**. Phase 0은 결합부에 자리만 확보하려고
 * 빈 배열을 export한다. Phase T가 Table/TableRow/TableHeader/TableCell을 채운다.
 */
export const TABLE_NODES: AnyExtension[] = [];
```

- [ ] **Step 4: 결합부에 spread 추가**

`PostEditor.tsx`의 import에 `import { TABLE_NODES } from "@/lib/editor/table-nodes";` 추가, extensions 배열 `...MEDIA_NODES,` 다음에 `...TABLE_NODES,` 추가.

- [ ] **Step 5: 공용 훅·MARK_ACTIONS 추출 테스트**

```tsx
// __tests__/useFormatState.test.tsx
import { describe, expect, test } from "vitest";
import { MARK_ACTIONS } from "@/lib/editor/useFormatState";

describe("MARK_ACTIONS", () => {
  test("마크 5종(bold/italic/underline/strike/code)을 순서대로 담는다", () => {
    expect(MARK_ACTIONS.map((a) => a.name)).toEqual([
      "bold", "italic", "underline", "strike", "code",
    ]);
  });
});
```

- [ ] **Step 6: 실패 확인 → 공용 파일 생성**

`FormatToolbar.tsx`의 `MarkAction` 타입·`MARK_ACTIONS` 배열·`useEditorState` selector를 `lib/editor/useFormatState.ts`로 옮긴다:

```tsx
// lib/editor/useFormatState.ts
"use client";
import { useEditorState, type Editor } from "@tiptap/react";
import { Bold, Code, Italic, Strikethrough, Underline, type LucideIcon } from "lucide-react";

export type MarkAction = {
  name: string;
  title: string;
  icon: LucideIcon;
  run: (editor: Editor) => void;
};

export const MARK_ACTIONS: MarkAction[] = [
  { name: "bold", title: "굵게", icon: Bold, run: (e) => e.chain().focus().toggleBold().run() },
  { name: "italic", title: "기울임", icon: Italic, run: (e) => e.chain().focus().toggleItalic().run() },
  { name: "underline", title: "밑줄", icon: Underline, run: (e) => e.chain().focus().toggleUnderline().run() },
  { name: "strike", title: "취소선", icon: Strikethrough, run: (e) => e.chain().focus().toggleStrike().run() },
  { name: "code", title: "코드", icon: Code, run: (e) => e.chain().focus().toggleCode().run() },
];

/** 상단 툴바·플로팅 툴바가 공유하는 활성상태 selector. */
export function useFormatState(editor: Editor) {
  return useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      strike: e.isActive("strike"),
      code: e.isActive("code"),
      link: e.isActive("link"),
      align:
        (["left", "center", "right"] as const).find((a) => e.isActive({ textAlign: a })) ??
        "left",
      isInTable: e.isActive("table"),
    }),
  });
}
```

`FormatToolbar.tsx`는 `MARK_ACTIONS`를 이 파일에서 import하고, `active`를 `useFormatState(editor)`로 교체(기존 필드 이름 동일하므로 렌더 코드 무변경).

- [ ] **Step 7: 전체 검증 + 커밋**

```bash
npx vitest run __tests__/editor-table-nodes.test.ts __tests__/useFormatState.test.tsx __tests__/FormatToolbar.test.tsx
npm run build
git add lib/editor/table-nodes.ts lib/editor/useFormatState.ts components/editor/PostEditor.tsx components/editor/FormatToolbar.tsx __tests__/editor-table-nodes.test.ts __tests__/useFormatState.test.tsx
git commit -m "refactor: 표 노드 자리 확보 + 서식 상태 훅 공용화(useFormatState)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

- [ ] **Step 8: 워크트리 기준점 push**

```bash
git push origin 004-supabase-google-login
git branch -f main HEAD && git push origin main
```
(스펙 정정 커밋 `docs: …목록 허용`도 이때 함께 나간다.)

---

## Phase T — 표 (단일 워크트리 `wt-table`, 순차)

`superpowers:using-git-worktrees`로 `wt-table` 생성 후 진행.

### Task T1: 표 노드 정의 (셀 content 제한 포함)

**Files:**
- Modify: `lib/editor/table-nodes.ts`
- Test: `__tests__/editor-table-nodes.test.ts`

**Interfaces:**
- Produces: `TABLE_NODES`에 Table/TableRow/TableHeader/TableCell 4종. `insertTable`·`addRowAfter` 등 커맨드가 에디터에 등록됨.

- [ ] **Step 1: 헤드리스 커맨드 테스트**

```ts
// __tests__/editor-table-nodes.test.ts — describe 추가
import { Editor } from "@tiptap/core";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import BulletList from "@tiptap/extension-bullet-list";
import ListItem from "@tiptap/extension-list-item";

function makeEditor() {
  return new Editor({
    element: document.createElement("div"),
    extensions: [Document, Paragraph, Text, BulletList, ListItem, ...TABLE_NODES],
  });
}

describe("표 노드", () => {
  test("insertTable로 헤더 행 포함 3×3 표를 만든다", () => {
    const e = makeEditor();
    e.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    const html = e.getHTML();
    expect(html).toContain("<table");
    expect(html).toContain("<th");
    e.destroy();
  });

  test("셀 안에 목록을 넣을 수 있다(문단+목록 허용)", () => {
    const e = makeEditor();
    e.chain().focus().insertTable({ rows: 1, cols: 1, withHeaderRow: false }).run();
    const ok = e.chain().focus().toggleList("bulletList", "listItem").run();
    expect(ok).toBe(true);
    e.destroy();
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run __tests__/editor-table-nodes.test.ts`
Expected: FAIL — `insertTable` 없음.

- [ ] **Step 3: 노드 구현**

```ts
// lib/editor/table-nodes.ts (교체)
import type { AnyExtension } from "@tiptap/react";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";

/** 셀 허용 content — 문단·목록 3종만(표 중첩·기타 블록 차단, 스펙 §3·§8). */
const CELL_CONTENT = "(paragraph | bulletList | orderedList | taskList)+";

export const TABLE_NODES: AnyExtension[] = [
  Table.configure({ resizable: true, HTMLAttributes: { class: "tbl" } }),
  TableRow,
  TableHeader.extend({ content: CELL_CONTENT }).configure({
    HTMLAttributes: { class: "tbl-th" },
  }),
  TableCell.extend({ content: CELL_CONTENT }).configure({
    HTMLAttributes: { class: "tbl-td" },
  }),
];
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run __tests__/editor-table-nodes.test.ts`
Expected: PASS.

- [ ] **Step 5: 커밋**

```bash
git add lib/editor/table-nodes.ts __tests__/editor-table-nodes.test.ts
git commit -m "feat: 표 노드 4종 등록 — 리사이즈·헤더 행·셀 content 제한(문단+목록)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

### Task T2: 레지스트리 등재 + 슬래시 삽입

**Files:**
- Modify: `lib/editor/blocks.ts`
- Modify: `lib/editor/insert.ts`
- Modify: `components/editor/SlashMenu.tsx` (BLOCK_ICONS)
- Test: `__tests__/editor-blocks.test.ts`, `__tests__/editor-insert.test.ts`

**Interfaces:**
- Consumes: `TABLE_NODES` (Task T1).
- Produces: `BLOCKS`에 `table` 항목. `insertBlock(editor, tableSpec)`가 3×3 헤더 표 삽입.

- [ ] **Step 1: 계약 테스트 갱신 (blocks)**

`__tests__/editor-blocks.test.ts`에서 `BLOCKS` 길이·id 목록 단언에 `table` 추가. 예:

```ts
test("표 블록이 레지스트리에 등재돼 있다", () => {
  const table = BLOCKS.find((b) => b.id === "table");
  expect(table).toBeDefined();
  expect(table!.type).toBe("table");
  expect(table!.keywords).toContain("표");
});
```

- [ ] **Step 2: 삽입 테스트 (insert)**

```ts
// __tests__/editor-insert.test.ts — 추가
test("표 spec 삽입 시 헤더 행 포함 표가 생긴다", () => {
  const e = makeEditorWithTable(); // Document/Paragraph/Text + TABLE_NODES
  const spec = BLOCKS.find((b) => b.id === "table")!;
  expect(insertBlock(e, spec)).toBe(true);
  expect(e.getHTML()).toContain("<table");
  e.destroy();
});
```

- [ ] **Step 3: 실패 확인**

Run: `npx vitest run __tests__/editor-blocks.test.ts __tests__/editor-insert.test.ts`
Expected: FAIL.

- [ ] **Step 4: 레지스트리 + 삽입 + 아이콘 구현**

`blocks.ts` `BLOCKS` 배열 끝에 추가:

```ts
{ id: "table", type: "table", label: "표", keywords: ["표", "table", "그리드", "grid"] },
```

`insert.ts` `switch`에 `default` 앞에 추가:

```ts
    case "table":
      return chain().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
```

`SlashMenu.tsx` `BLOCK_ICONS`에 `table: Table` 추가 + lucide `Table` import.

- [ ] **Step 5: 통과 확인 + 커밋**

```bash
npx vitest run __tests__/editor-blocks.test.ts __tests__/editor-insert.test.ts
git add lib/editor/blocks.ts lib/editor/insert.ts components/editor/SlashMenu.tsx __tests__/editor-blocks.test.ts __tests__/editor-insert.test.ts
git commit -m "feat: 슬래시 /표 — 레지스트리 등재 + 3×3 헤더 표 삽입 결선

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

### Task T3: docToText/docToPreview 표 투영

**Files:**
- Modify: `lib/editor/doc.ts`
- Test: `__tests__/editor-doc-blocks.test.ts`

**Interfaces:**
- Consumes: `EditorNode` 타입.
- Produces: `docToText`/`docToPreview`가 표를 "셀=공백, 행=줄바꿈"으로 투영.

- [ ] **Step 1: 투영 테스트**

```ts
// __tests__/editor-doc-blocks.test.ts — 추가
import { docToText, docToPreview } from "@/lib/editor/doc";

const tableDoc = {
  type: "doc" as const,
  content: [
    {
      type: "table",
      content: [
        { type: "tableRow", content: [
          { type: "tableHeader", content: [{ type: "paragraph", content: [{ type: "text", text: "이름" }] }] },
          { type: "tableHeader", content: [{ type: "paragraph", content: [{ type: "text", text: "역할" }] }] },
        ] },
        { type: "tableRow", content: [
          { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "감" }] }] },
          { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "PM" }] }] },
        ] },
      ],
    },
  ],
};

test("표는 셀=공백·행=줄바꿈으로 투영된다", () => {
  expect(docToText(tableDoc)).toBe("이름 역할\n감 PM");
});

test("미리보기는 표 첫 행만 보여준다", () => {
  expect(docToPreview(tableDoc)).toBe("이름 역할");
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run __tests__/editor-doc-blocks.test.ts`
Expected: FAIL — 현재 `"이름역할감PM"`(구분자 없음).

- [ ] **Step 3: nodeText에 표 특례 추가**

`lib/editor/doc.ts`의 `nodeText`를 교체:

```ts
function nodeText(node: EditorNode): string {
  if (node.type === "text") return node.text ?? "";
  const children = node.content ?? [];
  // 표 특례: 행은 셀을 공백으로, 표는 행을 줄바꿈으로 잇는다(검색·미리보기 품질).
  if (node.type === "tableRow") return children.map(nodeText).join(" ");
  if (node.type === "table") return children.map(nodeText).join("\n");
  return children.map(nodeText).join("");
}
```

- [ ] **Step 4: 통과 + 기존 doc 테스트 회귀 확인**

Run: `npx vitest run __tests__/editor-doc-blocks.test.ts __tests__/editor-doc.test.ts __tests__/editor-doc-preview.test.ts`
Expected: PASS(전부).

- [ ] **Step 5: 커밋**

```bash
git add lib/editor/doc.ts __tests__/editor-doc-blocks.test.ts
git commit -m "feat: docToText/docToPreview 표 투영 — 셀=공백·행=줄바꿈

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

### Task T4: 표 셀 플로팅 툴바

**Files:**
- Create: `components/editor/TableToolbar.tsx`
- Modify: `components/editor/PostEditor.tsx` (EditorContent 형제로 추가)
- Test: `__tests__/TableToolbar.test.tsx`

**Interfaces:**
- Consumes: `useFormatState`의 `isInTable` (또는 `editor.isActive("table")`).
- Produces: `<TableToolbar editor={editor} />` — 표 안일 때만 뜨는 BubbleMenu.

- [ ] **Step 1: 렌더 테스트 (내용 컴포넌트 단독)**

```tsx
// __tests__/TableToolbar.test.tsx
import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { Editor } from "@tiptap/core";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import { TABLE_NODES } from "@/lib/editor/table-nodes";
import { TableToolbarContent } from "@/components/editor/TableToolbar";

afterEach(cleanup);

function makeEditor() {
  const e = new Editor({ element: document.createElement("div"),
    extensions: [Document, Paragraph, Text, ...TABLE_NODES] });
  e.chain().focus().insertTable({ rows: 2, cols: 2, withHeaderRow: true }).run();
  return e;
}

test("행/열 삽입·삭제·헤더 토글 버튼을 렌더한다", () => {
  const e = makeEditor();
  render(<TableToolbarContent editor={e} />);
  expect(screen.getByLabelText("행 위 삽입")).toBeDefined();
  expect(screen.getByLabelText("열 삭제")).toBeDefined();
  expect(screen.getByLabelText("헤더 행 토글")).toBeDefined();
  e.destroy();
});

test("행 삭제 버튼 클릭이 deleteRow 커맨드를 부른다", () => {
  const e = makeEditor();
  const spy = vi.spyOn(e.commands, "deleteRow");
  render(<TableToolbarContent editor={e} />);
  screen.getByLabelText("행 삭제").click();
  expect(spy).toHaveBeenCalled();
  e.destroy();
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run __tests__/TableToolbar.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: 구현**

```tsx
// components/editor/TableToolbar.tsx
"use client";
import type { EditorState } from "@tiptap/pm/state";
import { BubbleMenu } from "@tiptap/react/menus";
import type { Editor } from "@tiptap/react";
import {
  ArrowUpToLine, ArrowDownToLine, ArrowLeftToLine, ArrowRightToLine,
  Rows3, Columns3, Heading, type LucideIcon,
} from "lucide-react";

type TableAction = { title: string; icon: LucideIcon; run: (e: Editor) => void };

const ACTIONS: TableAction[] = [
  { title: "행 위 삽입", icon: ArrowUpToLine, run: (e) => e.chain().focus().addRowBefore().run() },
  { title: "행 아래 삽입", icon: ArrowDownToLine, run: (e) => e.chain().focus().addRowAfter().run() },
  { title: "열 왼쪽 삽입", icon: ArrowLeftToLine, run: (e) => e.chain().focus().addColumnBefore().run() },
  { title: "열 오른쪽 삽입", icon: ArrowRightToLine, run: (e) => e.chain().focus().addColumnAfter().run() },
  { title: "행 삭제", icon: Rows3, run: (e) => e.chain().focus().deleteRow().run() },
  { title: "열 삭제", icon: Columns3, run: (e) => e.chain().focus().deleteColumn().run() },
  { title: "헤더 행 토글", icon: Heading, run: (e) => e.chain().focus().toggleHeaderRow().run() },
];

export function TableToolbarContent({ editor }: { editor: Editor }) {
  return (
    <div className="tbl-toolbar" role="toolbar" aria-label="표 편집">
      {ACTIONS.map(({ title, icon: Icon, run }) => (
        <button key={title} type="button" className="icon-btn" title={title} aria-label={title}
          onMouseDown={(e) => e.preventDefault()} onClick={() => run(editor)}>
          <Icon size={16} />
        </button>
      ))}
    </div>
  );
}

/** 표 셀에 커서가 있을 때만 뜨는 플로팅 툴바. */
export function TableToolbar({ editor }: { editor: Editor | null }) {
  if (!editor) return null;
  const shouldShow = ({ editor: e }: { editor: Editor; state: EditorState }) =>
    e.isEditable && e.isActive("table");
  return (
    <BubbleMenu editor={editor} pluginKey="tblBar" shouldShow={shouldShow}
      options={{ placement: "top", offset: 8 }}>
      <TableToolbarContent editor={editor} />
    </BubbleMenu>
  );
}
```

`PostEditor.tsx` 반환 JSX에 `<TableToolbar editor={editor} />`를 `<FormatToolbar>` 다음에 추가.

- [ ] **Step 4: 통과 + 커밋**

```bash
npx vitest run __tests__/TableToolbar.test.tsx
git add components/editor/TableToolbar.tsx components/editor/PostEditor.tsx __tests__/TableToolbar.test.tsx
git commit -m "feat: 표 셀 플로팅 툴바 — 행/열 삽입·삭제·헤더 토글

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

### Task T5: 표 CSS + DESIGN.md §2.15·§4.3.1

**Files:**
- Modify: `app/globals.css` (파일 끝 `.tbl-*`)
- Modify: `DESIGN.md`
- Test: 시각(dev 육안) + `npm run build`

- [ ] **Step 1: CSS 추가 (globals.css 파일 끝)**

`design-md-sync` 스킬로 DESIGN.md 먼저 읽고, 파일 끝에 배너와 함께:

```css
/* ---------- 표 (①, §2.15) ---------- */
.tbl { border-collapse: collapse; table-layout: fixed; width: 100%; margin: 12px 0; overflow: hidden; }
.tbl td, .tbl th { border: 1px solid var(--border-default); padding: 6px 10px; vertical-align: top; position: relative; }
.tbl th { background: var(--surface-subtle); font-weight: 600; text-align: left; }
.tbl .selectedCell::after { content: ""; position: absolute; inset: 0; background: var(--accent-soft); mix-blend-mode: multiply; pointer-events: none; }
.tbl .column-resize-handle { position: absolute; right: -2px; top: 0; bottom: 0; width: 4px; background: var(--accent); cursor: col-resize; }
/* 표 셀 플로팅 툴바 — 카드 팝오버 관례(§2.10 .fmt-bar와 동일) */
.tbl-toolbar { display: inline-flex; gap: 2px; padding: 4px; background: var(--surface-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); box-shadow: var(--shadow-lg); animation: mnPop 0.14s var(--ease-out); }
@media (prefers-reduced-motion: reduce) { .tbl-toolbar { animation: none; } }
```

- [ ] **Step 2: DESIGN.md §2.15 신설 + §4.3.1 표 항목**

§2.13 다음에 §2.15(표·셀·헤더·리사이즈·플로팅 툴바) 신설, §4.3.1 블록 카탈로그에 "표" 행 추가. 기존 항목 형식(용도/해부/크기/상태) 준수.

- [ ] **Step 3: 빌드 + dev 육안**

```bash
npm run build
npm run dev   # /posts/[id]에서 /표 삽입 → 3×3 헤더 표, 셀 클릭 시 플로팅 툴바, 리사이즈 확인
```

- [ ] **Step 4: 커밋 + Phase T 게이트**

```bash
npm test && npm run build
git add app/globals.css DESIGN.md
git commit -m "feat: 표 CSS + DESIGN.md §2.15·§4.3.1 — 셀·헤더·리사이즈·플로팅 툴바

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

- [ ] **Step 5: 머지 (wt-table → main)**

`superpowers:finishing-a-development-branch`로 main 병합 + push. 이후 Phase F 워크트리는 이 지점에서 분기.

---

## Phase F — 색·정렬 서식 (2 워크트리 병렬)

### 워크트리 wt-color: 글자색·배경색

#### Task C1: Color/Highlight/TextStyle 마크 등록

**Files:**
- Modify: `lib/editor/marks.ts`
- Test: `__tests__/editor-marks.test.ts`

**Interfaces:**
- Produces: `MARKS`에 TextStyle/Color/Highlight. `setColor(hex)`/`toggleHighlight({color})` 커맨드.

- [ ] **Step 1: 헤드리스 커맨드 테스트**

```ts
// __tests__/editor-marks.test.ts — 추가
test("setColor로 글자색 마크가 적용된다", () => {
  const e = makeEditorWithMarks(); // Document/Paragraph/Text + MARKS
  e.chain().focus().insertContent("가").selectAll().setColor("#f0483e").run();
  expect(e.getAttributes("textStyle").color).toBe("#f0483e");
  e.destroy();
});

test("toggleHighlight로 배경색 마크가 적용된다(multicolor)", () => {
  const e = makeEditorWithMarks();
  e.chain().focus().insertContent("가").selectAll().toggleHighlight({ color: "#fff6d6" }).run();
  expect(e.isActive("highlight", { color: "#fff6d6" })).toBe(true);
  e.destroy();
});
```

- [ ] **Step 2: 실패 확인 → 구현**

`marks.ts`에 import·등록 추가:

```ts
import TextStyle from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
// MARKS 배열에 추가:
  TextStyle,
  Color,
  Highlight.configure({ multicolor: true }),
```

- [ ] **Step 3: 통과 + 커밋**

```bash
npx vitest run __tests__/editor-marks.test.ts
git add lib/editor/marks.ts __tests__/editor-marks.test.ts
git commit -m "feat: 글자색·배경색 마크 등록 — Color/Highlight/TextStyle

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

#### Task C2: 색 팔레트 토큰 (DESIGN.md §1.1.6 + 상수)

**Files:**
- Create: `lib/editor/palette.ts`
- Modify: `app/globals.css` (파일 끝 `.clr-*` 참고용, 실제 색은 인라인 hex)
- Modify: `DESIGN.md` (§1.1.6)
- Test: `__tests__/palette.test.ts`

**Interfaces:**
- Produces: `TEXT_COLORS`, `HIGHLIGHT_COLORS` — `{ id, label, value }[]`. `value`는 hex(기본/없음은 `null`).

- [ ] **Step 1: 팔레트 상수 테스트**

```ts
// __tests__/palette.test.ts
import { TEXT_COLORS, HIGHLIGHT_COLORS } from "@/lib/editor/palette";

test("글자색 8종(기본 포함)", () => {
  expect(TEXT_COLORS).toHaveLength(8);
  expect(TEXT_COLORS[0].value).toBeNull(); // 기본 = 상속
});
test("배경색 8종(없음 포함)", () => {
  expect(HIGHLIGHT_COLORS).toHaveLength(8);
  expect(HIGHLIGHT_COLORS[0].value).toBeNull();
});
test("hex는 소문자 6자리 고정(임의 색 차단)", () => {
  [...TEXT_COLORS, ...HIGHLIGHT_COLORS].filter((c) => c.value).forEach((c) => {
    expect(c.value).toMatch(/^#[0-9a-f]{6}$/);
  });
});
```

- [ ] **Step 2: 실패 확인 → 팔레트 구현**

라이트/다크 양쪽 가독성을 고려한 중간 채도(인라인 hex는 테마 무관이므로). 값은 확정:

```ts
// lib/editor/palette.ts
export type Swatch = { id: string; label: string; value: string | null };

/** 글자색 8종 — 기본(상속) + 7색. 진한 색조(밝은/어두운 배경 모두 판독). */
export const TEXT_COLORS: Swatch[] = [
  { id: "default", label: "기본", value: null },
  { id: "gray", label: "회색", value: "#6b7280" },
  { id: "red", label: "빨강", value: "#e5484d" },
  { id: "orange", label: "주황", value: "#d97514" },
  { id: "yellow", label: "노랑", value: "#b8860b" },
  { id: "green", label: "초록", value: "#1f9d57" },
  { id: "blue", label: "파랑", value: "#2f6fed" },
  { id: "purple", label: "보라", value: "#8b5cf6" },
];

/** 배경색(형광펜) 8종 — 없음 + 7색. 연한 배경(양쪽 테마에서 텍스트 위 판독). */
export const HIGHLIGHT_COLORS: Swatch[] = [
  { id: "none", label: "없음", value: null },
  { id: "gray", label: "회색", value: "#e5e7eb" },
  { id: "red", label: "빨강", value: "#fbdcdb" },
  { id: "orange", label: "주황", value: "#fbe6cf" },
  { id: "yellow", label: "노랑", value: "#fbf1c7" },
  { id: "green", label: "초록", value: "#d5f0e0" },
  { id: "blue", label: "파랑", value: "#dbe8fd" },
  { id: "purple", label: "보라", value: "#e9e2fb" },
];
```

- [ ] **Step 3: DESIGN.md §1.1.6 신설**

§1.1.5(다크 재정의) 다음에 §1.1.6 색 팔레트 표(글자색·배경색 각 8종, id·label·hex). 인라인 hex 저장·다크모드 한계(테마 무관)를 서술.

- [ ] **Step 4: 통과 + 커밋**

```bash
npx vitest run __tests__/palette.test.ts
git add lib/editor/palette.ts DESIGN.md
git commit -m "feat: 색 팔레트 토큰 8+8 — 글자색·배경색 상수 + DESIGN.md §1.1.6

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

#### Task C3: 색 팝오버 컴포넌트

**Files:**
- Create: `components/editor/ColorPopover.tsx`
- Modify: `app/globals.css` (`.clr-*`)
- Test: `__tests__/ColorPopover.test.tsx`

**Interfaces:**
- Consumes: `TEXT_COLORS`/`HIGHLIGHT_COLORS`, editor.
- Produces: `<ColorPopover editor kind="text"|"highlight" />` — 스와치 그리드, 클릭 시 `setColor`/`toggleHighlight` 또는 unset.

- [ ] **Step 1: 렌더/동작 테스트**

```tsx
// __tests__/ColorPopover.test.tsx
import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { Editor } from "@tiptap/core";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import { MARKS } from "@/lib/editor/marks";
import { ColorPopover } from "@/components/editor/ColorPopover";

afterEach(cleanup);
const mk = () => new Editor({ element: document.createElement("div"),
  extensions: [Document, Paragraph, Text, ...MARKS] });

test("글자색 스와치 8개를 렌더한다", () => {
  const e = mk();
  render(<ColorPopover editor={e} kind="text" />);
  expect(screen.getAllByRole("button")).toHaveLength(8);
  e.destroy();
});

test("빨강 스와치 클릭이 setColor(#e5484d)를 부른다", () => {
  const e = mk();
  const spy = vi.spyOn(e.commands, "setColor");
  render(<ColorPopover editor={e} kind="text" />);
  screen.getByLabelText("빨강").click();
  expect(spy).toHaveBeenCalledWith("#e5484d");
  e.destroy();
});
```

- [ ] **Step 2: 실패 확인 → 구현**

```tsx
// components/editor/ColorPopover.tsx
"use client";
import type { Editor } from "@tiptap/react";
import { TEXT_COLORS, HIGHLIGHT_COLORS, type Swatch } from "@/lib/editor/palette";

export function ColorPopover({ editor, kind }: { editor: Editor; kind: "text" | "highlight" }) {
  const swatches = kind === "text" ? TEXT_COLORS : HIGHLIGHT_COLORS;
  const apply = (s: Swatch) => {
    const c = editor.chain().focus();
    if (kind === "text") {
      s.value ? c.setColor(s.value).run() : c.unsetColor().run();
    } else {
      s.value ? c.toggleHighlight({ color: s.value }).run() : c.unsetHighlight().run();
    }
  };
  return (
    <div className="clr-pop" role="listbox" aria-label={kind === "text" ? "글자색" : "배경색"}>
      {swatches.map((s) => (
        <button key={s.id} type="button" className="clr-swatch" title={s.label} aria-label={s.label}
          style={s.value ? { background: s.value } : undefined}
          onMouseDown={(e) => e.preventDefault()} onClick={() => apply(s)}>
          {!s.value && <span className="clr-swatch__none">✕</span>}
        </button>
      ))}
    </div>
  );
}
```

`.clr-*` CSS는 globals.css 파일 끝(카드 팝오버 관례 + 스와치 그리드 `repeat(4, 1fr)` 28px).

- [ ] **Step 3: 통과 + 커밋 + wt-color 머지 준비**

```bash
npx vitest run __tests__/ColorPopover.test.tsx
git add components/editor/ColorPopover.tsx app/globals.css __tests__/ColorPopover.test.tsx
git commit -m "feat: 색 팝오버 — 글자색·배경색 스와치 그리드(8종)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

### 워크트리 wt-align: 정렬

#### Task A1: TextAlign 등록

**Files:**
- Modify: `lib/editor/nodes.ts`
- Test: `__tests__/editor-nodes.test.ts`

**Interfaces:**
- Produces: `NODES`에 TextAlign. `setTextAlign('left'|'center'|'right')`가 heading/paragraph에 적용.

- [ ] **Step 1: 커맨드 테스트**

```ts
// __tests__/editor-nodes.test.ts — 추가
test("setTextAlign가 문단 정렬 attribute를 바꾼다", () => {
  const e = makeEditorWithNodes();
  e.chain().focus().insertContent("가").selectAll().setTextAlign("center").run();
  expect(e.isActive({ textAlign: "center" })).toBe(true);
  e.destroy();
});
```

- [ ] **Step 2: 실패 확인 → 구현**

`nodes.ts`에 추가:

```ts
import TextAlign from "@tiptap/extension-text-align";
// NODES 배열에 추가:
  TextAlign.configure({ types: ["heading", "paragraph"] }),
```

- [ ] **Step 3: 통과 + 커밋**

```bash
npx vitest run __tests__/editor-nodes.test.ts
git add lib/editor/nodes.ts __tests__/editor-nodes.test.ts
git commit -m "feat: 문단·제목 정렬 — TextAlign(좌/중/우) 등록

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

#### Task A2: 정렬 CSS + DESIGN.md

**Files:**
- Modify: `app/globals.css` (`.align-*` 불필요 — TextAlign은 인라인 `text-align` style; 대신 ProseMirror 기본 렌더 확인)
- Modify: `DESIGN.md` (§5.14 정렬 동작)

- [ ] **Step 1: 렌더 확인**

TextAlign은 `style="text-align:center"`를 인라인 부여하므로 별도 CSS 불필요. `.detail-content p, .detail-content h1..h3`가 `text-align`을 상속받는지 dev 육안 확인. 필요 시 `.detail-content [style*="text-align"]` 보정만.

- [ ] **Step 2: DESIGN.md §5.14 정렬 동작 서술 + 커밋**

```bash
git add DESIGN.md app/globals.css
git commit -m "docs: 정렬 동작 DESIGN.md §5.14 + 렌더 보정

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

### Phase F 머지

wt-align → main, wt-color → main(순서 무관, 파일 소유 분리). 각 머지 후 `npm test && npm run build`. 충돌 없음 예상(marks.ts vs nodes.ts).

---

## Phase B — 상단 고정 툴바 (메인, 순차, 머지 후)

### Task B1: 상단 툴바 조립

**Files:**
- Create: `components/editor/TopToolbar.tsx`
- Modify: `components/editor/PostEditor.tsx`
- Test: `__tests__/TopToolbar.test.tsx`

**Interfaces:**
- Consumes: `MARK_ACTIONS`·`useFormatState`(Task 0.2), `ColorPopover`(C3), `insertTable`(T1), `applyLink`(marks), `openAttachmentPicker`(media).
- Produces: `<TopToolbar editor={editor} />` — sticky 툴바 전체.

- [ ] **Step 1: 렌더/aria 테스트**

```tsx
// __tests__/TopToolbar.test.tsx
import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { Editor } from "@tiptap/core";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import { MARKS } from "@/lib/editor/marks";
import { NODES } from "@/lib/editor/nodes";
import { TABLE_NODES } from "@/lib/editor/table-nodes";
import { TopToolbarContent } from "@/components/editor/TopToolbar";

afterEach(cleanup);
const mk = () => new Editor({ element: document.createElement("div"),
  extensions: [Document, Paragraph, Text, ...MARKS, ...NODES, ...TABLE_NODES] });

test("툴바에 스타일 드롭다운·마크·정렬·표 버튼이 있다", () => {
  const e = mk();
  render(<TopToolbarContent editor={e} />);
  expect(screen.getByLabelText("텍스트 스타일")).toBeDefined();
  expect(screen.getByLabelText("굵게")).toBeDefined();
  expect(screen.getByLabelText("가운데 정렬")).toBeDefined();
  expect(screen.getByLabelText("표 삽입")).toBeDefined();
  expect(screen.getByLabelText("실행취소")).toBeDefined();
  e.destroy();
});

test("표 삽입 버튼이 insertTable을 부른다", () => {
  const e = mk();
  const spy = vi.spyOn(e.commands, "insertTable");
  render(<TopToolbarContent editor={e} />);
  screen.getByLabelText("표 삽입").click();
  expect(spy).toHaveBeenCalledWith({ rows: 3, cols: 3, withHeaderRow: true });
  e.destroy();
});
```

- [ ] **Step 2: 실패 확인 → 구현**

`TopToolbar.tsx`: 좌→우 순서로 텍스트 스타일 드롭다운(일반/제목1·2·3/인용 — `setParagraph`/`setNode("heading",{level})`/`toggleBlockquote`), `MARK_ACTIONS` 4종(B·I·U·S), 글자색·배경색 버튼(클릭 시 `ColorPopover` 토글), 정렬 3(`setTextAlign`), 목록 3(`toggleList`), 링크(`applyLink` 미니입력), 이미지(`openAttachmentPicker`), 표 삽입(`insertTable`), undo/redo(`editor.chain().focus().undo()/redo()`). 활성상태는 `useFormatState`. 각 버튼 `aria-label` 위 테스트대로. `TopToolbarContent`(내용)와 `TopToolbar`(sticky 래퍼) 분리 — FormatToolbar 패턴.

- [ ] **Step 3: 통과 + 커밋**

```bash
npx vitest run __tests__/TopToolbar.test.tsx
git add components/editor/TopToolbar.tsx __tests__/TopToolbar.test.tsx
git commit -m "feat: 상단 고정 툴바 — 스타일·마크·색·정렬·목록·링크·이미지·표·undo/redo

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

### Task B2: PostEditor 통합 + CSS + DESIGN.md §2.14

**Files:**
- Modify: `components/editor/PostEditor.tsx` (TopToolbar를 EditorContent 위 형제로)
- Modify: `app/globals.css` (`.toptb-*` sticky)
- Modify: `DESIGN.md` (§2.14, §2.10 "상단 툴바 없음" 서술 정정)
- Modify: `docs/superpowers/specs/2026-07-21-editor-sprint-overview.md:3` (각주)

- [ ] **Step 1: 통합 + CSS**

`PostEditor.tsx` 반환에서 `<TopToolbar editor={editor} />`를 `<EditorContent>` **위**에 배치. `.toptb-bar` CSS(globals.css 끝): `position: sticky; top: 0; z-index: 10; display:flex; gap:4px; padding:6px; background:var(--surface-page); border-bottom:1px solid var(--border-subtle);` — z-index는 핸들(20)·슬래시(30)보다 낮게. 드롭다운·색 팝오버는 카드 팝오버 관례.

- [ ] **Step 2: DESIGN.md 정정**

§2.14 상단 툴바 신설. §2.10 `DESIGN.md:699`의 "상단 고정 툴바 없음 — 스프린트 결정"을 "플로팅과 공존(상단 툴바는 2026-07-23 스프린트에서 추가, §2.14)"으로 정정. `2026-07-21-editor-sprint-overview.md:3`에 각주 "(상단 툴바 없음 결정은 2026-07-23 스프린트가 대체)".

- [ ] **Step 3: 빌드 + dev 육안 (플로팅·슬래시·핸들 공존 확인)**

```bash
npm run build
npm run dev  # 상단 툴바 상시 표시, 선택 시 플로팅도 뜸, / 슬래시, hover 핸들 모두 정상
```

- [ ] **Step 4: 커밋**

```bash
git add components/editor/PostEditor.tsx app/globals.css DESIGN.md docs/superpowers/specs/2026-07-21-editor-sprint-overview.md
git commit -m "feat: 상단 툴바 PostEditor 통합 + CSS + DESIGN.md §2.14 — 3종과 공존

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

### Task B3: 통합 검증 + dual-write 관통 + 최종 게이트

**Files:**
- Modify: `__tests__/store.test.tsx` (표 포함 문서 저장)
- Modify: `DESIGN.md` (§5.14 완결, §6.10 카피)

- [ ] **Step 1: dual-write 관통 테스트**

`store.test.tsx`에 표를 포함한 `content_doc`으로 `updatePost` 호출 시 `content`(투영)와 `content_doc`이 함께 저장되고 `docToText(content_doc)===content`가 성립하는지 검증 추가.

- [ ] **Step 2: 전체 테스트 + 빌드**

Run: `npm test && npm run build`
Expected: 전부 그린(기준선 472 + 신규 테스트).

- [ ] **Step 3: dev 육안 체크리스트**

`/posts/[id]`에서: 표 삽입(슬래시·툴바 양쪽)·행열 조작·Tab 이동·셀 안 목록·셀 배경·글자색·배경색·정렬·스타일 드롭다운·undo/redo·저장 후 새로고침 유지·카드 미리보기 표 첫 행.

- [ ] **Step 4: 커밋 + 스프린트 마감**

```bash
git add __tests__/store.test.tsx DESIGN.md
git commit -m "test/docs: 표 dual-write 관통 + §5.14·§6.10 마감

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push origin 004-supabase-google-login
git branch -f main HEAD && git push origin main
```

- [ ] **Step 5: BACKLOG·HANDOVER 갱신**

`docs/BACKLOG.md`에 비범위(셀 병합·@멘션·레이아웃·버전이력) 기록, `docs/HANDOVER.md` 스프린트 결과 갱신.

---

## Self-Review 결과

- **Spec coverage**: ①표(T1–T5)·②상단툴바(B1–B2)·③색(C1–C3)·정렬(A1–A2)·doc.ts투영(T3)·팔레트(C2)·DESIGN.md섹션(각 Task)·"상단툴바없음"정정(B2)·비범위기록(B3-5)·워크트리병렬(Phase F)·테스트3분할(전반) 모두 태스크 대응.
- **Placeholder scan**: 코드 스텝 전부 실제 코드. CSS는 대표 규칙+토큰 명시.
- **Type consistency**: `TABLE_NODES`(0.2→T1), `MARK_ACTIONS`/`useFormatState`(0.2→B1), `Swatch`/`TEXT_COLORS`/`HIGHLIGHT_COLORS`(C2→C3→B1), `insertTable({rows:3,cols:3,withHeaderRow:true})`(T2·B1 동일) 일관.
