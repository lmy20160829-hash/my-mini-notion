import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { AppProvider, useApp } from "@/lib/store";

// 페이지 아이콘 저장(⑦): 선택 즉시 **디바운스 없는 단발 UPDATE**(A2 계약 경유).
// 실패(서버 오류·RLS 0행)면 이전 값으로 되돌리고 알린다.
const auth = vi.hoisted(() => ({
  state: {
    ready: true,
    session: { user: { id: "user-1" } },
    user: { id: "user-1" },
  },
}));
vi.mock("@/lib/auth", () => ({ useAuth: () => auth.state }));

const fromMock = vi.fn();
vi.mock("@/lib/supabase", () => ({
  isSupabaseConfigured: true,
  getSupabase: () => ({ from: fromMock }),
}));

type Result = { data?: unknown; error?: unknown };

let queue: Result[] = [];
let queries: Array<Record<string, ReturnType<typeof vi.fn>>> = [];

function makeQuery(result: Result) {
  const q: Record<string, unknown> = {
    then: (res: (v: Result) => unknown, rej: (e: unknown) => unknown) =>
      Promise.resolve(result).then(res, rej),
  };
  for (const m of ["insert", "select", "order", "update", "delete", "eq", "single", "maybeSingle", "is", "not"]) {
    q[m] = vi.fn(() => q);
  }
  return q;
}

beforeEach(() => {
  queue = [];
  queries = [];
  fromMock.mockReset();
  fromMock.mockImplementation(() => {
    const q = makeQuery(queue.shift() ?? { data: [], error: null });
    queries.push(q as Record<string, ReturnType<typeof vi.fn>>);
    return q;
  });
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

const ROW = {
  id: 1,
  created_at: "2026-07-16T00:00:00.000Z",
  title: "글",
  content: "",
  user_id: "user-1",
  icon: null,
};

test("setPostIcon은 로컬 즉시 반영 + 디바운스 없이 곧바로 icon UPDATE를 보낸다", async () => {
  enqueue([{ ...ROW }]);
  const { result } = mountStore();
  await waitFor(() => expect(result.current.loaded).toBe(true));

  queue.push({ data: [{ id: 1 }], error: null }); // UPDATE 성공(A2 — 영향 행 반환)
  act(() => {
    result.current.setPostIcon("1", "🔥");
  });

  // 로컬 즉시 반영(낙관적).
  expect(result.current.posts[0].icon).toBe("🔥");
  // 타이머 경과 없이 UPDATE가 이미 나갔어야 한다(단발 — §5.2 디바운스와 다른 경로).
  const updated = queries.find((q) => q.update.mock.calls.length > 0)!;
  expect(updated).toBeDefined();
  expect(updated.update).toHaveBeenCalledWith({ icon: "🔥" });
  expect(updated.eq).toHaveBeenCalledWith("id", "1");
  expect(updated.select).toHaveBeenCalledWith("id");
  await waitFor(() => expect(window.alert).not.toHaveBeenCalled());
});

test("실패(A2 0행)하면 이전 값으로 되돌리고 알린다", async () => {
  enqueue([{ ...ROW, icon: "⭐" }]);
  const { result } = mountStore();
  await waitFor(() => expect(result.current.loaded).toBe(true));

  queue.push({ data: [], error: null }); // RLS 무성음 거부
  act(() => {
    result.current.setPostIcon("1", "🔥");
  });
  expect(result.current.posts[0].icon).toBe("🔥"); // 낙관 반영

  await waitFor(() =>
    expect(window.alert).toHaveBeenCalledWith(
      "게시글을 찾지 못해 저장하지 못했습니다."
    )
  );
  expect(result.current.posts[0].icon).toBe("⭐"); // 롤백
});

function enqueue(rows: unknown) {
  queue.push({ data: rows, error: null });
}
