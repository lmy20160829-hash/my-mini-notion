import { afterEach, describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Editor } from "@tiptap/react";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import HardBreak from "@tiptap/extension-hard-break";
import { UndoRedo } from "@tiptap/extensions";
import { NODES } from "@/lib/editor/nodes";
import { docToText, type EditorDoc } from "@/lib/editor/doc";
import {
  EditorDragHandle,
  HANDLE_ARIA_LABEL,
  HandleMenu,
  convertBlockAt,
  deleteBlockAt,
  duplicateBlockAt,
  handleMenuBlocks,
} from "@/components/editor/DragHandle";

// wt2 ③ 드래그 핸들(스펙 2026-07-21-editor-wt2-design.md) —
// 클릭 메뉴의 세 액션(타입 변환·복제·삭제)이 문서에 남기는 결과와
// 메뉴 키보드 탐색(위/아래/Enter/Esc)을 검증한다. hover→핸들 표시 자체는
// 플러그인(mousemove·floating-ui) 소관이라 jsdom에서 신뢰할 수 없어
// 결과(문서 JSON)와 접근성 계약만 잠근다(PostEditor.test.tsx와 같은 분할).

const editors: Editor[] = [];
const mounts: HTMLElement[] = [];

function makeEditor(content?: object) {
  // 핸들 플러그인이 view.dom 부모에 핸들 요소를 붙이므로,
  // 실제 앱처럼 문서 트리에 마운트된 요소를 쓴다.
  const element = document.createElement("div");
  document.body.appendChild(element);
  mounts.push(element);
  const editor = new Editor({
    element,
    extensions: [Document, Paragraph, Text, HardBreak, UndoRedo, ...NODES],
    content: content ?? { type: "doc", content: [{ type: "paragraph" }] },
  });
  editors.push(editor);
  return editor;
}

const p = (text: string) => ({
  type: "paragraph",
  content: [{ type: "text", text }],
});

afterEach(() => {
  cleanup();
  while (editors.length) editors.pop()!.destroy();
  while (mounts.length) mounts.pop()!.remove();
});

describe("handleMenuBlocks (변환 대상)", () => {
  test("스키마에 존재하는 텍스트 블록 10종만 — 구분선·이미지·파일 제외", () => {
    const editor = makeEditor();
    const ids = handleMenuBlocks(editor).map((b) => b.id);
    expect(ids).toEqual([
      "paragraph",
      "heading1",
      "heading2",
      "heading3",
      "bulletList",
      "orderedList",
      "taskList",
      "blockquote",
      "callout",
      "toggle",
    ]);
  });
});

describe("convertBlockAt (타입 변환)", () => {
  const spec = (editor: Editor, id: string) => {
    const found = handleMenuBlocks(editor).find((b) => b.id === id);
    if (!found) throw new Error(`spec not found: ${id}`);
    return found;
  };

  test("문단 → 제목 2 (텍스트 보존)", () => {
    const editor = makeEditor({ type: "doc", content: [p("본문 한 줄")] });
    expect(convertBlockAt(editor, 0, spec(editor, "heading2"))).toBe(true);
    expect(editor.getJSON().content?.[0]).toMatchObject({
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "본문 한 줄" }],
    });
  });

  test("제목 → 불릿 목록", () => {
    const editor = makeEditor({
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "제목" }] },
      ],
    });
    expect(convertBlockAt(editor, 0, spec(editor, "bulletList"))).toBe(true);
    const first = editor.getJSON().content?.[0];
    expect(first?.type).toBe("bulletList");
    expect(docToText(editor.getJSON() as EditorDoc)).toBe("제목");
  });

  test("불릿 목록(항목 2개) → 문단 — 항목마다 문단 하나", () => {
    const editor = makeEditor({
      type: "doc",
      content: [
        {
          type: "bulletList",
          content: [
            { type: "listItem", content: [p("하나")] },
            { type: "listItem", content: [p("둘")] },
          ],
        },
      ],
    });
    expect(convertBlockAt(editor, 0, spec(editor, "paragraph"))).toBe(true);
    expect(editor.getJSON().content).toEqual([p("하나"), p("둘")]);
  });

  test("문단 → 체크박스 목록 (checked=false)", () => {
    const editor = makeEditor({ type: "doc", content: [p("할 일")] });
    expect(convertBlockAt(editor, 0, spec(editor, "taskList"))).toBe(true);
    expect(editor.getJSON().content?.[0]).toMatchObject({
      type: "taskList",
      content: [{ type: "taskItem", attrs: { checked: false } }],
    });
  });

  test("문단 → 콜아웃 / 토글(open=true) — projection 텍스트 보존", () => {
    const editor = makeEditor({ type: "doc", content: [p("강조"), p("접기")] });
    expect(convertBlockAt(editor, 0, spec(editor, "callout"))).toBe(true);
    expect(editor.getJSON().content?.[0]?.type).toBe("callout");
    // 두 번째 블록(변환 후에도 pos는 콜아웃 nodeSize 뒤)
    const calloutSize = editor.state.doc.child(0).nodeSize;
    expect(convertBlockAt(editor, calloutSize, spec(editor, "toggle"))).toBe(true);
    expect(editor.getJSON().content?.[1]).toMatchObject({
      type: "toggle",
      attrs: { open: true },
    });
    expect(docToText(editor.getJSON() as EditorDoc)).toBe("강조\n접기");
  });

  test("빈 문단도 변환된다 (내용 없는 블록)", () => {
    const editor = makeEditor({ type: "doc", content: [{ type: "paragraph" }] });
    expect(convertBlockAt(editor, 0, spec(editor, "heading1"))).toBe(true);
    expect(editor.getJSON().content?.[0]).toMatchObject({
      type: "heading",
      attrs: { level: 1 },
    });
  });
});

describe("duplicateBlockAt / deleteBlockAt", () => {
  test("복제 — 같은 블록이 바로 아래 생긴다", () => {
    const editor = makeEditor({
      type: "doc",
      content: [
        { type: "callout", content: [p("메모")] },
        p("다음 블록"),
      ],
    });
    expect(duplicateBlockAt(editor, 0)).toBe(true);
    const content = editor.getJSON().content ?? [];
    expect(content).toHaveLength(3);
    expect(content[0]).toEqual(content[1]);
    expect(content[2]).toEqual(p("다음 블록"));
  });

  test("삭제 — 블록이 문서에서 사라진다", () => {
    const editor = makeEditor({
      type: "doc",
      content: [p("남는 블록"), p("지울 블록")],
    });
    const pos = editor.state.doc.child(0).nodeSize;
    expect(deleteBlockAt(editor, pos)).toBe(true);
    expect(editor.getJSON().content).toEqual([p("남는 블록")]);
  });
});

describe("HandleMenu (클릭 메뉴 UI)", () => {
  test("role=menu + 전환 10종·복제·삭제 12항목, 그룹 라벨 전환/동작", () => {
    const editor = makeEditor({ type: "doc", content: [p("본문")] });
    render(<HandleMenu editor={editor} pos={0} onClose={vi.fn()} />);
    const menu = screen.getByRole("menu", { name: "블록 메뉴" });
    expect(menu).toBeTruthy();
    const items = screen.getAllByRole("menuitem");
    expect(items).toHaveLength(12);
    expect(items.map((el) => el.textContent)).toEqual([
      "텍스트",
      "제목 1",
      "제목 2",
      "제목 3",
      "불릿 목록",
      "번호 목록",
      "체크박스 목록",
      "인용",
      "콜아웃",
      "토글",
      "복제",
      "삭제",
    ]);
    expect(menu.textContent).toContain("전환");
    expect(menu.textContent).toContain("동작");
  });

  test("항목 클릭 → 변환 실행 + onClose", () => {
    const editor = makeEditor({ type: "doc", content: [p("본문")] });
    const onClose = vi.fn();
    render(<HandleMenu editor={editor} pos={0} onClose={onClose} />);
    fireEvent.click(screen.getByRole("menuitem", { name: "제목 1" }));
    expect(editor.getJSON().content?.[0]).toMatchObject({
      type: "heading",
      attrs: { level: 1 },
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("키보드 — 아래/위 화살표로 포커스 이동, Esc로 닫기", () => {
    const editor = makeEditor({ type: "doc", content: [p("본문")] });
    const onClose = vi.fn();
    render(<HandleMenu editor={editor} pos={0} onClose={onClose} />);
    const menu = screen.getByRole("menu", { name: "블록 메뉴" });
    const items = screen.getAllByRole("menuitem");
    // 열리면 첫 항목에 포커스.
    expect(document.activeElement).toBe(items[0]);
    fireEvent.keyDown(menu, { key: "ArrowDown" });
    expect(document.activeElement).toBe(items[1]);
    fireEvent.keyDown(menu, { key: "ArrowUp" });
    expect(document.activeElement).toBe(items[0]);
    // 첫 항목에서 위 → 마지막 항목으로 순환.
    fireEvent.keyDown(menu, { key: "ArrowUp" });
    expect(document.activeElement).toBe(items[items.length - 1]);
    fireEvent.keyDown(menu, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("포커스된 항목에서 Enter(클릭 활성화) → 삭제 실행", () => {
    const editor = makeEditor({
      type: "doc",
      content: [p("지울 블록"), p("남는 블록")],
    });
    const onClose = vi.fn();
    render(<HandleMenu editor={editor} pos={0} onClose={onClose} />);
    const del = screen.getByRole("menuitem", { name: "삭제" });
    del.focus();
    fireEvent.click(del); // 네이티브 버튼: Enter는 click으로 발화된다.
    expect(editor.getJSON().content).toEqual([p("남는 블록")]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("EditorDragHandle (핸들 버튼)", () => {
  test("aria-label '블록 옮기기' 버튼과 GripVertical 아이콘을 렌더한다", () => {
    const editor = makeEditor({ type: "doc", content: [p("본문")] });
    render(<EditorDragHandle editor={editor} />);
    const btn = screen.getByLabelText(HANDLE_ARIA_LABEL);
    expect(btn.tagName).toBe("BUTTON");
    expect(btn.querySelector("svg")).not.toBeNull();
  });

  test("editor가 없으면 아무것도 렌더하지 않는다", () => {
    render(<EditorDragHandle editor={null} />);
    expect(screen.queryByLabelText(HANDLE_ARIA_LABEL)).toBeNull();
  });
});
