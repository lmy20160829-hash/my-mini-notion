import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AppProvider } from "@/lib/store";
import { deletePostAttachments } from "@/lib/attachments";
import TrashPage from "@/app/(app)/trash/page";

// 영구 삭제 연결(⑧, §5.13): 글 행 삭제(성공)가 확정된 **뒤에만** 첨부 정리를
// 비동기로 호출한다 — 결과는 기다리지 않고 실패는 모듈 내부의 고정 포맷 로깅이 담당.
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

// 첨부 정리는 계약(호출 시점·인자)만 검증한다 — Storage 동작은 attachments.test.ts 담당.
vi.mock("@/lib/attachments", () => ({
  deletePostAttachments: vi.fn(async () => {}),
}));

const fromMock = vi.fn();
vi.mock("@/lib/supabase", () => ({
  isSupabaseConfigured: true,
  getSupabase: () => ({ from: fromMock }),
}));

type Result = { data?: unknown; error?: unknown };

const routes: Record<"live" | "trash" | "del", Result> = {
  live: { data: [], error: null },
  trash: { data: [], error: null },
  del: { data: [{ id: 1 }], error: null },
};

function makeQuery() {
  let kind: keyof typeof routes = "live";
  const q: Record<string, unknown> = {
    then: (res: (v: Result) => unknown, rej: (e: unknown) => unknown) =>
      Promise.resolve(routes[kind]).then(res, rej),
  };
  for (const m of ["insert", "select", "order", "eq", "single", "maybeSingle", "is", "update"]) {
    q[m] = vi.fn(() => q);
  }
  q.not = vi.fn(() => {
    kind = "trash";
    return q;
  });
  q.delete = vi.fn(() => {
    kind = "del";
    return q;
  });
  return q;
}

const trashRow = {
  id: 7,
  created_at: "2026-07-16T00:00:00.000Z",
  title: "지울 글",
  content: "",
  user_id: "user-1",
  deleted_at: "2026-07-20T12:00:00.000Z",
};

beforeEach(() => {
  routes.live = { data: [], error: null };
  routes.trash = { data: [trashRow], error: null };
  routes.del = { data: [{ id: 7 }], error: null };
  fromMock.mockReset();
  fromMock.mockImplementation(() => makeQuery());
  vi.mocked(deletePostAttachments).mockClear();
  vi.spyOn(window, "alert").mockImplementation(() => {});
  vi.spyOn(window, "confirm").mockReturnValue(true);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
});

function renderTrash() {
  return render(
    <AppProvider>
      <TrashPage />
    </AppProvider>
  );
}

test("영구 삭제 성공 후 deletePostAttachments(userId, postId)를 호출한다", async () => {
  renderTrash();

  fireEvent.click(await screen.findByRole("button", { name: "영구 삭제" }));

  await waitFor(() =>
    expect(deletePostAttachments).toHaveBeenCalledWith("user-1", "7")
  );
});

test("글 삭제가 실패하면(A2 0행 포함) 첨부 정리를 호출하지 않는다", async () => {
  routes.del = { data: [], error: null }; // RLS 무성음 거부 — 행 삭제 미확정
  renderTrash();

  fireEvent.click(await screen.findByRole("button", { name: "영구 삭제" }));

  await waitFor(() =>
    expect(window.alert).toHaveBeenCalledWith(
      "게시글을 찾지 못해 삭제하지 못했습니다."
    )
  );
  expect(deletePostAttachments).not.toHaveBeenCalled();
});

test("확인을 취소하면 첨부 정리도 없다", async () => {
  vi.mocked(window.confirm).mockReturnValue(false);
  renderTrash();

  fireEvent.click(await screen.findByRole("button", { name: "영구 삭제" }));

  expect(deletePostAttachments).not.toHaveBeenCalled();
});
