import { afterEach, describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { useEditor } from "@tiptap/react";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import type { Editor } from "@tiptap/core";
import { TextSelection } from "@tiptap/pm/state";
import { MARKS } from "@/lib/editor/marks";
import {
  FormatToolbar,
  FormatToolbarContent,
  fmtShouldShow,
} from "@/components/editor/FormatToolbar";

// wt1 ① 플로팅 서식 툴바 — 표시 조건·버튼 6종·링크 미니 입력
// (스펙 docs/superpowers/specs/2026-07-21-editor-wt1-design.md §①).
// jsdom에서 BubbleMenu 의 실제 플로팅 위치는 신뢰할 수 없으므로(레이아웃 없음),
// 표시 조건(fmtShouldShow)과 내용(FormatToolbarContent)을 나눠 검증한다.

afterEach(() => cleanup());

/** 테스트 호스트 — 에디터 인스턴스를 만들어 content 를 렌더한다. */
function Host({
  onEditor,
  children,
}: {
  onEditor: (e: Editor) => void;
  children?: (e: Editor | null) => React.ReactNode;
}) {
  const editor = useEditor({
    immediatelyRender: true,
    extensions: [Document, Paragraph, Text, ...MARKS],
    content: "<p>서식을 적용할 문장</p>",
  });
  if (editor) onEditor(editor);
  return <>{children ? children(editor) : null}</>;
}

function selectRange(editor: Editor, from: number, to: number) {
  const tr = editor.state.tr.setSelection(
    TextSelection.create(editor.state.doc, from, to)
  );
  editor.view.dispatch(tr);
}

describe("fmtShouldShow (표시 조건)", () => {
  test("선택이 비어 있으면 false, 텍스트를 선택하면 true", () => {
    let editor!: Editor;
    render(<Host onEditor={(e) => (editor = e)} />);

    // 커서만 있는 상태(빈 선택)
    selectRange(editor, 1, 1);
    expect(
      fmtShouldShow({ editor, state: editor.state, from: 1, to: 1 })
    ).toBe(false);

    // 범위 선택
    selectRange(editor, 1, 4);
    expect(
      fmtShouldShow({ editor, state: editor.state, from: 1, to: 4 })
    ).toBe(true);
  });
});

describe("FormatToolbar", () => {
  test("editor 가 null 이면 아무것도 렌더하지 않는다", () => {
    const { container } = render(<FormatToolbar editor={null} />);
    expect(container.querySelector(".fmt-bar")).toBeNull();
  });
});

describe("FormatToolbarContent (버튼 줄)", () => {
  test("마크 버튼 6종이 렌더된다", () => {
    let editor!: Editor;
    const { getByTitle } = render(
      <Host onEditor={(e) => (editor = e)}>
        {(e) => (e ? <FormatToolbarContent editor={e} /> : null)}
      </Host>
    );
    for (const title of ["굵게", "기울임", "밑줄", "취소선", "코드", "링크"]) {
      expect(getByTitle(title)).toBeTruthy();
    }
    expect(editor).toBeTruthy();
  });

  test("버튼 클릭으로 마크가 토글되고 활성 버튼에 is-active 가 붙는다", async () => {
    let editor!: Editor;
    const { getByTitle } = render(
      <Host onEditor={(e) => (editor = e)}>
        {(e) => (e ? <FormatToolbarContent editor={e} /> : null)}
      </Host>
    );
    selectRange(editor, 1, 4);
    fireEvent.click(getByTitle("굵게"));
    expect(editor.isActive("bold")).toBe(true);
    await waitFor(() =>
      expect(getByTitle("굵게").classList.contains("is-active")).toBe(true)
    );
  });

  test("링크 버튼 → 미니 입력 → Enter 로 링크 적용, 빈 값 Enter 는 해제", async () => {
    let editor!: Editor;
    const { getByTitle, findByPlaceholderText } = render(
      <Host onEditor={(e) => (editor = e)}>
        {(e) => (e ? <FormatToolbarContent editor={e} /> : null)}
      </Host>
    );
    selectRange(editor, 1, 4);

    // 적용
    fireEvent.click(getByTitle("링크"));
    const input = await findByPlaceholderText("링크 주소 입력");
    fireEvent.change(input, { target: { value: "https://example.com" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(editor.isActive("link")).toBe(true);
    expect(editor.getAttributes("link").href).toBe("https://example.com");

    // 해제 (빈 값 Enter)
    selectRange(editor, 1, 4);
    fireEvent.click(getByTitle("링크"));
    const input2 = await findByPlaceholderText("링크 주소 입력");
    fireEvent.change(input2, { target: { value: "" } });
    fireEvent.keyDown(input2, { key: "Enter" });
    expect(editor.isActive("link")).toBe(false);
  });

  test("링크 입력은 기존 href 를 미리 채운다", async () => {
    let editor!: Editor;
    const { getByTitle, findByPlaceholderText } = render(
      <Host onEditor={(e) => (editor = e)}>
        {(e) => (e ? <FormatToolbarContent editor={e} /> : null)}
      </Host>
    );
    selectRange(editor, 1, 4);
    fireEvent.click(getByTitle("링크"));
    const input = await findByPlaceholderText("링크 주소 입력");
    fireEvent.change(input, { target: { value: "https://tiptap.dev" } });
    fireEvent.keyDown(input, { key: "Enter" });

    // 다시 열면 기존 값이 채워져 있어야 한다.
    selectRange(editor, 1, 4);
    fireEvent.click(getByTitle("링크"));
    const input2 = (await findByPlaceholderText(
      "링크 주소 입력"
    )) as HTMLInputElement;
    expect(input2.value).toBe("https://tiptap.dev");
  });
});
