import { describe, expect, test } from "vitest";
import { newInsertPayload, rowToPost, sortPosts } from "@/lib/posts";

// page 테이블 행 ↔ 클라이언트 Post 매핑 규칙 (data-model.md §2)
describe("rowToPost", () => {
  test("bigint id를 문자열로, created_at을 epoch ms로 매핑한다", () => {
    expect(
      rowToPost({
        id: 12,
        created_at: "2026-07-16T03:04:05.000Z",
        title: "첫 글",
        content: "본문",
        user_id: "u-1",
      })
    ).toEqual({
      id: "12",
      title: "첫 글",
      content: "본문",
      createdAt: Date.parse("2026-07-16T03:04:05.000Z"),
    });
  });

  test("title/content가 null이면 빈 문자열로 채운다", () => {
    const post = rowToPost({
      id: 3,
      created_at: "2026-07-16T00:00:00.000Z",
      title: null,
      content: null,
      user_id: "u-1",
    });
    expect(post.title).toBe("");
    expect(post.content).toBe("");
  });

  test("favorite 필드를 만들지 않는다(기능 제거)", () => {
    const post = rowToPost({
      id: 1,
      created_at: "2026-07-16T00:00:00.000Z",
      title: "t",
      content: "c",
      user_id: "u-1",
    });
    expect("favorite" in post).toBe(false);
  });
});

describe("sortPosts", () => {
  test("createdAt 내림차순(최신 우선)으로 정렬한다", () => {
    const posts = [
      { id: "1", title: "a", content: "", createdAt: 100 },
      { id: "2", title: "b", content: "", createdAt: 300 },
      { id: "3", title: "c", content: "", createdAt: 200 },
    ];
    expect(sortPosts(posts).map((p) => p.id)).toEqual(["2", "3", "1"]);
  });

  test("원본 배열을 변형하지 않는다", () => {
    const posts = [
      { id: "1", title: "a", content: "", createdAt: 100 },
      { id: "2", title: "b", content: "", createdAt: 300 },
    ];
    sortPosts(posts);
    expect(posts.map((p) => p.id)).toEqual(["1", "2"]);
  });
});

describe("newInsertPayload", () => {
  test("제목을 trim하고 빈 본문·소유자 user_id를 담는다", () => {
    expect(newInsertPayload("  새 글  ", "user-123")).toEqual({
      title: "새 글",
      content: "",
      user_id: "user-123",
    });
  });

  test("제목이 비어도(빈 문자열) 허용한다", () => {
    expect(newInsertPayload("", "user-123")).toEqual({
      title: "",
      content: "",
      user_id: "user-123",
    });
  });
});
