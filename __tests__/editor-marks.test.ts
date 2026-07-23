import { afterEach, describe, expect, test } from "vitest";
import { Editor } from "@tiptap/core";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import { MARKS, applyLink } from "@/lib/editor/marks";

// wt1 ① 플로팅 서식 툴바 — 마크 등록·링크 적용/해제 계약
// (스펙 docs/superpowers/specs/2026-07-21-editor-wt1-design.md §①).
// jsdom에서 헤드리스 Editor 로 마크 커맨드를 직접 검증한다.

let editors: Editor[] = [];

function makeEditor(content = "<p>안녕하세요</p>") {
  const editor = new Editor({
    element: document.createElement("div"),
    extensions: [Document, Paragraph, Text, ...MARKS],
    content,
  });
  editors.push(editor);
  return editor;
}

afterEach(() => {
  editors.forEach((e) => e.destroy());
  editors = [];
});

describe("MARKS 등록", () => {
  test("마크 6종(bold·italic·underline·strike·code·link)이 등록된다", () => {
    const names = MARKS.map((m) => m.name);
    for (const name of ["bold", "italic", "underline", "strike", "code", "link"]) {
      expect(names).toContain(name);
    }
  });

  test("등록된 마크가 실제로 동작한다 (굵게 토글)", () => {
    const editor = makeEditor();
    editor.commands.selectAll();
    editor.commands.toggleBold();
    expect(editor.isActive("bold")).toBe(true);
    editor.commands.toggleBold();
    expect(editor.isActive("bold")).toBe(false);
  });
});

describe("Color/Highlight (C1 — 글자색·배경색)", () => {
  test("setColor로 글자색 마크가 적용된다", () => {
    const editor = makeEditor();
    editor.chain().focus().insertContent("가").selectAll().setColor("#f0483e").run();
    expect(editor.getAttributes("textStyle").color).toBe("#f0483e");
  });

  test("toggleHighlight로 배경색 마크가 적용된다(multicolor)", () => {
    const editor = makeEditor();
    editor.chain().focus().insertContent("가").selectAll().toggleHighlight({ color: "#fff6d6" }).run();
    expect(editor.isActive("highlight", { color: "#fff6d6" })).toBe(true);
  });

  test("setFontSize로 글자 크기가 적용되고 unsetFontSize로 해제된다", () => {
    const editor = makeEditor();
    editor.chain().focus().insertContent("가").selectAll().setFontSize("20px").run();
    expect(editor.getAttributes("textStyle").fontSize).toBe("20px");
    editor.chain().focus().selectAll().unsetFontSize().run();
    expect(editor.getAttributes("textStyle").fontSize).toBeUndefined();
  });
});

describe("applyLink (링크 적용·해제)", () => {
  test("URL을 주면 선택 영역에 링크 마크를 적용한다", () => {
    const editor = makeEditor();
    editor.commands.selectAll();
    applyLink(editor, "https://example.com");
    expect(editor.isActive("link")).toBe(true);
    expect(editor.getAttributes("link").href).toBe("https://example.com");
  });

  test("링크는 rel=noopener noreferrer nofollow 기본값을 유지한다", () => {
    const editor = makeEditor();
    editor.commands.selectAll();
    applyLink(editor, "https://example.com");
    expect(editor.getHTML()).toContain('rel="noopener noreferrer nofollow"');
  });

  test("빈 값(공백 포함)은 링크 해제로 동작한다", () => {
    const editor = makeEditor();
    editor.commands.selectAll();
    applyLink(editor, "https://example.com");
    expect(editor.isActive("link")).toBe(true);
    editor.commands.selectAll();
    applyLink(editor, "   ");
    expect(editor.isActive("link")).toBe(false);
  });
});
