import { afterEach, describe, expect, test } from "vitest";
import { Editor } from "@tiptap/core";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import HardBreak from "@tiptap/extension-hard-break";
import { UndoRedo } from "@tiptap/extensions";
import { BLOCKS } from "@/lib/editor/blocks";
import { NODES } from "@/lib/editor/nodes";
import { docToText, type EditorDoc } from "@/lib/editor/doc";

// wt2 ④ 블록 타입(스펙 2026-07-21-editor-wt2-design.md) —
// lib/editor/nodes.ts 가 blocks.ts 계약의 노드(이미지·파일·표 제외 11종)를 등록한다.
// 이미지·파일은 wt3 소유(media-nodes.ts), 표는 별도 파일(table-nodes.ts, Phase T)
// 소유라 여기 NODES 배열에는 없다. 에디터는 PostEditor 결합부(P1 기본 확장 + NODES)를
// 그대로 재현해 만든다.

const editors: Editor[] = [];

function makeEditor(content?: object | string) {
  const editor = new Editor({
    element: document.createElement("div"),
    extensions: [Document, Paragraph, Text, HardBreak, UndoRedo, ...NODES],
    content: content ?? "",
  });
  editors.push(editor);
  return editor;
}

/** 입력 규칙을 발화시키는 타이핑 시뮬레이션 — handleTextInput 경유(마크다운 단축 입력용). */
function type(editor: Editor, text: string) {
  for (const ch of text) {
    const { view } = editor;
    const handled = view.someProp("handleTextInput", (f) =>
      f(view, view.state.selection.from, view.state.selection.to, ch)
    );
    if (!handled) {
      view.dispatch(view.state.tr.insertText(ch));
    }
  }
}

afterEach(() => {
  while (editors.length) editors.pop()!.destroy();
});

describe("노드 등록 (blocks.ts 계약)", () => {
  test("계약 14종 중 image·fileBlock(wt3 소유)·table(table-nodes.ts 소유)을 뺀 11종이 스키마에 존재한다", () => {
    const editor = makeEditor();
    const wt2Blocks = BLOCKS.filter(
      (b) => b.type !== "image" && b.type !== "fileBlock" && b.type !== "table"
    );
    expect(wt2Blocks).toHaveLength(11);
    for (const b of wt2Blocks) {
      expect(editor.schema.nodes[b.type], b.type).toBeDefined();
    }
    expect(editor.schema.nodes.image).toBeUndefined();
    expect(editor.schema.nodes.fileBlock).toBeUndefined();
    expect(editor.schema.nodes.table).toBeUndefined();
  });

  test("heading은 level 1–3만 허용한다", () => {
    const editor = makeEditor({
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "제목" }] },
      ],
    });
    editor.commands.setTextSelection(2);
    expect(editor.commands.setHeading({ level: 3 })).toBe(true);
    expect(editor.getJSON().content?.[0]).toMatchObject({
      type: "heading",
      attrs: { level: 3 },
    });
    // 허용 밖 레벨은 거부되고 문서가 변하지 않는다.
    expect(editor.commands.setHeading({ level: 4 as never })).toBe(false);
    expect(editor.getJSON().content?.[0]?.attrs?.level).toBe(3);
  });
});

describe("마크다운 단축 입력 (입력 규칙)", () => {
  test.each([
    ["# ", 1],
    ["## ", 2],
    ["### ", 3],
  ])("%s → 제목%i", (prefix, level) => {
    const editor = makeEditor();
    type(editor, `${prefix}머리말`);
    expect(editor.getJSON().content?.[0]).toMatchObject({
      type: "heading",
      attrs: { level },
      content: [{ type: "text", text: "머리말" }],
    });
  });

  test("#### 는 변환되지 않는다 (level 1–3 제한)", () => {
    const editor = makeEditor();
    type(editor, "#### 넷");
    expect(editor.getJSON().content?.[0]?.type).toBe("paragraph");
  });

  test("- → 불릿 목록", () => {
    const editor = makeEditor();
    type(editor, "- 항목");
    const first = editor.getJSON().content?.[0];
    expect(first?.type).toBe("bulletList");
    expect(first?.content?.[0]?.type).toBe("listItem");
    expect(docToText(editor.getJSON() as EditorDoc)).toContain("항목");
  });

  test("1. → 번호 목록", () => {
    const editor = makeEditor();
    type(editor, "1. 첫째");
    expect(editor.getJSON().content?.[0]?.type).toBe("orderedList");
  });

  test("[] → 체크박스 목록 (taskItem, checked=false)", () => {
    const editor = makeEditor();
    type(editor, "[] 할 일");
    const first = editor.getJSON().content?.[0];
    expect(first?.type).toBe("taskList");
    expect(first?.content?.[0]).toMatchObject({
      type: "taskItem",
      attrs: { checked: false },
    });
    expect(docToText(editor.getJSON() as EditorDoc)).toContain("할 일");
  });

  test("체크박스 목록은 중첩을 허용한다 (taskItem nested)", () => {
    const editor = makeEditor({
      type: "doc",
      content: [
        {
          type: "taskList",
          content: [
            {
              type: "taskItem",
              attrs: { checked: false },
              content: [
                { type: "paragraph", content: [{ type: "text", text: "부모" }] },
                {
                  type: "taskList",
                  content: [
                    {
                      type: "taskItem",
                      attrs: { checked: true },
                      content: [
                        {
                          type: "paragraph",
                          content: [{ type: "text", text: "자식" }],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });
    const item = editor.getJSON().content?.[0]?.content?.[0];
    expect(item?.content?.[1]?.type).toBe("taskList");
    expect(docToText(editor.getJSON() as EditorDoc)).toBe("부모자식");
  });

  test("> → 인용", () => {
    const editor = makeEditor();
    type(editor, "> 인용문");
    expect(editor.getJSON().content?.[0]?.type).toBe("blockquote");
  });

  test("--- → 구분선", () => {
    const editor = makeEditor();
    type(editor, "---");
    const types = (editor.getJSON().content ?? []).map((n) => n.type);
    expect(types).toContain("horizontalRule");
  });
});

describe("callout (커스텀 노드)", () => {
  const calloutDoc = {
    type: "doc",
    content: [
      {
        type: "callout",
        content: [
          { type: "paragraph", content: [{ type: "text", text: "메모입니다" }] },
        ],
      },
    ],
  };

  test("JSON 직렬화 왕복(getJSON→setContent)이 보존된다", () => {
    const editor = makeEditor(calloutDoc);
    const json = editor.getJSON();
    expect(json.content?.[0]?.type).toBe("callout");
    editor.commands.setContent(json);
    expect(editor.getJSON()).toEqual(json);
  });

  test("HTML 왕복 — data-type=callout 으로 렌더·파싱된다", () => {
    const editor = makeEditor(calloutDoc);
    const html = editor.getHTML();
    expect(html).toContain('data-type="callout"');
    const editor2 = makeEditor();
    editor2.commands.setContent(html);
    expect(editor2.getJSON().content?.[0]?.type).toBe("callout");
    expect(docToText(editor2.getJSON() as EditorDoc)).toBe("메모입니다");
  });
});

describe("toggle (커스텀 노드)", () => {
  const toggleDoc = {
    type: "doc",
    content: [
      {
        type: "toggle",
        attrs: { open: false },
        content: [
          { type: "paragraph", content: [{ type: "text", text: "제목행" }] },
          { type: "paragraph", content: [{ type: "text", text: "본문행" }] },
        ],
      },
    ],
  };

  test("open attr 기본값은 true(펼침)다", () => {
    const editor = makeEditor({
      type: "doc",
      content: [
        {
          type: "toggle",
          content: [
            { type: "paragraph", content: [{ type: "text", text: "제목" }] },
          ],
        },
      ],
    });
    expect(editor.getJSON().content?.[0]?.attrs?.open).toBe(true);
  });

  test("JSON 직렬화 왕복 — 접힘 상태(open=false)가 문서에 저장된다", () => {
    const editor = makeEditor(toggleDoc);
    const json = editor.getJSON();
    expect(json.content?.[0]?.attrs?.open).toBe(false);
    editor.commands.setContent(json);
    expect(editor.getJSON()).toEqual(json);
  });

  test("HTML 왕복 — data-open 으로 접힘 상태가 보존된다", () => {
    const editor = makeEditor(toggleDoc);
    const html = editor.getHTML();
    expect(html).toContain('data-type="toggle"');
    expect(html).toContain('data-open="false"');
    const editor2 = makeEditor();
    editor2.commands.setContent(html);
    expect(editor2.getJSON().content?.[0]?.attrs?.open).toBe(false);
  });

  test("updateAttributes로 open을 바꾸면 문서 JSON에 반영된다", () => {
    const editor = makeEditor(toggleDoc);
    editor.commands.setTextSelection(2); // 제목행 내부
    expect(editor.commands.updateAttributes("toggle", { open: true })).toBe(true);
    expect(editor.getJSON().content?.[0]?.attrs?.open).toBe(true);
  });

  test("접혀 있어도 본문 텍스트는 문서에 남는다 (docToText 보존)", () => {
    const editor = makeEditor(toggleDoc);
    expect(docToText(editor.getJSON() as EditorDoc)).toBe("제목행본문행");
  });
});
