import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  deletePostById,
  fetchMyPosts,
  fetchTrashedPosts,
  insertPost,
  newInsertPayload,
  restorePost,
  rowToPost,
  softDeletePost,
  sortPosts,
  updatePostFields,
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
  for (const m of ["insert", "select", "order", "update", "delete", "eq", "single", "is", "not"]) {
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
        deleted_at: null,
      })
    ).toEqual({
      id: "12",
      title: "첫 글",
      content: "본문",
      createdAt: Date.parse("2026-07-16T03:04:05.000Z"),
      deletedAt: null,
      contentDoc: null,
      parentId: null,
      icon: null,
    });
  });

  test("parent_id(bigint)를 문자열 parentId로, 없으면 null로 매핑한다 (⑤ 중첩)", () => {
    const base = {
      id: 9,
      created_at: "2026-07-16T00:00:00.000Z",
      title: "자식 글",
      content: "",
      user_id: "u-1",
      deleted_at: null,
    };
    expect(rowToPost({ ...base, parent_id: 3 }).parentId).toBe("3");
    expect(rowToPost({ ...base, parent_id: null }).parentId).toBe(null);
    expect(rowToPost(base).parentId).toBe(null); // 컬럼 추가 전 목·스냅샷 호환
  });

  test("icon을 그대로 매핑하고 없으면 null (⑦ 이모지 아이콘)", () => {
    const base = {
      id: 9,
      created_at: "2026-07-16T00:00:00.000Z",
      title: "글",
      content: "",
      user_id: "u-1",
      deleted_at: null,
    };
    expect(rowToPost({ ...base, icon: "🔥" }).icon).toBe("🔥");
    expect(rowToPost({ ...base, icon: null }).icon).toBe(null);
    expect(rowToPost(base).icon).toBe(null); // 컬럼 추가 전 목·스냅샷 호환
  });

  test("content_doc이 있으면 contentDoc으로, 없으면 null로 매핑한다 (dual-read)", () => {
    const doc = {
      type: "doc" as const,
      content: [
        { type: "paragraph", content: [{ type: "text", text: "블록" }] },
      ],
    };
    const base = {
      id: 1,
      created_at: "2026-07-16T00:00:00.000Z",
      title: "t",
      content: "블록",
      user_id: "u-1",
      deleted_at: null,
    };
    expect(rowToPost({ ...base, content_doc: doc }).contentDoc).toEqual(doc);
    expect(rowToPost({ ...base, content_doc: null }).contentDoc).toBe(null);
    expect(rowToPost(base).contentDoc).toBe(null); // 옛 스냅샷·목 호환
  });

  test("deleted_at이 있으면 epoch ms로, 없으면 null로 매핑한다", () => {
    expect(
      rowToPost({
        id: 5,
        created_at: "2026-07-16T00:00:00.000Z",
        title: "지운 글",
        content: "",
        user_id: "u-1",
        deleted_at: "2026-07-20T12:00:00.000Z",
      }).deletedAt
    ).toBe(Date.parse("2026-07-20T12:00:00.000Z"));
  });

  test("title/content가 null이면 빈 문자열로 채운다", () => {
    const post = rowToPost({
      id: 3,
      created_at: "2026-07-16T00:00:00.000Z",
      title: null,
      content: null,
      user_id: "u-1",
      deleted_at: null,
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
      deleted_at: null,
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

  test("parentId를 주면 parent_id 컬럼으로 담는다 (⑤ 하위 페이지 생성)", () => {
    expect(newInsertPayload("자식", "user-123", "77")).toEqual({
      title: "자식",
      content: "",
      user_id: "user-123",
      parent_id: "77",
    });
  });

  test("parentId가 null이거나 생략되면 parent_id를 보내지 않는다(루트 글)", () => {
    expect("parent_id" in newInsertPayload("루트", "user-123", null)).toBe(false);
    expect("parent_id" in newInsertPayload("루트", "user-123")).toBe(false);
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
      deletedAt: null,
      contentDoc: null,
      parentId: null,
      icon: null,
    });
  });

  test("parentId를 주면 INSERT 페이로드에 parent_id가 담긴다 (⑤)", async () => {
    const q = makeQuery({
      data: {
        id: 43,
        created_at: "2026-07-16T09:00:00.000Z",
        title: "",
        content: "",
        user_id: "user-1",
        parent_id: 42,
      },
      error: null,
    });
    fromMock.mockReturnValue(q);

    const post = await insertPost("", "user-1", "42");

    expect(q.insert).toHaveBeenCalledWith({
      title: "",
      content: "",
      user_id: "user-1",
      parent_id: "42",
    });
    expect(post.parentId).toBe("42");
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
    // 휴지통(소프트 삭제) 글은 목록·사이드바에서 제외한다.
    expect(q.is).toHaveBeenCalledWith("deleted_at", null);
    expect(posts).toEqual([
      {
        id: "2",
        title: "나중 글",
        content: "b",
        createdAt: Date.parse("2026-07-16T10:00:00.000Z"),
        deletedAt: null,
        contentDoc: null,
        parentId: null,
        icon: null,
      },
      {
        id: "1",
        title: "",
        content: "",
        createdAt: Date.parse("2026-07-15T10:00:00.000Z"),
        deletedAt: null,
        contentDoc: null,
        parentId: null,
        icon: null,
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

describe("deletePostById", () => {
  test("id로 DELETE 하고 .select로 삭제된 행을 확인한다(A2)", async () => {
    const q = makeQuery({ data: [{ id: 7 }], error: null });
    fromMock.mockReturnValue(q);

    await deletePostById("7");

    expect(fromMock).toHaveBeenCalledWith("page");
    expect(q.delete).toHaveBeenCalled();
    expect(q.eq).toHaveBeenCalledWith("id", "7");
    // RLS 거부는 에러가 아니라 0행이므로, 삭제된 행을 돌려받아야 성공을 안다.
    expect(q.select).toHaveBeenCalledWith("id");
  });

  test("서버 오류면 throw 한다", async () => {
    fromMock.mockReturnValue(makeQuery({ data: null, error: { message: "삭제 실패" } }));
    await expect(deletePostById("7")).rejects.toThrow("삭제 실패");
  });

  test("에러 없이 0행이면(RLS 무성음 거부) 실패로 throw 한다(A2)", async () => {
    fromMock.mockReturnValue(makeQuery({ data: [], error: null }));
    await expect(deletePostById("7")).rejects.toThrow(
      "게시글을 찾지 못해 삭제하지 못했습니다."
    );
  });
});

describe("softDeletePost (휴지통으로 이동)", () => {
  test("deleted_at을 현재 시각(ISO)으로 UPDATE 하고 select('id')로 확인한다", async () => {
    const q = makeQuery({ data: [{ id: 7 }], error: null });
    fromMock.mockReturnValue(q);

    const before = Date.now();
    await softDeletePost("7");

    expect(fromMock).toHaveBeenCalledWith("page");
    const patch = q.update.mock.calls[0][0] as { deleted_at: string };
    const ts = Date.parse(patch.deleted_at);
    expect(Number.isFinite(ts)).toBe(true);
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(Date.now());
    expect(q.eq).toHaveBeenCalledWith("id", "7");
    expect(q.select).toHaveBeenCalledWith("id");
  });

  test("서버 오류면 throw 한다", async () => {
    fromMock.mockReturnValue(
      makeQuery({ data: null, error: { message: "소프트 삭제 실패" } })
    );
    await expect(softDeletePost("7")).rejects.toThrow("소프트 삭제 실패");
  });

  // RLS가 거부한 UPDATE는 에러가 아니라 0행이다(A2). 조용히 성공으로 넘기면 안 된다.
  test("영향받은 행이 0개면 throw 한다(A2 계약)", async () => {
    fromMock.mockReturnValue(makeQuery({ data: [], error: null }));
    await expect(softDeletePost("7")).rejects.toThrow(
      "게시글을 찾지 못해 삭제하지 못했습니다."
    );
  });
});

describe("restorePost (휴지통에서 복원)", () => {
  test("deleted_at을 null로 UPDATE 하고 select('id')로 확인한다", async () => {
    const q = makeQuery({ data: [{ id: 7 }], error: null });
    fromMock.mockReturnValue(q);

    await restorePost("7");

    expect(fromMock).toHaveBeenCalledWith("page");
    expect(q.update).toHaveBeenCalledWith({ deleted_at: null });
    expect(q.eq).toHaveBeenCalledWith("id", "7");
    expect(q.select).toHaveBeenCalledWith("id");
  });

  test("서버 오류면 throw 한다", async () => {
    fromMock.mockReturnValue(
      makeQuery({ data: null, error: { message: "복원 실패" } })
    );
    await expect(restorePost("7")).rejects.toThrow("복원 실패");
  });

  test("영향받은 행이 0개면 throw 한다(A2 계약)", async () => {
    fromMock.mockReturnValue(makeQuery({ data: [], error: null }));
    await expect(restorePost("7")).rejects.toThrow(
      "게시글을 찾지 못해 복원하지 못했습니다."
    );
  });
});

describe("fetchTrashedPosts", () => {
  test("deleted_at이 있는 행만 deleted_at 내림차순으로 조회한다", async () => {
    const q = makeQuery({
      data: [
        {
          id: 2,
          created_at: "2026-07-15T00:00:00.000Z",
          title: "나중에 지운 글",
          content: "b",
          user_id: "user-1",
          deleted_at: "2026-07-20T12:00:00.000Z",
        },
        {
          id: 1,
          created_at: "2026-07-16T00:00:00.000Z",
          title: "먼저 지운 글",
          content: "a",
          user_id: "user-1",
          deleted_at: "2026-07-19T12:00:00.000Z",
        },
      ],
      error: null,
    });
    fromMock.mockReturnValue(q);

    const posts = await fetchTrashedPosts();

    expect(fromMock).toHaveBeenCalledWith("page");
    expect(q.select).toHaveBeenCalledWith("*");
    expect(q.not).toHaveBeenCalledWith("deleted_at", "is", null);
    expect(q.order).toHaveBeenCalledWith("deleted_at", { ascending: false });
    expect(posts.map((p) => p.id)).toEqual(["2", "1"]);
    expect(posts[0].deletedAt).toBe(Date.parse("2026-07-20T12:00:00.000Z"));
  });

  test("정렬이 흐트러진 응답도 삭제 시각 내림차순으로 정렬한다", async () => {
    fromMock.mockReturnValue(
      makeQuery({
        data: [
          {
            id: 1,
            created_at: "2026-07-16T00:00:00.000Z",
            title: "먼저 지운 글",
            content: "",
            user_id: "user-1",
            deleted_at: "2026-07-19T12:00:00.000Z",
          },
          {
            id: 2,
            created_at: "2026-07-15T00:00:00.000Z",
            title: "나중에 지운 글",
            content: "",
            user_id: "user-1",
            deleted_at: "2026-07-20T12:00:00.000Z",
          },
        ],
        error: null,
      })
    );
    expect((await fetchTrashedPosts()).map((p) => p.id)).toEqual(["2", "1"]);
  });

  test("서버 오류면 throw 한다", async () => {
    fromMock.mockReturnValue(
      makeQuery({ data: null, error: { message: "휴지통 조회 실패" } })
    );
    await expect(fetchTrashedPosts()).rejects.toThrow("휴지통 조회 실패");
  });

  test("data가 null이면 빈 배열", async () => {
    fromMock.mockReturnValue(makeQuery({ data: null, error: null }));
    expect(await fetchTrashedPosts()).toEqual([]);
  });
});

describe("updatePostFields", () => {
  test("id로 UPDATE 하고 .select로 갱신된 행을 확인한다(A2)", async () => {
    const q = makeQuery({ data: [{ id: 7 }], error: null });
    fromMock.mockReturnValue(q);

    await updatePostFields("7", { title: "고친 제목", content: "고친 본문" });

    expect(fromMock).toHaveBeenCalledWith("page");
    expect(q.update).toHaveBeenCalledWith({
      title: "고친 제목",
      content: "고친 본문",
    });
    expect(q.eq).toHaveBeenCalledWith("id", "7");
    expect(q.select).toHaveBeenCalledWith("id");
  });

  test("contentDoc은 content_doc 컬럼으로 매핑해 dual-write 한다", async () => {
    const q = makeQuery({ data: [{ id: 7 }], error: null });
    fromMock.mockReturnValue(q);
    const doc = {
      type: "doc" as const,
      content: [
        { type: "paragraph", content: [{ type: "text", text: "본문" }] },
      ],
    };

    await updatePostFields("7", { content: "본문", contentDoc: doc });

    // 클라이언트 필드명(contentDoc)이 아니라 DB 컬럼명(content_doc)으로 나가야 한다.
    expect(q.update).toHaveBeenCalledWith({ content: "본문", content_doc: doc });
  });

  test("일부 필드만 patch 할 수 있다", async () => {
    const q = makeQuery({ data: [{ id: 7 }], error: null });
    fromMock.mockReturnValue(q);
    await updatePostFields("7", { content: "본문만" });
    expect(q.update).toHaveBeenCalledWith({ content: "본문만" });
  });

  test("parentId는 parent_id 컬럼으로 매핑한다 (⑤ — null로 루트 승격 포함)", async () => {
    const q = makeQuery({ data: [{ id: 7 }], error: null });
    fromMock.mockReturnValue(q);
    await updatePostFields("7", { parentId: "3" });
    expect(q.update).toHaveBeenCalledWith({ parent_id: "3" });

    await updatePostFields("7", { parentId: null });
    expect(q.update).toHaveBeenLastCalledWith({ parent_id: null });
  });

  test("icon patch는 이름 그대로 나간다 (⑦ — null = 제거)", async () => {
    const q = makeQuery({ data: [{ id: 7 }], error: null });
    fromMock.mockReturnValue(q);
    await updatePostFields("7", { icon: "🔥" });
    expect(q.update).toHaveBeenCalledWith({ icon: "🔥" });

    await updatePostFields("7", { icon: null });
    expect(q.update).toHaveBeenLastCalledWith({ icon: null });
  });

  test("서버 오류면 throw 한다", async () => {
    fromMock.mockReturnValue(makeQuery({ data: null, error: { message: "수정 실패" } }));
    await expect(updatePostFields("7", { title: "x" })).rejects.toThrow("수정 실패");
  });

  test("에러 없이 0행이면(RLS 무성음 거부) 실패로 throw 한다(A2)", async () => {
    fromMock.mockReturnValue(makeQuery({ data: [], error: null }));
    await expect(updatePostFields("7", { title: "x" })).rejects.toThrow(
      "게시글을 찾지 못해 저장하지 못했습니다."
    );
  });
});
