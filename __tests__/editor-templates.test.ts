import { describe, expect, test } from "vitest";
import { BLOCKS } from "@/lib/editor/blocks";
import { textToDoc, type EditorNode } from "@/lib/editor/doc";
import { TEMPLATES, isBlankDoc } from "@/lib/editor/templates";

// wt1 ⑨ 페이지 템플릿 — JSON 구조 단언(에디터 렌더 불요, 스키마 미등록 노드가
// 있어도 wt1 단독으로 성립 — 스펙 docs/superpowers/specs/2026-07-21-editor-wt1-design.md §⑨).

const BLOCK_TYPES = new Set(BLOCKS.map((b) => b.type));

function tpl(id: string) {
  const found = TEMPLATES.find((t) => t.id === id);
  if (!found) throw new Error(`TEMPLATES에 없는 id: ${id}`);
  return found;
}

function textOf(node: EditorNode | undefined): string {
  if (!node) return "";
  if (node.type === "text") return node.text ?? "";
  return (node.content ?? []).map(textOf).join("");
}

describe("TEMPLATES 카탈로그", () => {
  test("3종 — 회의록·할 일·메모", () => {
    expect(TEMPLATES.map((t) => t.label)).toEqual(["회의록", "할 일", "메모"]);
  });

  test("최상위 노드 타입은 BLOCKS의 type 문자열만 사용한다", () => {
    for (const t of TEMPLATES) {
      const doc = t.build();
      for (const node of doc.content ?? []) {
        expect(BLOCK_TYPES.has(node.type)).toBe(true);
      }
    }
  });
});

describe("회의록 템플릿", () => {
  const doc = tpl("meeting").build(new Date(2026, 6, 22));
  const content = doc.content ?? [];

  test("제목1 '회의록' + 날짜 문단으로 시작한다", () => {
    expect(content[0]).toMatchObject({ type: "heading", attrs: { level: 1 } });
    expect(textOf(content[0])).toBe("회의록");
    expect(content[1]?.type).toBe("paragraph");
    expect(textOf(content[1])).toBe("날짜: 2026년 7월 22일");
  });

  test("참석자 불릿 + 안건 번호 목록 + 액션아이템 체크박스를 담는다", () => {
    const types = content.map((n) => n.type);
    expect(types).toContain("bulletList");
    expect(types).toContain("orderedList");
    expect(types).toContain("taskList");
    // 체크박스 항목은 미완료 상태로 시작한다.
    const taskList = content.find((n) => n.type === "taskList");
    expect(taskList?.content?.[0]).toMatchObject({
      type: "taskItem",
      attrs: { checked: false },
    });
  });
});

describe("할 일 템플릿", () => {
  const doc = tpl("todo").build();
  const content = doc.content ?? [];

  test("제목1 + 체크박스 목록 3칸", () => {
    expect(content[0]).toMatchObject({ type: "heading", attrs: { level: 1 } });
    expect(textOf(content[0])).toBe("할 일");
    const taskList = content.find((n) => n.type === "taskList");
    expect(taskList?.content).toHaveLength(3);
    for (const item of taskList?.content ?? []) {
      expect(item).toMatchObject({ type: "taskItem", attrs: { checked: false } });
    }
  });
});

describe("메모 템플릿", () => {
  test("제목1 + 문단", () => {
    const content = tpl("memo").build().content ?? [];
    expect(content[0]).toMatchObject({ type: "heading", attrs: { level: 1 } });
    expect(textOf(content[0])).toBe("메모");
    expect(content[1]?.type).toBe("paragraph");
  });
});

describe("isBlankDoc (빈 글 노출 조건)", () => {
  test("빈 문서(내용 없음 / 빈 문단 하나)는 blank 다", () => {
    expect(isBlankDoc({ type: "doc" })).toBe(true);
    expect(isBlankDoc({ type: "doc", content: [] })).toBe(true);
    expect(isBlankDoc(textToDoc(""))).toBe(true); // content_doc 없음 && content "" 의 dual-read 결과
  });

  test("텍스트가 있으면 blank 가 아니다", () => {
    expect(isBlankDoc(textToDoc("안녕"))).toBe(false);
  });

  test("블록이 여러 개면 blank 가 아니다", () => {
    expect(isBlankDoc(textToDoc("\n"))).toBe(false); // 빈 문단 2개 = 이미 편집 흔적
  });
});
