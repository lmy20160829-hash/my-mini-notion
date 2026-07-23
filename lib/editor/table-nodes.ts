import type { AnyExtension } from "@tiptap/react";
// Tiptap v3: `@tiptap/extension-table`는 default export가 없다(Table/TableCell/
// TableHeader/TableRow를 모두 담은 패키지라 어느 것도 default로 지정하지 않음).
// named import로 가져온다. sub-패키지(-row/-header/-cell)는 각자 하나만 담고
// 있어 default export가 유지된다.
import { Table } from "@tiptap/extension-table";
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
