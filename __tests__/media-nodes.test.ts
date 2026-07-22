import { describe, expect, test } from "vitest";
import { getSchema } from "@tiptap/react";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import { MEDIA_NODES, mediaEditorProps } from "@/lib/editor/media-nodes";

// 미디어 노드(⑥⑧, §2.13) — 블록 레지스트리 계약(lib/editor/blocks.ts)의
// `image`·`fileBlock` 이름을 그대로 구현하고, 업로드 진입점(handleDrop/handlePaste)을
// mediaEditorProps로 노출한다(PostEditor 결합부 수정 없음 — 스캐폴드 계약).

const names = MEDIA_NODES.map((ext) => ext.name);

function makeSchema() {
  return getSchema([Document, Paragraph, Text, ...MEDIA_NODES]);
}

describe("MEDIA_NODES (블록 레지스트리 계약)", () => {
  test("image·fileBlock 노드를 계약된 이름 그대로 담는다", () => {
    expect(names).toContain("image");
    expect(names).toContain("fileBlock");
  });

  test("스키마가 정상적으로 만들어진다(P1 코어와 결합 가능)", () => {
    const schema = makeSchema();
    expect(schema.nodes.image).toBeDefined();
    expect(schema.nodes.fileBlock).toBeDefined();
  });
});

describe("fileBlock 직렬화 (content_doc 왕복)", () => {
  const attrs = {
    url: "https://test.supabase.co/storage/v1/object/public/post-attachments/u/7/x.pdf",
    name: "보고서.pdf",
    size: 12345,
  };

  test("url·name·size attrs가 JSON 왕복에서 보존된다", () => {
    const schema = makeSchema();
    const node = schema.nodeFromJSON({ type: "fileBlock", attrs });
    expect(node.toJSON()).toEqual({ type: "fileBlock", attrs });
  });

  test("attrs 기본값 — 빈 문서 조각에서도 안전하다", () => {
    const schema = makeSchema();
    const node = schema.nodeFromJSON({ type: "fileBlock" });
    expect(node.attrs).toEqual({ url: "", name: "", size: 0 });
  });

  test("블록 그룹의 원자 노드다(커서가 내부로 들어가지 않는다)", () => {
    const schema = makeSchema();
    const spec = schema.nodes.fileBlock.spec;
    expect(spec.group).toBe("block");
    expect(spec.atom).toBe(true);
  });
});

describe("mediaEditorProps (업로드 진입점 — §5.13)", () => {
  test("handleDrop과 handlePaste 함수를 노출한다", () => {
    expect(typeof mediaEditorProps.handleDrop).toBe("function");
    expect(typeof mediaEditorProps.handlePaste).toBe("function");
  });
});
