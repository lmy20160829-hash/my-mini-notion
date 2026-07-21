import { describe, expect, test } from "vitest";
import { BLOCKS, type BlockSpec } from "@/lib/editor/blocks";

// 블록 레지스트리 계약(스펙 2026-07-21-editor-sprint-overview.md) —
// wt1(슬래시 메뉴·템플릿)은 이 레지스트리만 소비하고, wt2(블록 구현)는 여기 선언된
// 노드 이름을 그대로 구현한다. 이 테스트가 두 워크트리의 접점을 잠근다.

const CONTRACT: Array<Pick<BlockSpec, "type"> & Partial<BlockSpec>> = [
  { type: "paragraph" },
  { type: "heading", attrs: { level: 1 } },
  { type: "heading", attrs: { level: 2 } },
  { type: "heading", attrs: { level: 3 } },
  { type: "bulletList" },
  { type: "orderedList" },
  { type: "taskList" },
  { type: "blockquote" },
  { type: "callout" },
  { type: "toggle" },
  { type: "horizontalRule" },
  { type: "image" },
  { type: "fileBlock" },
];

describe("BLOCKS 레지스트리", () => {
  test("계약된 13개 항목(노드 타입 × 속성)이 전부 선언돼 있다", () => {
    for (const item of CONTRACT) {
      const found = BLOCKS.find(
        (b) =>
          b.type === item.type &&
          JSON.stringify(b.attrs ?? null) ===
            JSON.stringify(item.attrs ?? b.attrs ?? null)
      );
      expect(found, `${item.type}${JSON.stringify(item.attrs ?? "")}`).toBeDefined();
    }
    expect(BLOCKS).toHaveLength(CONTRACT.length);
  });

  test("id는 고유하고, 한국어 label과 슬래시 검색 keywords를 가진다", () => {
    const ids = BLOCKS.map((b) => b.id);
    expect(new Set(ids).size).toBe(BLOCKS.length);
    for (const b of BLOCKS) {
      expect(b.label.length).toBeGreaterThan(0);
      expect(b.keywords.length).toBeGreaterThan(0);
    }
  });
});
