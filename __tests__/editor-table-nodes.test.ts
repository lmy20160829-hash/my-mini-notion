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
import { TABLE_NODES } from "@/lib/editor/table-nodes";

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
});
