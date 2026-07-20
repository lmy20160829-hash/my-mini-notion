import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { AppProvider, useApp } from "@/lib/store";

// 인증은 Supabase 세션(useAuth)이 담당한다. 세션을 테스트에서 바꿀 수 있도록 가변 상태로 목킹.
const auth = vi.hoisted(() => ({
  state: {
    ready: true,
    session: { user: { id: "user-1" } },
    user: { id: "user-1" },
  } as {
    ready: boolean;
    session: { user: { id: string } } | null;
    user: { id: string } | null;
  },
}));
vi.mock("@/lib/auth", () => ({ useAuth: () => auth.state }));

// Supabase 클라이언트 목: 응답을 호출 순서대로 큐에 넣는다.
// 목은 실제 { data, error } 구조와 page 행 형태를 그대로 반영한다(목 자체는 검증하지 않는다).
const fromMock = vi.fn();
vi.mock("@/lib/supabase", () => ({
  isSupabaseConfigured: true,
  getSupabase: () => ({ from: fromMock }),
}));

type Result = { data?: unknown; error?: unknown };

let queue: Result[] = [];

function makeQuery(result: Result) {
  const q: Record<string, unknown> = {
    then: (res: (v: Result) => unknown, rej: (e: unknown) => unknown) =>
      Promise.resolve(result).then(res, rej),
  };
  for (const m of ["insert", "select", "order", "update", "delete", "eq", "single"]) {
    q[m] = vi.fn(() => q);
  }
  return q;
}

/** 다음 Supabase 호출이 돌려줄 응답을 큐에 추가한다. */
function enqueue(result: Result) {
  queue.push(result);
}

function row(id: number, title: string, content = "", createdAt = "2026-07-16T00:00:00.000Z") {
  return { id, created_at: createdAt, title, content, user_id: "user-1" };
}

beforeEach(() => {
  queue = [];
  fromMock.mockReset();
  fromMock.mockImplementation(() =>
    makeQuery(queue.shift() ?? { data: [], error: null })
  );
  auth.state = {
    ready: true,
    session: { user: { id: "user-1" } },
    user: { id: "user-1" },
  };
  // 오류 표면화는 window.alert로 한다(정적 SPA — 토스트 인프라 없음).
  vi.spyOn(window, "alert").mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
});

function mountStore() {
  return renderHook(() => useApp(), {
    wrapper: ({ children }) => <AppProvider>{children}</AppProvider>,
  });
}

describe("createPost (US1)", () => {
  test("서버에 저장된 글을 반환하고 목록 맨 앞에 추가한다", async () => {
    enqueue({ data: [row(1, "기존 글")], error: null }); // 초기 로드
    const { result } = mountStore();
    await waitFor(() => expect(result.current.loaded).toBe(true));

    enqueue({ data: row(2, "새 글", "", "2026-07-17T00:00:00.000Z"), error: null });
    let created: unknown;
    await act(async () => {
      created = await result.current.createPost("새 글");
    });

    expect(created).toEqual({
      id: "2",
      title: "새 글",
      content: "",
      createdAt: Date.parse("2026-07-17T00:00:00.000Z"),
    });
    expect(result.current.posts.map((p) => p.id)).toEqual(["2", "1"]);
  });

  test("서버 오류면 null을 반환하고 목록을 바꾸지 않는다", async () => {
    enqueue({ data: [row(1, "기존 글")], error: null });
    const { result } = mountStore();
    await waitFor(() => expect(result.current.loaded).toBe(true));

    enqueue({ data: null, error: { message: "저장 실패" } });
    let created: unknown = "sentinel";
    await act(async () => {
      created = await result.current.createPost("새 글");
    });

    expect(created).toBe(null);
    expect(result.current.posts.map((p) => p.id)).toEqual(["1"]);
  });

  test("비로그인(세션 없음)이면 서버 호출 없이 null을 반환한다", async () => {
    auth.state = { ready: true, session: null, user: null };
    const { result } = mountStore();

    let created: unknown = "sentinel";
    await act(async () => {
      created = await result.current.createPost("새 글");
    });

    expect(created).toBe(null);
    expect(fromMock).not.toHaveBeenCalled();
  });
});

describe("세션 변화에 따른 목록 격리 (US2)", () => {
  test("로그아웃하면 목록이 비워지고 loaded가 재설정된다", async () => {
    enqueue({ data: [row(1, "내 글")], error: null });
    const { result, rerender } = mountStore();
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.posts).toHaveLength(1);

    await act(async () => {
      auth.state = { ready: true, session: null, user: null };
      rerender();
    });

    expect(result.current.posts).toEqual([]);
    expect(result.current.loaded).toBe(false);
  });

  test("다른 계정으로 다시 로그인하면 그 계정의 글만 로드한다", async () => {
    enqueue({ data: [row(1, "A의 글")], error: null });
    const { result, rerender } = mountStore();
    await waitFor(() => expect(result.current.loaded).toBe(true));

    await act(async () => {
      auth.state = { ready: true, session: null, user: null };
      rerender();
    });

    enqueue({
      data: [{ ...row(9, "B의 글"), user_id: "user-2" }],
      error: null,
    });
    await act(async () => {
      auth.state = {
        ready: true,
        session: { user: { id: "user-2" } },
        user: { id: "user-2" },
      };
      rerender();
    });

    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.posts.map((p) => p.title)).toEqual(["B의 글"]);
  });

  test("조회 실패 시 목록을 비우고 사용자에게 알린다", async () => {
    enqueue({ data: null, error: { message: "조회 실패" } });
    const { result } = mountStore();

    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.posts).toEqual([]);
    expect(window.alert).toHaveBeenCalledWith("조회 실패");
  });
});

describe("deletePost (US3)", () => {
  test("로컬에서 즉시 제거하고 서버에 삭제를 요청한다", async () => {
    enqueue({ data: [row(1, "글 하나"), row(2, "글 둘")], error: null });
    const { result } = mountStore();
    await waitFor(() => expect(result.current.loaded).toBe(true));

    enqueue({ data: null, error: null }); // delete 성공
    await act(async () => {
      result.current.deletePost("1");
    });

    expect(result.current.posts.map((p) => p.id)).toEqual(["2"]);
    // 초기 조회 + 삭제 = page 테이블 접근 2회(로컬 제거만 하고 끝내면 안 된다).
    expect(fromMock).toHaveBeenCalledTimes(2);
  });

  test("서버 삭제가 실패하면 재조회로 복구하고 알린다", async () => {
    const rows = [
      row(2, "글 둘", "", "2026-07-17T00:00:00.000Z"),
      row(1, "글 하나", "", "2026-07-16T00:00:00.000Z"),
    ];
    enqueue({ data: rows, error: null });
    const { result } = mountStore();
    await waitFor(() => expect(result.current.loaded).toBe(true));

    enqueue({ data: null, error: { message: "삭제 실패" } }); // delete 거부
    enqueue({ data: rows, error: null }); // 복구 재조회
    await act(async () => {
      result.current.deletePost("1");
    });

    await waitFor(() =>
      expect(result.current.posts.map((p) => p.id)).toEqual(["2", "1"])
    );
    expect(window.alert).toHaveBeenCalledWith("삭제 실패");
  });
});

describe("updatePost 디바운스 저장 (US4)", () => {
  test("로컬은 즉시 반영하고 서버 저장은 600ms 디바운스로 1회만 보낸다", async () => {
    vi.useFakeTimers();
    try {
      enqueue({ data: [row(1, "원래 제목")], error: null });
      const { result } = mountStore();
      await vi.waitFor(() => expect(result.current.loaded).toBe(true));

      const callsAfterLoad = fromMock.mock.calls.length;

      act(() => {
        result.current.updatePost("1", { title: "고" });
        result.current.updatePost("1", { title: "고친" });
        result.current.updatePost("1", { title: "고친 제목" });
      });

      // 로컬은 입력 즉시 반영(입력 반응성 유지)
      expect(result.current.posts[0].title).toBe("고친 제목");
      // 디바운스 전에는 서버 호출이 없다
      expect(fromMock.mock.calls.length).toBe(callsAfterLoad);

      enqueue({ data: null, error: null });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(600);
      });

      // 연속 입력 3회 → 서버 UPDATE는 1회
      expect(fromMock.mock.calls.length).toBe(callsAfterLoad + 1);
    } finally {
      vi.useRealTimers();
    }
  });

  test("언마운트 시 대기 중인 변경을 flush 한다", async () => {
    vi.useFakeTimers();
    try {
      enqueue({ data: [row(1, "원래 제목")], error: null });
      const { result, unmount } = mountStore();
      await vi.waitFor(() => expect(result.current.loaded).toBe(true));

      const callsAfterLoad = fromMock.mock.calls.length;
      act(() => {
        result.current.updatePost("1", { content: "저장돼야 하는 본문" });
      });

      enqueue({ data: null, error: null });
      unmount();

      expect(fromMock.mock.calls.length).toBe(callsAfterLoad + 1);
    } finally {
      vi.useRealTimers();
    }
  });
});
