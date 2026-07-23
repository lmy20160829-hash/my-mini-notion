import { afterEach, describe, expect, test } from "vitest";
import { Editor } from "@tiptap/core";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import StarterKit from "@tiptap/starter-kit";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { TABLE_NODES } from "@/lib/editor/table-nodes";
import { BLOCKS, type BlockSpec } from "@/lib/editor/blocks";
import {
  filterBlocks,
  insertBlock,
  isBlockAvailable,
} from "@/lib/editor/insert";

// wt1 ② 슬래시 커맨드 — BLOCKS 필터·스키마 가드·단일 삽입 함수 계약
// (스펙 docs/superpowers/specs/2026-07-21-editor-wt1-design.md §②).

let editors: Editor[] = [];

/** P2 시점 PostEditor 와 동일한 문단 전용 스키마. */
function paragraphOnlyEditor() {
  const editor = new Editor({
    element: document.createElement("div"),
    extensions: [Document, Paragraph, Text],
    content: "<p></p>",
  });
  editors.push(editor);
  return editor;
}

/** wt2 머지 후를 흉내낸 풀 스키마(StarterKit + 체크박스 목록). */
function fullEditor() {
  const editor = new Editor({
    element: document.createElement("div"),
    extensions: [StarterKit, TaskList, TaskItem],
    content: "<p></p>",
  });
  editors.push(editor);
  return editor;
}

/**
 * T1 실측 교훈: TABLE_NODES의 셀 content 제한
 * "(paragraph | bulletList | orderedList | taskList)+"가 참조하는 노드가
 * 스키마에 없으면 ProseMirror 스키마 빌드 자체가 throw한다. StarterKit이
 * BulletList/OrderedList/ListItem을 이미 담고 있으므로, 여기서는
 * TaskList/TaskItem(nested)만 더해 표 삽입을 흉내낸다.
 */
function makeEditorWithTable() {
  const editor = new Editor({
    element: document.createElement("div"),
    extensions: [
      StarterKit,
      TaskList,
      TaskItem.configure({ nested: true }),
      ...TABLE_NODES,
    ],
    content: "<p></p>",
  });
  editors.push(editor);
  return editor;
}

function spec(id: string): BlockSpec {
  const found = BLOCKS.find((b) => b.id === id);
  if (!found) throw new Error(`BLOCKS에 없는 id: ${id}`);
  return found;
}

afterEach(() => {
  editors.forEach((e) => e.destroy());
  editors = [];
});

describe("filterBlocks (키워드 실시간 필터)", () => {
  test("빈 질의는 전체를 돌려준다", () => {
    expect(filterBlocks(BLOCKS, "")).toEqual(BLOCKS);
  });

  test("keywords 로 매칭한다 (한국어)", () => {
    const ids = filterBlocks(BLOCKS, "제목").map((b) => b.id);
    expect(ids).toEqual(["heading1", "heading2", "heading3"]);
  });

  test("keywords 로 매칭한다 (영어, 대소문자 무시)", () => {
    const ids = filterBlocks(BLOCKS, "H2").map((b) => b.id);
    expect(ids).toEqual(["heading2"]);
  });

  test("label 로도 매칭한다", () => {
    const ids = filterBlocks(BLOCKS, "구분").map((b) => b.id);
    expect(ids).toEqual(["horizontalRule"]);
  });

  test("매치가 없으면 빈 배열", () => {
    expect(filterBlocks(BLOCKS, "존재하지않는키워드")).toEqual([]);
  });
});

describe("isBlockAvailable (스키마 가드 — wt2 미머지 안전장치)", () => {
  test("문단 전용 스키마: paragraph 만 노출, heading 등은 숨김", () => {
    const editor = paragraphOnlyEditor();
    expect(isBlockAvailable(editor, spec("paragraph"))).toBe(true);
    expect(isBlockAvailable(editor, spec("heading1"))).toBe(false);
    expect(isBlockAvailable(editor, spec("bulletList"))).toBe(false);
    expect(isBlockAvailable(editor, spec("image"))).toBe(false);
  });

  test("풀 스키마: 등록된 노드는 노출, callout·toggle 등 미등록은 여전히 숨김", () => {
    const editor = fullEditor();
    expect(isBlockAvailable(editor, spec("heading1"))).toBe(true);
    expect(isBlockAvailable(editor, spec("taskList"))).toBe(true);
    expect(isBlockAvailable(editor, spec("callout"))).toBe(false);
    expect(isBlockAvailable(editor, spec("toggle"))).toBe(false);
    expect(isBlockAvailable(editor, spec("fileBlock"))).toBe(false);
  });
});

describe("insertBlock (단일 삽입 함수)", () => {
  test("스키마에 없는 타입은 false 를 돌려주고 문서를 바꾸지 않는다", () => {
    const editor = paragraphOnlyEditor();
    const before = editor.getJSON();
    expect(insertBlock(editor, spec("heading1"))).toBe(false);
    expect(editor.getJSON()).toEqual(before);
  });

  test("heading: attrs(level)를 반영해 setNode 한다", () => {
    const editor = fullEditor();
    expect(insertBlock(editor, spec("heading2"))).toBe(true);
    expect(editor.getJSON().content?.[0]).toMatchObject({
      type: "heading",
      attrs: { level: 2 },
    });
  });

  test("bulletList: 목록으로 감싼다", () => {
    const editor = fullEditor();
    expect(insertBlock(editor, spec("bulletList"))).toBe(true);
    expect(editor.getJSON().content?.[0]?.type).toBe("bulletList");
  });

  test("taskList: 체크박스 목록으로 감싼다", () => {
    const editor = fullEditor();
    expect(insertBlock(editor, spec("taskList"))).toBe(true);
    expect(editor.getJSON().content?.[0]?.type).toBe("taskList");
  });

  test("blockquote: 인용으로 감싼다", () => {
    const editor = fullEditor();
    expect(insertBlock(editor, spec("blockquote"))).toBe(true);
    expect(editor.getJSON().content?.[0]?.type).toBe("blockquote");
  });

  test("horizontalRule: 구분선을 삽입한다", () => {
    const editor = fullEditor();
    expect(insertBlock(editor, spec("horizontalRule"))).toBe(true);
    const types = (editor.getJSON().content ?? []).map((n) => n.type);
    expect(types).toContain("horizontalRule");
  });

  test("paragraph: 문단으로 돌린다 (heading → paragraph)", () => {
    const editor = fullEditor();
    insertBlock(editor, spec("heading1"));
    expect(insertBlock(editor, spec("paragraph"))).toBe(true);
    expect(editor.getJSON().content?.[0]?.type).toBe("paragraph");
  });

  test("표 spec 삽입 시 헤더 행 포함 표가 생긴다", () => {
    const e = makeEditorWithTable(); // Document/Paragraph/Text + TABLE_NODES
    const tableSpec = BLOCKS.find((b) => b.id === "table")!;
    expect(insertBlock(e, tableSpec)).toBe(true);
    expect(e.getHTML()).toContain("<table");
  });
});
