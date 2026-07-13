import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
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

const SEED = {
  loggedIn: true,
  nickname: null,
  avatar: null,
  posts: [
    { id: "p1", title: "글 하나", content: "안녕하세요", favorite: false, createdAt: 1 },
  ],
};

beforeEach(() => {
  nav.params = { id: "p1" };
  localStorage.setItem("mini-notion-v1", JSON.stringify(SEED));
});
afterEach(() => {
  cleanup();
  localStorage.clear();
});

// US1 / FR-001: 커버 이미지 영역은 제목 입력창(.detail-title) '위'에 위치한다.
test("커버 영역이 제목 입력창보다 위(앞)에 렌더된다 (US1/FR-001)", () => {
  const { container } = render(
    <AppProvider>
      <PostDetailPage />
    </AppProvider>
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
test("커버가 실패 상태여도 제목·본문 편집이 정상 동작한다 (US3/FR-007)", () => {
  const { container } = render(
    <AppProvider>
      <PostDetailPage />
    </AppProvider>
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
