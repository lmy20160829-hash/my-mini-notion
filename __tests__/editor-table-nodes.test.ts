import { describe, expect, test } from "vitest";
import { Editor } from "@tiptap/core";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import BulletList from "@tiptap/extension-bullet-list";
import ListItem from "@tiptap/extension-list-item";
import OrderedList from "@tiptap/extension-ordered-list";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { TABLE_NODES, CELL_CONTENT } from "@/lib/editor/table-nodes";

describe("TABLE_NODES", () => {
  test("배열을 export한다 (Phase 0: 빈 상태)", () => {
    expect(Array.isArray(TABLE_NODES)).toBe(true);
  });
});

// CELL_CONTENT("(paragraph | bulletList | orderedList | taskList)+")가 참조하는
// 네 노드 타입이 전부 스키마에 있어야 한다 — 하나라도 빠지면 스키마 빌드 자체가
// 실패한다("No node type or group '...' found"). taskList는 taskItem을 요구한다.
function makeEditor() {
  return new Editor({
    element: document.createElement("div"),
    extensions: [
      Document,
      Paragraph,
      Text,
      BulletList,
      ListItem,
      OrderedList,
      TaskList,
      TaskItem,
      ...TABLE_NODES,
    ],
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

  // 회귀 방어: CELL_CONTENT가 약해지거나(예: "block+") 사라지면 이 단언이
  // 실패해야 한다 — 리뷰 지적사항(표 중첩 차단이 무방비 상태) 대응.
  test("셀·헤더 노드의 스키마 content가 CELL_CONTENT와 정확히 일치한다", () => {
    const e = makeEditor();
    expect(e.schema.nodes.tableCell.spec.content).toBe(CELL_CONTENT);
    expect(e.schema.nodes.tableHeader.spec.content).toBe(CELL_CONTENT);
    e.destroy();
  });

  test("셀 안에 표를 중첩할 수 없다(스키마 차원 차단)", () => {
    const e = makeEditor();
    // 1×1 표를 만들면 커서가 그 유일한 셀 안 문단으로 이동한다.
    e.chain().focus().insertTable({ rows: 1, cols: 1, withHeaderRow: false }).run();

    // 커서가 셀 안에 있는 상태에서 두 번째 표 삽입을 시도한다. 주의: 셀
    // content가 table을 거부하면 insertTable 커맨드는 (false를 반환하는 대신)
    // ProseMirror의 삽입 위치 탐색이 상위로 올라가 table을 받아줄 수 있는
    // 가장 가까운 조상(여기서는 doc)에 형제로 떨어뜨린다 — 그래서 `ok` 자체는
    // true가 나올 수 있다(실측 확인됨). 그래서 반환값이 아니라 "결과 문서
    // 어디에도 tableCell/tableHeader 아래에 table이 중첩되지 않았는가"를
    // 직접 검사한다 — 이것이 CELL_CONTENT가 실제로 지키는 불변식이다.
    e.chain().focus().insertTable({ rows: 1, cols: 1, withHeaderRow: false }).run();

    expect(hasNestedTable(e.getJSON())).toBe(false);

    // 스키마 자체도 tableCell content가 table을 매치하지 않음을 보장한다
    // (커맨드 구현이 바뀌어도 깨지지 않는 더 근본적인 단언).
    const tableNodeType = e.schema.nodes.table;
    const cellContentMatch = e.schema.nodes.tableCell.contentMatch;
    expect(cellContentMatch.matchType(tableNodeType)).toBeNull();

    e.destroy();
  });
});

/**
 * 문서 JSON을 순회해 tableCell/tableHeader 아래에 table 노드가 존재하는지
 * 검사한다. `CELL_CONTENT`가 "block+"처럼 약화되면(표 포함 모든 블록 허용)
 * insertTable이 커서가 있는 셀 안에 그대로 중첩 삽입하는 것을 실측으로 확인함
 * — 이 헬퍼가 그 회귀를 잡아낸다.
 */
function hasNestedTable(node: { type?: string; content?: unknown[] }): boolean {
  if (!node || typeof node !== "object") return false;
  const content = Array.isArray(node.content) ? node.content : [];
  if (node.type === "tableCell" || node.type === "tableHeader") {
    if (content.some((child) => (child as { type?: string })?.type === "table")) {
      return true;
    }
  }
  return content.some((child) => hasNestedTable(child as { type?: string; content?: unknown[] }));
}
