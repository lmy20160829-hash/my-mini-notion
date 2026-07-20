import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { AppProvider } from "@/lib/store";
import PostDetailPage from "@/app/(app)/posts/[id]/page";

// US2 페이지 통합 검증 (FR-003 초기값 / FR-011 글 전환 갱신).
// next/navigation은 Next 런타임 밖(jsdom)에서 동작하지 않는 프레임워크 경계라 최소 모킹한다.
// 스토어(AppProvider)·페이지·CharCount는 모두 실제 코드를 사용한다(헌법 II 모킹 규율).
const nav = vi.hoisted(() => ({
  params: { id: "p1" } as { id: string },
  push: () => {},
  replace: () => {},
}));
vi.mock("next/navigation", () => ({
  useParams: () => nav.params,
  useRouter: () => ({ push: nav.push, replace: nav.replace }),
}));

// 게시글은 Supabase(page 테이블)에서 온다. 인증 세션과 Supabase 응답만 목킹하고
// 스토어·페이지·컴포넌트는 실제 코드를 사용한다(헌법 II 모킹 규율).
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

const ROWS = [
  {
    id: "p1",
    created_at: "2026-07-16T00:00:00.000Z",
    title: "글 하나",
    content: "안녕하세요",
    user_id: "user-1",
  },
  {
    id: "p2",
    created_at: "2026-07-16T01:00:00.000Z",
    title: "글 둘",
    content: "가나다라마바사",
    user_id: "user-1",
  },
];

function makeQuery(result: unknown) {
  const q: Record<string, unknown> = {
    then: (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) =>
      Promise.resolve(result).then(res, rej),
  };
  for (const m of ["insert", "select", "order", "update", "delete", "eq", "single"]) {
    q[m] = vi.fn(() => q);
  }
  return q;
}

beforeEach(() => {
  nav.params = { id: "p1" };
  fromMock.mockReset();
  fromMock.mockImplementation(() => makeQuery({ data: ROWS, error: null }));
});
afterEach(() => {
  cleanup();
  localStorage.clear();
});

test("기존 글을 열면 입력 없이 현재 내용의 글자 수가 즉시 보인다 (US2/FR-003)", async () => {
  render(
    <AppProvider>
      <PostDetailPage />
    </AppProvider>
  );
  // "안녕하세요" = 5 grapheme → 아무 입력 없이 5자 표시
  expect(await screen.findByText("5자")).toBeDefined();
});

test("다른 글로 이동하면 칩이 새 글 기준으로 갱신된다 (US2/FR-011)", async () => {
  const { rerender } = render(
    <AppProvider>
      <PostDetailPage />
    </AppProvider>
  );
  expect(await screen.findByText("5자")).toBeDefined(); // p1: 안녕하세요

  nav.params = { id: "p2" }; // 다른 글로 이동
  rerender(
    <AppProvider>
      <PostDetailPage />
    </AppProvider>
  );
  expect(await screen.findByText("7자")).toBeDefined(); // p2: 가나다라마바사
});
