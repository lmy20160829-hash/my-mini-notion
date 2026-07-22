import { afterEach, describe, expect, test } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import type { Editor } from "@tiptap/core";
import { SlashMenu } from "@/components/editor/SlashMenu";

// wt1 ② 슬래시 커맨드 메뉴 — `/` 트리거·BLOCKS 소비·스키마 가드·키보드 탐색
// (스펙 docs/superpowers/specs/2026-07-21-editor-wt1-design.md §②).
// 기존 컴포저 슬래시 메뉴(§2.7.8, .slash-menu)와 별개 컴포넌트(.slash2-*)다.

afterEach(() => cleanup());

function Host({ onEditor }: { onEditor: (e: Editor) => void }) {
  const editor = useEditor({
    immediatelyRender: true,
    extensions: [StarterKit, TaskList, TaskItem],
    content: "<p></p>",
    // jsdom 에는 레이아웃이 없어 coordsAtPos 가 0을 돌려줘도 무방하다.
  });
  if (editor) onEditor(editor);
  return <SlashMenu editor={editor} />;
}

function typeSlash(editor: Editor, rest = "") {
  act(() => {
    editor.commands.focus("end");
    editor.commands.insertContent("/" + rest);
  });
}

describe("SlashMenu", () => {
  test("트리거 전에는 메뉴가 없다", () => {
    let editor!: Editor;
    render(<Host onEditor={(e) => (editor = e)} />);
    expect(document.querySelector(".slash2-menu")).toBeNull();
    expect(editor).toBeTruthy();
  });

  test("`/` 입력으로 메뉴가 열리고 스키마에 있는 블록만 보인다", async () => {
    let editor!: Editor;
    render(<Host onEditor={(e) => (editor = e)} />);
    typeSlash(editor);

    expect(await screen.findByText("텍스트")).toBeTruthy();
    expect(screen.getByText("제목 1")).toBeTruthy();
    expect(screen.getByText("불릿 목록")).toBeTruthy();
    expect(screen.getByText("체크박스 목록")).toBeTruthy();
    // 스키마 미등록(wt2·wt3 소유) 항목은 자동 숨김.
    expect(screen.queryByText("콜아웃")).toBeNull();
    expect(screen.queryByText("토글")).toBeNull();
    expect(screen.queryByText("이미지")).toBeNull();
    expect(screen.queryByText("파일")).toBeNull();
  });

  test("질의로 실시간 필터링한다", async () => {
    let editor!: Editor;
    render(<Host onEditor={(e) => (editor = e)} />);
    typeSlash(editor, "제목");

    expect(await screen.findByText("제목 1")).toBeTruthy();
    expect(screen.getByText("제목 2")).toBeTruthy();
    expect(screen.queryByText("텍스트")).toBeNull();
  });

  test("매치가 없으면 '결과 없음' 한 줄", async () => {
    let editor!: Editor;
    render(<Host onEditor={(e) => (editor = e)} />);
    typeSlash(editor, "zzzz");

    expect(await screen.findByText("결과 없음")).toBeTruthy();
  });

  test("항목 클릭 → 트리거 텍스트 제거 + 블록 삽입", async () => {
    let editor!: Editor;
    render(<Host onEditor={(e) => (editor = e)} />);
    typeSlash(editor, "제목");

    const item = await screen.findByText("제목 1");
    fireEvent.click(item);

    const json = editor.getJSON();
    expect(json.content?.[0]?.type).toBe("heading");
    expect(json.content?.[0]?.attrs).toMatchObject({ level: 1 });
    // "/제목" 텍스트는 삭제됐다.
    expect(JSON.stringify(json)).not.toContain("/제목");
  });

  test("위/아래 + Enter 키보드 탐색으로 삽입한다", async () => {
    let editor!: Editor;
    render(<Host onEditor={(e) => (editor = e)} />);
    typeSlash(editor, "제목");
    await screen.findByText("제목 1");

    const dom = editor.view.dom;
    fireEvent.keyDown(dom, { key: "ArrowDown" }); // 제목 1 → 제목 2
    fireEvent.keyDown(dom, { key: "Enter" });

    expect(editor.getJSON().content?.[0]).toMatchObject({
      type: "heading",
      attrs: { level: 2 },
    });
  });

  test("Esc 로 닫는다", async () => {
    let editor!: Editor;
    render(<Host onEditor={(e) => (editor = e)} />);
    typeSlash(editor);
    await screen.findByText("텍스트");

    fireEvent.keyDown(editor.view.dom, { key: "Escape" });
    expect(document.querySelector(".slash2-menu")).toBeNull();
  });
});
