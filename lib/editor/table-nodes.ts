import type { AnyExtension } from "@tiptap/react";
// Tiptap v3: `@tiptap/extension-table`는 default export가 없다(Table/TableCell/
// TableHeader/TableRow를 모두 담은 패키지라 어느 것도 default로 지정하지 않음).
// named import로 가져온다. sub-패키지(-row/-header/-cell)는 각자 하나만 담고
// 있어 default export가 유지된다.
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";

/**
 * 셀 허용 content — 문단·목록 3종만(표 중첩·기타 블록 차단, 스펙 §3·§8).
 * export하는 이유: 테스트가 이 상수를 그대로 참조해 스키마 content를 단언하면
 * (문자열을 테스트에 하드코딩 복제하지 않으므로) 문자열 drift 없이, 상수가
 * 약화되는 회귀를 그대로 잡아낸다.
 */
export const CELL_CONTENT = "(paragraph | bulletList | orderedList | taskList)+";

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
