import type { AnyExtension } from "@tiptap/react";
// Tiptap v3: `@tiptap/extension-table`는 default export가 없다(Table/TableCell/
// TableHeader/TableRow를 모두 담은 패키지라 어느 것도 default로 지정하지 않음).
// named import로 가져온다. sub-패키지(-row/-header/-cell)는 각자 하나만 담고
// 있어 default export가 유지된다.
import { Table, TableView } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { EditorView } from "@tiptap/pm/view";

/**
 * 화면에 그려지는 `<table>`에 `class="tbl"`을 보장하는 TableView.
 *
 * 왜 필요한가 — `resizable: true`면 Tiptap의 `addNodeView()`가 null을 반환하고
 * (`extension-table`: `if (isResizable || !View) return null`), 대신
 * prosemirror-tables의 `columnResizing`이 nodeView를 등록한다. 그런데 그쪽은
 * `new View(node, defaultCellMinWidth, view)`로 **HTMLAttributes(4번째 인자)를
 * 넘기지 않아** TableView의 기본값 `{}`가 쓰이고, `HTMLAttributes: { class: "tbl" }`
 * 설정이 라이브 DOM에서 통째로 유실된다. 직렬화(renderHTML)에는 그대로 붙기 때문에
 * `getHTML()`만 보는 테스트로는 잡히지 않는다(2026-07-27 격자 실종 버그).
 *
 * 4번째 인자를 받아 병합하므로 비resizable 경로(Tiptap이 직접 nodeView를 만들 때)의
 * 속성도 잃지 않는다.
 */
class TableViewWithAttributes extends TableView {
  constructor(
    node: ProseMirrorNode,
    cellMinWidth: number,
    view: EditorView,
    HTMLAttributes: Record<string, unknown> = {},
  ) {
    super(node, cellMinWidth, view, { class: "tbl", ...HTMLAttributes });
  }
}

/**
 * 셀 허용 content — 문단·목록 3종만(표 중첩·기타 블록 차단, 스펙 §3·§8).
 * export하는 이유: 테스트가 이 상수를 그대로 참조해 스키마 content를 단언하면
 * (문자열을 테스트에 하드코딩 복제하지 않으므로) 문자열 drift 없이, 상수가
 * 약화되는 회귀를 그대로 잡아낸다.
 */
export const CELL_CONTENT = "(paragraph | bulletList | orderedList | taskList)+";

export const TABLE_NODES: AnyExtension[] = [
  // HTMLAttributes는 직렬화(getHTML/저장본) 경로, View는 화면 렌더 경로를 각각 담당한다
  // — 둘 다 있어야 `.tbl` CSS가 에디터와 저장된 글 양쪽에서 살아있다.
  Table.configure({
    resizable: true,
    View: TableViewWithAttributes,
    HTMLAttributes: { class: "tbl" },
  }),
  TableRow,
  TableHeader.extend({ content: CELL_CONTENT }).configure({
    HTMLAttributes: { class: "tbl-th" },
  }),
  TableCell.extend({ content: CELL_CONTENT }).configure({
    HTMLAttributes: { class: "tbl-td" },
  }),
];
