import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AppProvider, useApp } from "@/lib/store";
import TrashPage from "@/app/(app)/trash/page";

// 휴지통 화면(§4.5) 통합 검증. next/navigation·인증·Supabase 경계만 목킹하고
// 스토어(AppProvider)·페이지는 실제 코드를 사용한다(헌법 II 모킹 규율).
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: () => {}, replace: () => {} }),
  usePathname: () => "/trash",
}));

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({
    ready: true,
    session: { user: { id: "user-1" } },
    user: { id: "user-1" },
  }),
}));

const fromMock = vi.fn();
vi.mock("@/lib/supabase", () => ({
  isSupabaseConfigured: true,
  getSupabase: () => ({ from: fromMock }),
}));

type Result = { data?: unknown; error?: unknown };

/**
 * 응답 라우팅: 살아있는 글 조회(.is), 휴지통 조회(.not), UPDATE(복원),
 * DELETE(영구 삭제)가 한 화면에서 섞여 나가므로, 호출 순서 큐 대신
 * 어떤 체이닝이 불렸는지로 응답을 고른다.
 */
const routes: Record<"live" | "trash" | "update" | "del", Result> = {
  live: { data: [], error: null },
  trash: { data: [], error: null },
  update: { data: [{ id: 1 }], error: null },
  del: { data: null, error: null },
};

/** 생성된 쿼리 목 기록 — update/delete 페이로드 검증용. */
let queries: Array<Record<string, ReturnType<typeof vi.fn>>> = [];

function makeQuery() {
  let kind: keyof typeof routes = "live";
  const q: Record<string, unknown> = {
    then: (res: (v: Result) => unknown, rej: (e: unknown) => unknown) =>
      Promise.resolve(routes[kind]).then(res, rej),
  };
  for (const m of ["insert", "select", "order", "eq", "single", "maybeSingle", "is"]) {
    q[m] = vi.fn(() => q);
  }
  q.not = vi.fn(() => {
    kind = "trash";
    return q;
  });
  q.update = vi.fn(() => {
    kind = "update";
    return q;
  });
  q.delete = vi.fn(() => {
    kind = "del";
    return q;
  });
  queries.push(q as Record<string, ReturnType<typeof vi.fn>>);
  return q;
}

function trashRow(id: number, title: string, deletedAt: string) {
  return {
    id,
    created_at: "2026-07-16T00:00:00.000Z",
    title,
    content: `${title} 본문`,
    user_id: "user-1",
    deleted_at: deletedAt,
  };
}

/** 스토어 목록을 들여다보는 프로브 — 복원이 목록에 반영되는지 확인한다. */
function StoreProbe() {
  const app = useApp();
  return (
    <div data-testid="store-posts">{app.posts.map((p) => p.title).join(",")}</div>
  );
}

function renderTrash() {
  return render(
    <AppProvider>
      <TrashPage />
      <StoreProbe />
    </AppProvider>
  );
}

beforeEach(() => {
  queries = [];
  routes.live = { data: [], error: null };
  routes.trash = { data: [], error: null };
  routes.update = { data: [{ id: 1 }], error: null };
  routes.del = { data: null, error: null };
  fromMock.mockReset();
  fromMock.mockImplementation(() => makeQuery());
  vi.spyOn(window, "alert").mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
});

test("휴지통 글을 카드 목록으로 렌더한다(복원·영구 삭제 버튼 포함)", async () => {
  routes.trash = {
    data: [
      trashRow(2, "나중에 지운 글", "2026-07-20T12:00:00.000Z"),
      trashRow(1, "먼저 지운 글", "2026-07-19T12:00:00.000Z"),
    ],
    error: null,
  };
  renderTrash();

  expect(await screen.findByText("나중에 지운 글")).toBeDefined();
  expect(screen.getByText("먼저 지운 글")).toBeDefined();
  expect(screen.getAllByRole("button", { name: "복원" })).toHaveLength(2);
  expect(screen.getAllByRole("button", { name: "영구 삭제" })).toHaveLength(2);
});

test("휴지통이 비어 있으면 빈 상태를 보여준다", async () => {
  renderTrash();
  expect(await screen.findByText("휴지통이 비어 있어요.")).toBeDefined();
});

test("복원을 누르면 휴지통에서 빠지고 스토어 목록에 되들어간다", async () => {
  routes.trash = {
    data: [trashRow(1, "복원할 글", "2026-07-20T12:00:00.000Z")],
    error: null,
  };
  renderTrash();

  fireEvent.click(await screen.findByRole("button", { name: "복원" }));

  // 카드가 사라지고 빈 상태로 돌아간다(복원한 글은 휴지통 목록에서 이탈).
  expect(await screen.findByText("휴지통이 비어 있어요.")).toBeDefined();
  // deleted_at을 null로 되돌리는 UPDATE가 나가야 한다.
  const restoreQuery = queries.find((q) => q.update.mock.calls.length > 0)!;
  expect(restoreQuery.update).toHaveBeenCalledWith({ deleted_at: null });
  // 스토어 목록에 다시 들어간다(사이드바·목록 화면이 같은 상태를 본다).
  expect(screen.getByTestId("store-posts").textContent).toBe("복원할 글");
});

test("복원이 0행으로 거부되면(A2) 알림을 띄우고 목록을 유지한다", async () => {
  routes.trash = {
    data: [trashRow(1, "남의 글", "2026-07-20T12:00:00.000Z")],
    error: null,
  };
  routes.update = { data: [], error: null }; // RLS 거부 — 에러 없이 0행
  renderTrash();

  fireEvent.click(await screen.findByRole("button", { name: "복원" }));

  await waitFor(() =>
    expect(window.alert).toHaveBeenCalledWith(
      "게시글을 찾지 못해 복원하지 못했습니다."
    )
  );
  expect(screen.getByText("남의 글")).toBeDefined();
  expect(screen.getByTestId("store-posts").textContent).toBe("");
});

test("영구 삭제는 확인 후 DELETE를 보내고 휴지통에서 제거한다", async () => {
  routes.trash = {
    data: [trashRow(1, "지울 글", "2026-07-20T12:00:00.000Z")],
    error: null,
  };
  vi.spyOn(window, "confirm").mockReturnValue(true);
  renderTrash();

  fireEvent.click(await screen.findByRole("button", { name: "영구 삭제" }));

  await waitFor(() => expect(screen.queryByText("지울 글")).toBeNull());
  const delQuery = queries.find((q) => q.delete.mock.calls.length > 0)!;
  expect(delQuery.eq).toHaveBeenCalledWith("id", "1");
  expect(await screen.findByText("휴지통이 비어 있어요.")).toBeDefined();
});

test("영구 삭제 확인을 취소하면 아무것도 지우지 않는다", async () => {
  routes.trash = {
    data: [trashRow(1, "남길 글", "2026-07-20T12:00:00.000Z")],
    error: null,
  };
  vi.spyOn(window, "confirm").mockReturnValue(false);
  renderTrash();

  fireEvent.click(await screen.findByRole("button", { name: "영구 삭제" }));

  expect(screen.getByText("남길 글")).toBeDefined();
  expect(queries.some((q) => q.delete.mock.calls.length > 0)).toBe(false);
});

test("휴지통 조회가 실패하면 알리고 빈 상태로 둔다", async () => {
  routes.trash = { data: null, error: { message: "휴지통 조회 실패" } };
  renderTrash();

  await waitFor(() =>
    expect(window.alert).toHaveBeenCalledWith("휴지통 조회 실패")
  );
  expect(await screen.findByText("휴지통이 비어 있어요.")).toBeDefined();
});
