import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  fetchMyPosts,
  insertPost,
  newInsertPayload,
  rowToPost,
  sortPosts,
} from "@/lib/posts";

// Supabase 클라이언트 목: 실제 { data, error } 구조와 page 행 형태를 그대로 반영한다.
const fromMock = vi.fn();

vi.mock("@/lib/supabase", () => ({
  isSupabaseConfigured: true,
  getSupabase: () => ({ from: fromMock }),
}));

type Result = { data?: unknown; error?: unknown };

/** 체이닝 가능한 쿼리 빌더 목. await 하면 주어진 결과로 resolve 된다. */
function makeQuery(result: Result) {
  const q: Record<string, unknown> = {
    then: (res: (v: Result) => unknown, rej: (e: unknown) => unknown) =>
      Promise.resolve(result).then(res, rej),
  };
  for (const m of ["insert", "select", "order", "update", "delete", "eq", "single"]) {
    q[m] = vi.fn(() => q);
  }
  return q as Record<string, ReturnType<typeof vi.fn>> & Result;
}

beforeEach(() => {
  fromMock.mockReset();
});

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

describe("insertPost", () => {
  test("page 테이블에 newInsertPayload를 INSERT하고 반환 행을 Post로 매핑한다", async () => {
    const q = makeQuery({
      data: {
        id: 42,
        created_at: "2026-07-16T09:00:00.000Z",
        title: "새 글",
        content: "",
        user_id: "user-1",
      },
      error: null,
    });
    fromMock.mockReturnValue(q);

    const post = await insertPost("  새 글  ", "user-1");

    expect(fromMock).toHaveBeenCalledWith("page");
    expect(q.insert).toHaveBeenCalledWith({
      title: "새 글",
      content: "",
      user_id: "user-1",
    });
    expect(q.select).toHaveBeenCalled();
    expect(q.single).toHaveBeenCalled();
    expect(post).toEqual({
      id: "42",
      title: "새 글",
      content: "",
      createdAt: Date.parse("2026-07-16T09:00:00.000Z"),
    });
  });

  test("서버 오류면 throw 한다(호출부가 실패를 알 수 있어야 한다)", async () => {
    fromMock.mockReturnValue(
      makeQuery({ data: null, error: { message: "insert 거부" } })
    );
    await expect(insertPost("제목", "user-1")).rejects.toThrow("insert 거부");
  });
});

describe("fetchMyPosts", () => {
  test("page를 created_at 내림차순으로 조회해 Post[]로 매핑한다", async () => {
    const q = makeQuery({
      data: [
        {
          id: 2,
          created_at: "2026-07-16T10:00:00.000Z",
          title: "나중 글",
          content: "b",
          user_id: "user-1",
        },
        {
          id: 1,
          created_at: "2026-07-15T10:00:00.000Z",
          title: null,
          content: null,
          user_id: "user-1",
        },
      ],
      error: null,
    });
    fromMock.mockReturnValue(q);

    const posts = await fetchMyPosts();

    expect(fromMock).toHaveBeenCalledWith("page");
    expect(q.select).toHaveBeenCalledWith("*");
    expect(q.order).toHaveBeenCalledWith("created_at", { ascending: false });
    // 사용자 필터를 클라이언트에서 걸지 않는다 — 격리는 RLS(page_select_own)가 강제한다.
    expect(q.eq).not.toHaveBeenCalled();
    expect(posts).toEqual([
      {
        id: "2",
        title: "나중 글",
        content: "b",
        createdAt: Date.parse("2026-07-16T10:00:00.000Z"),
      },
      {
        id: "1",
        title: "",
        content: "",
        createdAt: Date.parse("2026-07-15T10:00:00.000Z"),
      },
    ]);
  });

  test("정렬이 흐트러진 응답도 최신 우선으로 정렬한다", async () => {
    fromMock.mockReturnValue(
      makeQuery({
        data: [
          {
            id: 1,
            created_at: "2026-07-15T10:00:00.000Z",
            title: "옛 글",
            content: "",
            user_id: "user-1",
          },
          {
            id: 2,
            created_at: "2026-07-16T10:00:00.000Z",
            title: "새 글",
            content: "",
            user_id: "user-1",
          },
        ],
        error: null,
      })
    );
    expect((await fetchMyPosts()).map((p) => p.id)).toEqual(["2", "1"]);
  });

  test("서버 오류면 throw 한다", async () => {
    fromMock.mockReturnValue(
      makeQuery({ data: null, error: { message: "조회 실패" } })
    );
    await expect(fetchMyPosts()).rejects.toThrow("조회 실패");
  });

  test("data가 null이면 빈 배열", async () => {
    fromMock.mockReturnValue(makeQuery({ data: null, error: null }));
    expect(await fetchMyPosts()).toEqual([]);
  });
});
