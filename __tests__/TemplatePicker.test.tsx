import { afterEach, describe, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useEditor } from "@tiptap/react";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import StarterKit from "@tiptap/starter-kit";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import type { Editor } from "@tiptap/core";
import type { AnyExtension } from "@tiptap/react";
import { textToDoc, type EditorDoc } from "@/lib/editor/doc";
import { TemplatePicker } from "@/components/editor/TemplatePicker";

// wt1 ⑨ 페이지 템플릿 — 빈 글 노출·선택 삽입(dual-write 는 onUpdate 경유)·
// 타이핑 시 사라짐·스키마 가드(스펙 wt1 §⑨).

afterEach(() => cleanup());

function Host({
  extensions,
  initialDoc,
  onEditor,
  onUpdate,
}: {
  extensions: AnyExtension[];
  initialDoc: EditorDoc;
  onEditor: (e: Editor) => void;
  onUpdate?: () => void;
}) {
  const editor = useEditor({
    immediatelyRender: true,
    extensions,
    content: initialDoc,
    onUpdate,
  });
  if (editor) onEditor(editor);
  return <TemplatePicker editor={editor} initialDoc={initialDoc} />;
}

const FULL = [StarterKit, TaskList, TaskItem];
const PARAGRAPH_ONLY = [Document, Paragraph, Text];

describe("TemplatePicker 노출 조건", () => {
  test("빈 글이면 4버튼(빈 페이지/회의록/할 일/메모) 행을 띄운다", () => {
    let editor!: Editor;
    render(
      <Host extensions={FULL} initialDoc={textToDoc("")} onEditor={(e) => (editor = e)} />
    );
    expect(document.querySelector(".tpl-row")).not.toBeNull();
    for (const label of ["빈 페이지", "회의록", "할 일", "메모"]) {
      expect(screen.getByRole("button", { name: label })).toBeTruthy();
    }
    expect(editor).toBeTruthy();
  });

  test("내용이 있는 글에는 뜨지 않는다", () => {
    let editor!: Editor;
    render(
      <Host
        extensions={FULL}
        initialDoc={textToDoc("이미 쓴 글")}
        onEditor={(e) => (editor = e)}
      />
    );
    expect(document.querySelector(".tpl-row")).toBeNull();
  });

  test("스키마 가드: 템플릿 노드가 등록되지 않은 스키마(P2 단독)에서는 행 자체를 숨긴다", () => {
    let editor!: Editor;
    render(
      <Host
        extensions={PARAGRAPH_ONLY}
        initialDoc={textToDoc("")}
        onEditor={(e) => (editor = e)}
      />
    );
    expect(document.querySelector(".tpl-row")).toBeNull();
  });
});

describe("TemplatePicker 동작", () => {
  test("템플릿 선택 → 문서 삽입 + onUpdate(dual-write 경로) + 행 사라짐", () => {
    let editor!: Editor;
    const onUpdate = vi.fn();
    render(
      <Host
        extensions={FULL}
        initialDoc={textToDoc("")}
        onEditor={(e) => (editor = e)}
        onUpdate={onUpdate}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "메모" }));

    const json = editor.getJSON();
    expect(json.content?.[0]).toMatchObject({ type: "heading", attrs: { level: 1 } });
    expect(onUpdate).toHaveBeenCalled(); // PostEditor onUpdate → buildEditPatch 저장 경로
    expect(document.querySelector(".tpl-row")).toBeNull();
  });

  test("빈 페이지 선택 → 문서 불변, 행만 사라짐", () => {
    let editor!: Editor;
    const onUpdate = vi.fn();
    render(
      <Host
        extensions={FULL}
        initialDoc={textToDoc("")}
        onEditor={(e) => (editor = e)}
        onUpdate={onUpdate}
      />
    );
    const before = editor.getJSON();
    fireEvent.click(screen.getByRole("button", { name: "빈 페이지" }));
    expect(editor.getJSON()).toEqual(before);
    expect(onUpdate).not.toHaveBeenCalled();
    expect(document.querySelector(".tpl-row")).toBeNull();
  });

  test("타이핑을 시작하면 행이 사라진다 (노션 관행)", () => {
    let editor!: Editor;
    render(
      <Host extensions={FULL} initialDoc={textToDoc("")} onEditor={(e) => (editor = e)} />
    );
    expect(document.querySelector(".tpl-row")).not.toBeNull();
    act(() => {
      editor.commands.insertContent("첫 글자");
    });
    expect(document.querySelector(".tpl-row")).toBeNull();
  });
});
