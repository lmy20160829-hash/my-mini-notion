import { describe, expect, test } from "vitest";
import { ancestorChain, buildTree, descendantIds } from "@/lib/tree";

// 페이지 중첩(⑤)의 표시 계층 순수 로직 (docs/superpowers/specs/2026-07-21-editor-wt3-design.md).
// buildTree는 어떤 입력(고아·순환·자기참조·휴지통 부모)에도 안전하게 전체 글을
// 정확히 한 번씩 담은 트리를 돌려줘야 한다 — 트리는 표시 계층일 뿐, 데이터는 평면이다.

type Row = { id: string; parentId: string | null };

function p(id: string, parentId: string | null = null): Row {
  return { id, parentId };
}

/** 트리를 "id(자식,...)" 형태로 직렬화 — 구조 단언을 읽기 쉽게 한다. */
function shape(nodes: ReturnType<typeof buildTree<Row>>): string {
  return nodes
    .map((n) =>
      n.children.length > 0 ? `${n.post.id}(${shape(n.children)})` : n.post.id
    )
    .join(",");
}

describe("buildTree", () => {
  test("parentId가 모두 null이면 입력 순서 그대로 루트 목록이 된다", () => {
    expect(shape(buildTree([p("3"), p("2"), p("1")]))).toBe("3,2,1");
  });

  test("부모-자식-손자를 중첩 구조로 만든다", () => {
    const tree = buildTree([p("c", "b"), p("b", "a"), p("a")]);
    expect(shape(tree)).toBe("a(b(c))");
  });

  test("루트와 자식의 순서는 입력(최신 우선) 순서를 유지한다", () => {
    // 입력: 새 글 c(a의 자식), 루트 b, 루트 a — 루트는 b,a 순서, a 밑에 c.
    const tree = buildTree([p("c", "a"), p("b"), p("a"), p("d", "a")]);
    expect(shape(tree)).toBe("b,a(c,d)");
  });

  test("부모가 목록에 없는 고아(휴지통 부모 포함)는 루트로 승격된다", () => {
    // 부모가 소프트 삭제되어 살아 있는 목록에 없다 → 자식은 루트로 표시(스펙 ⑤).
    const tree = buildTree([p("child", "trashed"), p("root")]);
    expect(shape(tree)).toBe("child,root");
  });

  test("자기 자신을 부모로 가리키는 행도 루트로 처리한다", () => {
    expect(shape(buildTree([p("a", "a"), p("b")]))).toBe("a,b");
  });

  test("순환(a→b→a) 입력도 무한 루프 없이 전체를 한 번씩 담는다", () => {
    const tree = buildTree([p("a", "b"), p("b", "a"), p("c")]);
    // 어떤 형태로든 a·b·c가 정확히 한 번씩 나타나야 한다.
    const ids: string[] = [];
    const walk = (nodes: typeof tree) => {
      for (const n of nodes) {
        ids.push(n.post.id);
        walk(n.children);
      }
    };
    walk(tree);
    expect([...ids].sort()).toEqual(["a", "b", "c"]);
  });

  test("빈 입력은 빈 트리", () => {
    expect(buildTree([])).toEqual([]);
  });
});

describe("descendantIds", () => {
  const posts = [p("a"), p("b", "a"), p("c", "b"), p("d"), p("e", "a")];

  test("모든 자손(자식·손자)을 담고 자기 자신은 제외한다", () => {
    expect([...descendantIds(posts, "a")].sort()).toEqual(["b", "c", "e"]);
    expect(descendantIds(posts, "a").has("a")).toBe(false);
  });

  test("잎(자식 없음)은 빈 집합", () => {
    expect(descendantIds(posts, "d").size).toBe(0);
  });

  test("없는 id는 빈 집합", () => {
    expect(descendantIds(posts, "zz").size).toBe(0);
  });

  test("순환 입력도 종결되고 시작 id는 제외한다", () => {
    const cyclic = [p("a", "b"), p("b", "a")];
    const ids = descendantIds(cyclic, "a");
    expect(ids.has("b")).toBe(true);
    expect(ids.has("a")).toBe(false);
  });
});

describe("ancestorChain", () => {
  const posts = [p("c", "b"), p("b", "a"), p("a")];

  test("조상 체인을 루트부터 직계 부모 순서로 돌려준다", () => {
    expect(ancestorChain(posts, "c").map((x) => x.id)).toEqual(["a", "b"]);
  });

  test("루트 글은 빈 체인", () => {
    expect(ancestorChain(posts, "a")).toEqual([]);
  });

  test("부모가 목록에 없으면(휴지통) 거기서 끊는다", () => {
    expect(ancestorChain([p("x", "gone")], "x")).toEqual([]);
  });

  test("순환 입력도 무한 루프 없이 종결된다", () => {
    const cyclic = [p("a", "b"), p("b", "a")];
    const chain = ancestorChain(cyclic, "a");
    expect(chain.length).toBeLessThanOrEqual(1);
  });
});
