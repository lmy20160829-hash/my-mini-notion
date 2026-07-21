import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";
import { AppProvider, useApp } from "@/lib/store";

// 사이드바 접힘/펼침 상태(Sidebar Display State)의 스토어 계약 검증.
// 실제 스토어와 실제 localStorage(jsdom)를 사용한다 — 목은 인증/서버 경계에만 둔다(헌법 II).
//
// 사이드바를 접는 주체는 **로그인한** 사용자다. 세션 없이 목킹하면 스토어가 이를
// 로그아웃으로 보고 프로필 오버라이드를 비우므로(별명·아바타 유출 방지), 시나리오에 맞게
// 세션을 준다. 서버 게시글은 빈 배열로 응답해 접힘 상태만 격리해 본다.
vi.mock("@/lib/auth", () => ({
  useAuth: () => ({
    ready: true,
    session: { user: { id: "user-1" } },
    user: { id: "user-1" },
  }),
}));
vi.mock("@/lib/supabase", () => ({
  isSupabaseConfigured: true,
  getSupabase: () => ({
    from: () => {
      const q: Record<string, unknown> = {
        then: (res: (v: unknown) => unknown) =>
          Promise.resolve({ data: [], error: null }).then(res),
      };
      for (const m of ["select", "order", "eq", "maybeSingle", "is", "not"]) q[m] = () => q;
      return q;
    },
  }),
}));

const KEY = "mini-notion-v1";

let store: ReturnType<typeof useApp> | null = null;

function Probe() {
  store = useApp();
  return <span data-testid="collapsed">{String(store.sidebarCollapsed)}</span>;
}

function renderStore() {
  return render(
    <AppProvider>
      <Probe />
    </AppProvider>
  );
}

afterEach(() => {
  cleanup();
  localStorage.clear();
  store = null;
});

// FR-010 / Key Entities: 기본값은 "펼침"(collapsed = false).
test("기본 사이드바 상태는 펼침이다 (Key Entities 기본값)", () => {
  const { getByTestId } = renderStore();
  expect(getByTestId("collapsed").textContent).toBe("false");
});

// FR-001~FR-003: 단일 토글이 양방향 전환을 담당한다.
test("toggleSidebar가 접힘↔펼침을 양방향 전환한다 (FR-001/FR-003)", () => {
  const { getByTestId } = renderStore();

  act(() => store!.toggleSidebar());
  expect(getByTestId("collapsed").textContent).toBe("true");

  act(() => store!.toggleSidebar());
  expect(getByTestId("collapsed").textContent).toBe("false");
});

// Edge Case "토글 버튼 연타": 마지막 클릭에 해당하는 최종 상태로 수렴한다.
test("연속 토글해도 마지막 호출의 최종 상태로 수렴한다 (Edge Case: 연타)", () => {
  const { getByTestId } = renderStore();

  act(() => {
    store!.toggleSidebar();
    store!.toggleSidebar();
    store!.toggleSidebar();
  });

  expect(getByTestId("collapsed").textContent).toBe("true");
});

// FR-010 / SC-004: 상태는 기존 localStorage 스키마에 함께 영속화된다.
test("접힘 상태가 localStorage에 저장된다 (FR-010/SC-004)", () => {
  localStorage.setItem(KEY, JSON.stringify({ nickname: "김민수" }));
  renderStore();

  act(() => store!.toggleSidebar());

  const saved = JSON.parse(localStorage.getItem(KEY)!);
  expect(saved.sidebarCollapsed).toBe(true);
  // 같은 키를 공유하는 별명 오버라이드를 훼손하지 않는다.
  // (게시글·프로필 사진은 이 키에 저장되지 않는다 — 서버가 원본이다.)
  expect(saved.nickname).toBe("김민수");
  expect(saved.posts).toBeUndefined();
});

// FR-010 / SC-004: 새로고침(=재마운트) 후에도 직전 상태가 복원된다.
test("저장된 접힘 상태가 재마운트 시 복원된다 (FR-010/SC-004)", () => {
  localStorage.setItem(
    KEY,
    JSON.stringify({ posts: [], nickname: null, loggedIn: true, sidebarCollapsed: true })
  );

  const { getByTestId } = renderStore();
  expect(getByTestId("collapsed").textContent).toBe("true");
});

// 하위 호환: 이 기능 이전에 저장된 데이터(필드 없음)는 기본값 "펼침"으로 읽힌다.
test("sidebarCollapsed 필드가 없는 기존 저장 데이터는 펼침으로 복원된다", () => {
  localStorage.setItem(
    KEY,
    JSON.stringify({ posts: [], nickname: null, loggedIn: true })
  );

  const { getByTestId } = renderStore();
  expect(getByTestId("collapsed").textContent).toBe("false");
});
