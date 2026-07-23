import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { Editor } from "@tiptap/core";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import { MARKS } from "@/lib/editor/marks";
import { ColorPopover } from "@/components/editor/ColorPopover";

// C3 색 팝오버 — 렌더(스와치 8종)·클릭 동작(실제 적용) 검증.
//
// 브리프 원안은 `vi.spyOn(e.commands, "setColor")`로 커맨드 호출을 스파이했지만
// (T4 실측 교훈과 동일 원인) Tiptap의 `editor.commands`는 접근할 때마다 새
// 객체를 만드는 게터라 스파이가 이후 `chain()...setColor()...run()` 호출을
// 절대 관측하지 못한다(호출돼도 다른 객체 인스턴스). 그래서 여기서는 스파이
// 대신 헤드리스 에디터에 실제 텍스트를 넣고 전체 선택 → 스와치 클릭 →
// `getAttributes("textStyle").color`(글자색) / `isActive("highlight", { color })`
// (배경색)로 실제 문서 상태 변화를 단언한다.
afterEach(cleanup);

function mk() {
  return new Editor({
    element: document.createElement("div"),
    extensions: [Document, Paragraph, Text, ...MARKS],
  });
}

function withSelectedText(e: Editor) {
  e.chain().focus().insertContent("글").selectAll().run();
  return e;
}

test("글자색 스와치 8개를 렌더한다", () => {
  const e = mk();
  render(<ColorPopover editor={e} kind="text" />);
  expect(screen.getAllByRole("button")).toHaveLength(8);
  e.destroy();
});

test("배경색 스와치 8개를 렌더한다", () => {
  const e = mk();
  render(<ColorPopover editor={e} kind="highlight" />);
  expect(screen.getAllByRole("button")).toHaveLength(8);
  e.destroy();
});

test("빨강 스와치 클릭이 실제로 글자색을 적용한다(setColor(#e5484d))", () => {
  const e = withSelectedText(mk());
  render(<ColorPopover editor={e} kind="text" />);
  screen.getByLabelText("빨강").click();
  expect(e.getAttributes("textStyle").color).toBe("#e5484d");
  e.destroy();
});

test("기본(첫 항목) 클릭이 글자색을 해제한다(unsetColor)", () => {
  const e = withSelectedText(mk());
  e.chain().setColor("#e5484d").run();
  expect(e.getAttributes("textStyle").color).toBe("#e5484d");
  render(<ColorPopover editor={e} kind="text" />);
  screen.getByLabelText("기본").click();
  expect(e.getAttributes("textStyle").color).toBeUndefined();
  e.destroy();
});

test("빨강 스와치 클릭이 실제로 배경색을 적용한다(toggleHighlight(#fbdcdb))", () => {
  const e = withSelectedText(mk());
  render(<ColorPopover editor={e} kind="highlight" />);
  screen.getByLabelText("빨강").click();
  expect(e.isActive("highlight", { color: "#fbdcdb" })).toBe(true);
  e.destroy();
});

test("없음(첫 항목) 클릭이 배경색을 해제한다(unsetHighlight)", () => {
  const e = withSelectedText(mk());
  e.chain().toggleHighlight({ color: "#fbdcdb" }).run();
  expect(e.isActive("highlight", { color: "#fbdcdb" })).toBe(true);
  render(<ColorPopover editor={e} kind="highlight" />);
  screen.getByLabelText("없음").click();
  expect(e.isActive("highlight")).toBe(false);
  e.destroy();
});

test("onMouseDown이 기본 동작을 막아 에디터 포커스/선택을 유지한다", () => {
  const e = withSelectedText(mk());
  render(<ColorPopover editor={e} kind="text" />);
  const btn = screen.getByLabelText("빨강");
  const evt = new MouseEvent("mousedown", { bubbles: true, cancelable: true });
  const spy = vi.spyOn(evt, "preventDefault");
  btn.dispatchEvent(evt);
  expect(spy).toHaveBeenCalled();
  e.destroy();
});
