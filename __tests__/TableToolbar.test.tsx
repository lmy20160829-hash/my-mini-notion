import { afterEach, expect, test } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
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
import { TableToolbarContent, TableToolbar } from "@/components/editor/TableToolbar";

// T4 표 셀 플로팅 툴바 — 렌더(버튼 7종)·클릭 동작 검증.
// jsdom에서 BubbleMenu 의 실제 플로팅 위치는 신뢰할 수 없으므로(레이아웃 없음),
// FormatToolbar와 같은 패턴으로 내용(TableToolbarContent)을 나눠 검증한다.

afterEach(cleanup);

// T1 실측 교훈: TABLE_NODES 의 셀 content 제한
// "(paragraph | bulletList | orderedList | taskList)+"가 참조하는 네 노드
// 타입이 스키마에 없으면 스키마 빌드 자체가 throw한다. 브리프 예시(Document/
// Paragraph/Text/...TABLE_NODES)만으로는 표 삽입이 안 되므로 목록 노드
// (BulletList/ListItem/OrderedList/TaskList/TaskItem)를 보강한다.
function makeEditor() {
  const e = new Editor({
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
  e.chain().focus().insertTable({ rows: 2, cols: 2, withHeaderRow: true }).run();
  return e;
}

test("행/열 삽입·삭제·헤더 토글 버튼을 렌더한다", () => {
  const e = makeEditor();
  render(<TableToolbarContent editor={e} />);
  expect(screen.getByLabelText("행 위 삽입")).toBeDefined();
  expect(screen.getByLabelText("행 아래 삽입")).toBeDefined();
  expect(screen.getByLabelText("열 왼쪽 삽입")).toBeDefined();
  expect(screen.getByLabelText("열 오른쪽 삽입")).toBeDefined();
  expect(screen.getByLabelText("행 삭제")).toBeDefined();
  expect(screen.getByLabelText("열 삭제")).toBeDefined();
  expect(screen.getByLabelText("헤더 행 토글")).toBeDefined();
  e.destroy();
});

// 주의(브리프 이탈, 실측 확인됨): 브리프 예시는 `vi.spyOn(e.commands, "deleteRow")`로
// 스파이 호출을 단언하지만, tiptap의 `Editor.commands`/`CommandManager.commands`는
// 접근할 때마다 Object.fromEntries로 새 객체를 만드는 게터라(CommandManager.ts
// get commands()) — 스파이가 심어진 스냅샷 객체는 이후 어떤 `e.commands.X()`
// 호출과도 같은 참조가 아니다. 실측: 같은 시나리오를 chain()과 직접
// `e.commands.deleteRow()` 양쪽으로 시도해도 스파이 호출 횟수는 0으로 남는다
// (스파이 자체가 근본적으로 관측 불가능 — 구현을 어떻게 짜도 통과할 수 없음).
// 그래서 커맨드가 "불렸는지"가 아니라 "효과가 났는지"(행 수 감소)를 직접
// 검증한다 — editor-table-nodes.test.ts/editor-insert.test.ts와 같은 결/방식.
test("행 삭제 버튼 클릭이 표의 행을 실제로 지운다(deleteRow 결선)", () => {
  const e = makeEditor();
  const rowsBefore = (e.getHTML().match(/<tr/g) ?? []).length;
  expect(rowsBefore).toBe(2); // insertTable({rows:2}) = 헤더 1 + 데이터 1
  render(<TableToolbarContent editor={e} />);
  screen.getByLabelText("행 삭제").click();
  const rowsAfter = (e.getHTML().match(/<tr/g) ?? []).length;
  expect(rowsAfter).toBe(rowsBefore - 1);
  e.destroy();
});

test("TableToolbar: editor 가 null 이면 아무것도 렌더하지 않는다", () => {
  const { container } = render(<TableToolbar editor={null} />);
  expect(container.querySelector(".tbl-toolbar")).toBeNull();
});
