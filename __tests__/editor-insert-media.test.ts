import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { Editor } from "@tiptap/core";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import { insertBlock } from "@/lib/editor/insert";
import { BLOCKS } from "@/lib/editor/blocks";
import { MEDIA_NODES, openAttachmentPicker } from "@/lib/editor/media-nodes";

// P3 통합 결선(wt1 ↔ wt3): 슬래시 메뉴의 이미지/파일 항목은 빈 노드를 삽입하는 게
// 아니라 파일 선택기(openAttachmentPicker)를 연다 — 업로드 성공 시에만 노드가
// 삽입된다(§5.13 "실패 시 블록 미삽입"). wt3 스펙의 "결선은 P3 머지 몫" 이행.

vi.mock("@/lib/attachments", () => ({
  getAttachmentContext: () => null,
  uploadAttachment: vi.fn(),
  validateAttachment: () => null,
}));

vi.mock("@/components/editor/nodes-media/FileBlockView", () => ({
  FileBlockView: () => null,
}));

let editor: Editor;

beforeEach(() => {
  editor = new Editor({
    extensions: [Document, Paragraph, Text, ...MEDIA_NODES],
    content: { type: "doc", content: [{ type: "paragraph" }] },
  });
});

afterEach(() => {
  editor.destroy();
  vi.restoreAllMocks();
});

describe("insertBlock — 미디어 항목은 선택기를 연다 (P3 결선)", () => {
  const imageSpec = BLOCKS.find((b) => b.id === "image")!;
  const fileSpec = BLOCKS.find((b) => b.id === "fileBlock")!;

  test("image: 빈 이미지 노드를 삽입하지 않고 이미지 accept로 선택기를 연다", () => {
    const clickSpy = vi
      .spyOn(HTMLInputElement.prototype, "click")
      .mockImplementation(() => {});
    const before = JSON.stringify(editor.getJSON());

    expect(insertBlock(editor, imageSpec)).toBe(true);

    expect(clickSpy).toHaveBeenCalledTimes(1); // 파일 선택 다이얼로그 오픈
    expect(JSON.stringify(editor.getJSON())).toBe(before); // 문서 불변(업로드 전 미삽입)
  });

  test("fileBlock: 빈 파일 카드를 삽입하지 않고 선택기를 연다", () => {
    const clickSpy = vi
      .spyOn(HTMLInputElement.prototype, "click")
      .mockImplementation(() => {});
    const before = JSON.stringify(editor.getJSON());

    expect(insertBlock(editor, fileSpec)).toBe(true);

    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(editor.getJSON())).toBe(before);
  });

  test("openAttachmentPicker 자체는 accept를 input에 전달한다", () => {
    let captured: HTMLInputElement | null = null;
    vi.spyOn(HTMLInputElement.prototype, "click").mockImplementation(function (
      this: HTMLInputElement
    ) {
      captured = this;
    });

    openAttachmentPicker(editor.view, "image/png,image/jpeg");

    expect(captured).not.toBeNull();
    expect(captured!.accept).toBe("image/png,image/jpeg");
  });
});
