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
const supa = vi.hoisted(() => ({ fromMock: null as never }));
const fromMock = vi.fn();
vi.mock("@/lib/supabase", () => ({
  isSupabaseConfigured: true,
  getSupabase: () => ({ from: fromMock }),
}));
void supa;

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
