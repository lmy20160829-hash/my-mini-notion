import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { PostTree } from "@/components/tree/PostTree";
import type { Post } from "@/lib/store";

// 사이드바 페이지 트리(⑤, §4.7) — 들여쓰기 12px/단계, 접기 삼각형(자식 있는 항목만),
// hover `+`(하위 페이지 생성). 순수 표시 컴포넌트라 콜백만 검증한다.

function post(id: string, title: string, parentId: string | null = null): Post {
  return {
    id,
    title,
    content: "",
    createdAt: 0,
    deletedAt: null,
    contentDoc: null,
    parentId,
  };
}

const POSTS = [
  post("3", "손자", "2"),
  post("2", "자식", "1"),
  post("1", "부모"),
  post("4", "다른 루트"),
];

function renderTree(over: Partial<Parameters<typeof PostTree>[0]> = {}) {
  const props = {
    posts: POSTS,
    activeId: null as string | null,
    collapsedIds: [] as string[],
    onOpen: vi.fn(),
    onToggle: vi.fn(),
    onCreateChild: vi.fn(),
    ...over,
  };
  return { ...render(<PostTree {...props} />), props };
}

afterEach(cleanup);

/** 렌더된 행의 (제목, 들여쓰기 px) 목록 — 구조를 한 번에 단언한다. */
function rows(container: HTMLElement): Array<[string | null, string]> {
  return Array.from(container.querySelectorAll(".tree-row")).map((row) => [
    row.querySelector(".sidebar-item__label")?.textContent ?? null,
    (row as HTMLElement).style.paddingLeft || "0px",
  ]);
}

test("중첩 구조를 단계당 12px 들여쓰기로 렌더한다", () => {
  const { container } = renderTree();
  expect(rows(container)).toEqual([
    ["부모", "0px"],
    ["자식", "12px"],
    ["손자", "24px"],
    ["다른 루트", "0px"],
  ]);
});

test("접기 삼각형은 자식 있는 항목에만 나온다", () => {
  const { container } = renderTree();
  const toggles = Array.from(container.querySelectorAll("button.tree-toggle"));
  // 부모·자식만 자식을 가진다(손자·다른 루트는 스페이서).
  expect(toggles).toHaveLength(2);
  expect(toggles[0].getAttribute("aria-expanded")).toBe("true");
});

test("collapsedIds에 있는 항목의 자손은 렌더하지 않는다", () => {
  const { container } = renderTree({ collapsedIds: ["1"] });
  expect(rows(container).map(([label]) => label)).toEqual(["부모", "다른 루트"]);
});

test("접힌 항목의 삼각형을 누르면 onToggle(id, false)로 펼침을 요청한다", () => {
  const { container, props } = renderTree({ collapsedIds: ["1"] });
  fireEvent.click(container.querySelector("button.tree-toggle")!);
  expect(props.onToggle).toHaveBeenCalledWith("1", false);
});

test("펼친 항목의 삼각형을 누르면 onToggle(id, true)로 접힘을 요청한다", () => {
  const { container, props } = renderTree();
  fireEvent.click(container.querySelector("button.tree-toggle")!);
  expect(props.onToggle).toHaveBeenCalledWith("1", true);
});

test("항목을 누르면 onOpen(id), hover `+`를 누르면 onCreateChild(id)", () => {
  const { container, props } = renderTree();
  const firstRow = container.querySelector(".tree-row")!;
  fireEvent.click(firstRow.querySelector(".sidebar-item")!);
  expect(props.onOpen).toHaveBeenCalledWith("1");
  fireEvent.click(firstRow.querySelector(".tree-add")!);
  expect(props.onCreateChild).toHaveBeenCalledWith("1");
});

test("활성 글(activeId)에 is-active를 붙이고, 빈 제목은 '제목 없음'으로 표시한다", () => {
  const { container } = renderTree({
    posts: [post("1", "  ")],
    activeId: "1",
  });
  const item = container.querySelector(".sidebar-item")!;
  expect(item.className).toContain("is-active");
  expect(item.querySelector(".sidebar-item__label")!.textContent).toBe(
    "제목 없음"
  );
  expect(item.getAttribute("title")).toBe("제목 없음");
});
