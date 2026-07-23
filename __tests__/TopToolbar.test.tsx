import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Editor } from "@tiptap/core";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import HardBreak from "@tiptap/extension-hard-break";
import { UndoRedo } from "@tiptap/extensions";
import { MARKS } from "@/lib/editor/marks";
import { NODES } from "@/lib/editor/nodes";
import { TABLE_NODES } from "@/lib/editor/table-nodes";
import { TopToolbarContent } from "@/components/editor/TopToolbar";

// B1 상단 고정 툴바 — 렌더/aria(브리프 원안) + 각 버튼군의 실제 동작(behavior check).
//
// 표 삽입 버튼 테스트는 브리프 원안이 `vi.spyOn(e.commands, "insertTable")`을 쓰지만
// (T4·C3 실측과 동일 원인) `editor.commands`는 접근할 때마다 새 객체를 만드는 게터라
// 스파이가 이후 체인 호출을 관측하지 못한다. 그래서 여기서는 클릭 후
// `editor.getHTML()`에 `<table`이 실제로 생기는지로 단언한다(과제 브리핑의 명시적 지침).

afterEach(cleanup);

const mk = () =>
  new Editor({
    element: document.createElement("div"),
    extensions: [Document, Paragraph, Text, ...MARKS, ...NODES, ...TABLE_NODES],
  });

/** undo/redo 검증 전용 — 실행취소 커맨드가 실제로 등록된 에디터. */
const mkWithHistory = () =>
  new Editor({
    element: document.createElement("div"),
    extensions: [
      Document,
      Paragraph,
      Text,
      HardBreak,
      UndoRedo,
      ...MARKS,
      ...NODES,
      ...TABLE_NODES,
    ],
  });

test("툴바에 스타일 드롭다운·마크·정렬·표·undo 버튼이 있다", () => {
  const e = mk();
  render(<TopToolbarContent editor={e} />);
  expect(screen.getByLabelText("텍스트 스타일")).toBeDefined();
  expect(screen.getByLabelText("굵게")).toBeDefined();
  expect(screen.getByLabelText("가운데 정렬")).toBeDefined();
  expect(screen.getByLabelText("표 삽입")).toBeDefined();
  expect(screen.getByLabelText("실행취소")).toBeDefined();
  e.destroy();
});

test("표 삽입 버튼을 클릭하면 실제로 표가 삽입된다", () => {
  const e = mk();
  render(<TopToolbarContent editor={e} />);
  fireEvent.click(screen.getByLabelText("표 삽입"));
  expect(e.getHTML()).toContain("<table");
  e.destroy();
});

test("텍스트 스타일 드롭다운에서 제목 1을 선택하면 heading level 1이 적용된다", () => {
  const e = mk();
  e.chain().focus().insertContent("문단").run();
  render(<TopToolbarContent editor={e} />);
  const select = screen.getByLabelText("텍스트 스타일") as HTMLSelectElement;
  fireEvent.change(select, { target: { value: "h1" } });
  expect(e.isActive("heading", { level: 1 })).toBe(true);
  e.destroy();
});

test("텍스트 스타일 드롭다운이 인용을 적용하고 현재 값을 반영한다", () => {
  const e = mk();
  e.chain().focus().insertContent("문단").run();
  render(<TopToolbarContent editor={e} />);
  const select = screen.getByLabelText("텍스트 스타일") as HTMLSelectElement;
  fireEvent.change(select, { target: { value: "blockquote" } });
  expect(e.isActive("blockquote")).toBe(true);
  expect(select.value).toBe("blockquote");
  e.destroy();
});

test("굵게 버튼 클릭이 실제로 bold를 토글한다", () => {
  const e = mk();
  e.chain().focus().insertContent("텍스트").selectAll().run();
  render(<TopToolbarContent editor={e} />);
  fireEvent.click(screen.getByLabelText("굵게"));
  expect(e.isActive("bold")).toBe(true);
  e.destroy();
});

test("코드 마크 버튼은 상단 툴바 범위에서 제외된다(플로팅 툴바 전용)", () => {
  const e = mk();
  render(<TopToolbarContent editor={e} />);
  expect(screen.queryByLabelText("코드")).toBeNull();
  e.destroy();
});

test("가운데 정렬 버튼 클릭이 실제로 정렬을 적용한다", () => {
  const e = mk();
  e.chain().focus().insertContent("텍스트").run();
  render(<TopToolbarContent editor={e} />);
  fireEvent.click(screen.getByLabelText("가운데 정렬"));
  expect(e.isActive({ textAlign: "center" })).toBe(true);
  e.destroy();
});

test("불릿 목록 버튼 클릭이 실제로 목록을 적용한다", () => {
  const e = mk();
  e.chain().focus().insertContent("항목").run();
  render(<TopToolbarContent editor={e} />);
  fireEvent.click(screen.getByLabelText("불릿 목록"));
  expect(e.isActive("bulletList")).toBe(true);
  e.destroy();
});

test("글자색 버튼 클릭으로 팝오버가 열리고 스와치 클릭이 실제로 색을 적용한 뒤 닫힌다", () => {
  const e = mk();
  e.chain().focus().insertContent("텍스트").selectAll().run();
  render(<TopToolbarContent editor={e} />);
  fireEvent.click(screen.getByLabelText("글자색"));
  fireEvent.click(screen.getByLabelText("빨강"));
  expect(e.getAttributes("textStyle").color).toBe("#e5484d");
  expect(screen.queryByLabelText("빨강")).toBeNull();
  e.destroy();
});

test("배경색 버튼 클릭으로 팝오버가 열리고 스와치 클릭이 실제로 배경색을 적용한다", () => {
  const e = mk();
  e.chain().focus().insertContent("텍스트").selectAll().run();
  render(<TopToolbarContent editor={e} />);
  fireEvent.click(screen.getByLabelText("배경색"));
  fireEvent.click(screen.getByLabelText("빨강"));
  expect(e.isActive("highlight", { color: "#fbdcdb" })).toBe(true);
  e.destroy();
});

test("링크 버튼 → 미니 입력 → Enter 로 링크가 실제로 적용된다", () => {
  const e = mk();
  e.chain().focus().insertContent("텍스트").selectAll().run();
  render(<TopToolbarContent editor={e} />);
  fireEvent.click(screen.getByLabelText("링크"));
  const input = screen.getByPlaceholderText("링크 주소 입력");
  fireEvent.change(input, { target: { value: "https://example.com" } });
  fireEvent.keyDown(input, { key: "Enter" });
  expect(e.isActive("link")).toBe(true);
  expect(e.getAttributes("link").href).toBe("https://example.com");
  e.destroy();
});

test("이미지 버튼 클릭이 이미지 화이트리스트 accept로 파일 선택기를 연다", () => {
  const e = mk();
  let captured: HTMLInputElement | null = null;
  vi.spyOn(HTMLInputElement.prototype, "click").mockImplementation(function (
    this: HTMLInputElement
  ) {
    captured = this;
  });
  render(<TopToolbarContent editor={e} />);
  fireEvent.click(screen.getByLabelText("이미지 삽입"));
  expect(captured).not.toBeNull();
  expect(captured!.accept).toBe("image/png,image/jpeg,image/gif,image/webp");
  vi.restoreAllMocks();
  e.destroy();
});

test("실행취소/다시 실행 버튼이 실제로 undo/redo를 수행한다", () => {
  const e = mkWithHistory();
  render(<TopToolbarContent editor={e} />);
  e.chain().focus().insertContent("A").run();
  const afterInsert = e.getHTML();
  fireEvent.click(screen.getByLabelText("실행취소"));
  expect(e.getHTML()).not.toBe(afterInsert);
  fireEvent.click(screen.getByLabelText("다시 실행"));
  expect(e.getHTML()).toBe(afterInsert);
  e.destroy();
});
