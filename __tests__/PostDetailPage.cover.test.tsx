import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { AppProvider } from "@/lib/store";
import PostDetailPage from "@/app/(app)/posts/[id]/page";

// 커버 이미지 기능 페이지 통합 검증.
// next/navigation은 Next 런타임 밖(jsdom)에서 동작하지 않는 프레임워크 경계라 최소 모킹한다.
// 스토어(AppProvider)·페이지·PostCover는 모두 실제 코드를 사용한다(헌법 II 모킹 규율).
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
  ]) {
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

// US1 / FR-001: 커버 이미지 영역은 제목 입력창(.detail-title) '위'에 위치한다.
test("커버 영역이 제목 입력창보다 위(앞)에 렌더된다 (US1/FR-001)", async () => {
  const { container } = render(
    <AppProvider>
      <PostDetailPage />
    </AppProvider>
  );

  // 게시글은 서버에서 비동기로 로드된다.
  await waitFor(() =>
    expect(container.querySelector(".detail-cover")).not.toBeNull()
  );
  const cover = container.querySelector(".detail-cover");
  const title = container.querySelector(".detail-title");

  expect(cover).not.toBeNull();
  expect(title).not.toBeNull();

  // cover가 title보다 문서상 앞에 있으면 compareDocumentPosition에 FOLLOWING 비트가 선다.
  const rel = cover!.compareDocumentPosition(title!);
  expect(rel & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});

// US3 / FR-007, SC-004 (quickstart V8): 커버가 실패 상태여도 제목·본문 편집은 정상 동작한다.
test("커버가 실패 상태여도 제목·본문 편집이 정상 동작한다 (US3/FR-007)", async () => {
  const { container } = render(
    <AppProvider>
      <PostDetailPage />
    </AppProvider>
  );

  await waitFor(() =>
    expect(container.querySelector(".detail-cover img")).not.toBeNull()
  );
  // 커버 이미지 오류를 유도 → 폴백 상태로 전환
  const coverImg = container.querySelector(".detail-cover img");
  fireEvent.error(coverImg!);
  expect(container.querySelector('[data-cover="fallback"]')).not.toBeNull();

  // 실패 상태에서도 제목 편집 가능
  const title = container.querySelector(".detail-title") as HTMLInputElement;
  fireEvent.change(title, { target: { value: "새 제목" } });
  expect(title.value).toBe("새 제목");

  // 본문 편집 가능
  const content = container.querySelector(".detail-content") as HTMLTextAreaElement;
  fireEvent.change(content, { target: { value: "새 본문 내용" } });
  expect(content.value).toBe("새 본문 내용");
});
