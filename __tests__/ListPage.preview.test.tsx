import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, render, waitFor } from "@testing-library/react";
import { AppProvider } from "@/lib/store";
import ListPage from "@/app/(app)/page";

// 목록 카드 미리보기(§4.2): 노션처럼 **첫 블록 한 줄만** 보인다.
// 이전에는 content(=전 블록을 \n으로 이은 projection)의 줄바꿈을 공백으로 바꿔
// 블록들이 한 줄에 뭉쳐 보였다 — 그 회귀를 "뒷 블록 텍스트가 없어야 한다"로 잡는다.
// next/navigation·auth·supabase만 최소 모킹하고 스토어·페이지는 실제 코드를 쓴다.
const nav = vi.hoisted(() => ({ push: () => {}, replace: () => {} }));
vi.mock("next/navigation", () => ({
  useParams: () => ({}),
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

const ROWS = [
  {
    // 블록 문서가 있는 글 — 첫 블록만 미리보기에 나와야 한다.
    id: "1",
    created_at: "2026-07-22T03:00:00.000Z",
    title: "블록 글",
    content: "첫 번째 블록\n두 번째 블록\n세 번째 블록",
    user_id: "user-1",
    deleted_at: null,
    content_doc: {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "첫 번째 블록" }] },
        { type: "paragraph", content: [{ type: "text", text: "두 번째 블록" }] },
        { type: "paragraph", content: [{ type: "text", text: "세 번째 블록" }] },
      ],
    },
  },
  {
    // content_doc이 없는 레거시 글 — textToDoc 경유로 첫 줄만.
    id: "2",
    created_at: "2026-07-22T02:00:00.000Z",
    title: "레거시 글",
    content: "레거시 첫 줄\n레거시 둘째 줄",
    user_id: "user-1",
    deleted_at: null,
  },
  {
    // 빈 글 — 기존 동작 유지("내용 없음").
    id: "3",
    created_at: "2026-07-22T01:00:00.000Z",
    title: "빈 글",
    content: "",
    user_id: "user-1",
    deleted_at: null,
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
  fromMock.mockReset();
  fromMock.mockImplementation(() => makeQuery({ data: ROWS, error: null }));
});
afterEach(() => {
  cleanup();
  localStorage.clear();
});

/** 카드 미리보기 텍스트를 제목 기준으로 찾는다. */
async function previewsByTitle(container: HTMLElement) {
  await waitFor(() =>
    expect(container.querySelectorAll(".post-card").length).toBe(ROWS.length)
  );
  const map: Record<string, string> = {};
  container.querySelectorAll(".post-card").forEach((card) => {
    const title = card.querySelector(".post-card__title")?.textContent ?? "";
    map[title] = card.querySelector(".post-card__preview")?.textContent ?? "";
  });
  return map;
}

test("카드 미리보기는 첫 블록만 보여주고 뒷 블록은 이어붙이지 않는다", async () => {
  const { container } = render(
    <AppProvider>
      <ListPage />
    </AppProvider>
  );

  const previews = await previewsByTitle(container);

  expect(previews["블록 글"]).toBe("첫 번째 블록");
  expect(previews["블록 글"]).not.toContain("두 번째 블록");
  expect(previews["블록 글"]).not.toContain("세 번째 블록");
});

test("content_doc이 없는 레거시 글도 첫 줄만 보여준다", async () => {
  const { container } = render(
    <AppProvider>
      <ListPage />
    </AppProvider>
  );

  const previews = await previewsByTitle(container);

  expect(previews["레거시 글"]).toBe("레거시 첫 줄");
  expect(previews["레거시 글"]).not.toContain("둘째 줄");
});

test("빈 글은 기존대로 '내용 없음'을 보여준다", async () => {
  const { container } = render(
    <AppProvider>
      <ListPage />
    </AppProvider>
  );

  const previews = await previewsByTitle(container);

  expect(previews["빈 글"]).toBe("내용 없음");
});
