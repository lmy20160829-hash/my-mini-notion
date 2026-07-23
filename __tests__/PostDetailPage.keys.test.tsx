import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, render, waitFor } from "@testing-library/react";
import { AppProvider } from "@/lib/store";
import PostDetailPage from "@/app/(app)/posts/[id]/page";

// 상세 화면 key 유일성 회귀 검증.
// React는 같은 부모의 형제 children 중 key가 겹치면 개발 빌드에서
// "Encountered two children with the same key" 를 console.error로 경고하고,
// 재조정 시 한쪽을 버려 상태 유실·중복 마운트를 일으킨다.
// 상세 화면은 커버·아이콘·에디터 같은 단발 자식과 조상 체인·트리 같은 배열이
// 한 컨테이너에 섞여 있어 이 충돌이 나기 쉬우므로, 화면 전체를 렌더해
// key 경고가 하나도 없음을 단언한다.
const nav = vi.hoisted(() => ({
  params: { id: "2" } as { id: string },
  push: () => {},
  replace: () => {},
}));
vi.mock("next/navigation", () => ({
  useParams: () => nav.params,
  useRouter: () => ({ push: nav.push, replace: nav.replace }),
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

// 조상 체인(⑤)까지 렌더되도록 부모-자식 2단 구성. 열람 대상은 자식(id "2")이라
// 브레드크럼에 조상 1개가 그려지고, 사이드바 트리에도 두 글이 모두 나온다.
const ROWS = [
  {
    id: "1",
    created_at: "2026-07-20T00:00:00.000Z",
    title: "부모 페이지",
    content: "부모 본문",
    user_id: "user-1",
    parent_id: null,
    icon: "📁",
  },
  {
    id: "2",
    created_at: "2026-07-21T00:00:00.000Z",
    title: "자식 페이지",
    content: "자식 본문",
    user_id: "user-1",
    parent_id: "1",
    icon: null,
  },
];

function makeQuery(result: unknown) {
  const q: Record<string, unknown> = {
    then: (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) =>
      Promise.resolve(result).then(res, rej),
  };
  for (const m of [
    "insert",
    "select",
    "order",
    "update",
    "delete",
    "eq",
    "single",
    "maybeSingle",
    "is",
    "not",
  ]) {
    q[m] = vi.fn(() => q);
  }
  return q;
}

beforeEach(() => {
  nav.params = { id: "2" };
  fromMock.mockReset();
  fromMock.mockImplementation(() => makeQuery({ data: ROWS, error: null }));
});
afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});

/** React가 낸 중복 key 경고만 골라낸다(첫 인자에 포맷 문자열이 온다). */
function duplicateKeyWarnings(spy: ReturnType<typeof vi.spyOn>) {
  return spy.mock.calls.filter((args) =>
    String(args[0] ?? "").includes("same key")
  );
}

test("상세 화면 렌더 시 중복 key 경고가 없다", async () => {
  const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

  const { container } = render(
    <AppProvider>
      <PostDetailPage />
    </AppProvider>
  );

  // 글은 비동기로 로드된다 — 본문(에디터)까지 떠야 화면 전체가 렌더된 것이다.
  await waitFor(() =>
    expect(container.querySelector(".detail-content")).not.toBeNull()
  );

  const warnings = duplicateKeyWarnings(errorSpy);
  expect(
    warnings,
    `중복 key 경고 발생:\n${warnings.map((w) => w.join(" ")).join("\n")}`
  ).toHaveLength(0);
});

test("상세 화면의 형제 요소 key는 서로 겹치지 않는다", async () => {
  const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

  const { container } = render(
    <AppProvider>
      <PostDetailPage />
    </AppProvider>
  );

  await waitFor(() =>
    expect(container.querySelector(".detail-content")).not.toBeNull()
  );

  // 같은 글을 다시 열어도(리렌더) 경고가 늘지 않아야 한다 —
  // key 충돌은 재조정 때마다 반복 발생하므로 리렌더가 신호를 증폭시킨다.
  const before = duplicateKeyWarnings(errorSpy).length;
  nav.params = { id: "1" };
  render(
    <AppProvider>
      <PostDetailPage />
    </AppProvider>
  );
  await waitFor(() =>
    expect(container.querySelectorAll(".detail-content").length).toBeGreaterThan(
      0
    )
  );

  expect(duplicateKeyWarnings(errorSpy).length).toBe(before);
  expect(before).toBe(0);
});
