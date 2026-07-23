import { afterEach, describe, expect, test, vi } from "vitest";
import { cleanup, render, waitFor } from "@testing-library/react";
import { PostEditor, buildEditPatch } from "@/components/editor/PostEditor";
import { textToDoc } from "@/lib/editor/doc";

// P1 에디터 교체(Tiptap, 문단 전용) — 스펙 2026-07-21-editor-sprint-overview.md.
// jsdom에서 ProseMirror 타이핑 시뮬레이션은 신뢰할 수 없으므로,
// 렌더(마운트·내용 표시·편집 가능)와 저장 페이로드(buildEditPatch)를 나눠 검증한다.
// 실제 dual-write 관통은 store.test.tsx("contentDoc 패치가 content_doc 컬럼으로…")가 지킨다.

afterEach(() => cleanup());

describe("buildEditPatch (저장 페이로드 계약)", () => {
  test("content(플레인 projection)와 contentDoc(블록 JSON)을 함께 만든다", () => {
    const doc = textToDoc("첫 줄\n둘째 줄");
    expect(buildEditPatch(doc)).toEqual({
      content: "첫 줄\n둘째 줄",
      contentDoc: doc,
    });
  });

  test("빈 문서는 빈 content로 projection 된다", () => {
    const doc = textToDoc("");
    expect(buildEditPatch(doc).content).toBe("");
  });
});

describe("PostEditor 렌더", () => {
  test("initialDoc의 텍스트를 .detail-content 에 렌더하고 편집 가능 상태다", async () => {
    const { container } = render(
      <PostEditor
        initialDoc={textToDoc("기존 본문")}
        placeholder="내용을 입력하세요."
        onDocChange={vi.fn()}
      />
    );

    await waitFor(() => {
      const el = container.querySelector(".detail-content");
      expect(el).not.toBeNull();
      expect(el!.textContent).toContain("기존 본문");
      expect(el!.getAttribute("contenteditable")).toBe("true");
    });
  });

  // B2 결선 검증 — TopToolbar(§2.14)가 EditorContent 형제로 결합됐는지 최소 확인.
  test("TopToolbar(상단 고정 툴바)를 렌더한다", async () => {
    const { container } = render(
      <PostEditor
        initialDoc={textToDoc("기존 본문")}
        placeholder="내용을 입력하세요."
        onDocChange={vi.fn()}
      />
    );

    await waitFor(() => {
      const bar = container.querySelector('.top-toolbar[role="toolbar"]');
      expect(bar).not.toBeNull();
      expect(bar!.getAttribute("aria-label")).toBe("상단 툴바");
    });
  });
});
