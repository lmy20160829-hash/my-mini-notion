import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";
import { AppProvider, useApp } from "@/lib/store";

// 사이드바 페이지 트리(⑤)의 접힘 상태 스토어 계약 — §5.5 localStorage 스키마 확장.
// 실제 스토어·실제 localStorage(jsdom)를 사용하고, 목은 인증/서버 경계에만 둔다(헌법 II).
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
  return (
    <span data-testid="collapsed-ids">{store.treeCollapsedIds.join(",")}</span>
  );
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

test("기본값은 전부 펼침(빈 목록)이다", () => {
  const { getByTestId } = renderStore();
  expect(getByTestId("collapsed-ids").textContent).toBe("");
});

test("setTreeNodeCollapsed(id, true/false)가 접힘 목록을 넣고 뺀다", () => {
  const { getByTestId } = renderStore();

  act(() => store!.setTreeNodeCollapsed("7", true));
  expect(getByTestId("collapsed-ids").textContent).toBe("7");

  // 이미 접힌 항목을 다시 접어도 중복이 생기지 않는다.
  act(() => store!.setTreeNodeCollapsed("7", true));
  expect(getByTestId("collapsed-ids").textContent).toBe("7");

  act(() => store!.setTreeNodeCollapsed("7", false));
  expect(getByTestId("collapsed-ids").textContent).toBe("");
});

test("접힘 상태가 기존 localStorage 스키마에 함께 저장된다 (§5.5 확장)", () => {
  localStorage.setItem(
    KEY,
    JSON.stringify({ nickname: "김민수", sidebarCollapsed: true })
  );
  renderStore();

  act(() => store!.setTreeNodeCollapsed("3", true));

  const saved = JSON.parse(localStorage.getItem(KEY)!);
  expect(saved.treeCollapsed).toEqual(["3"]);
  // 같은 키를 공유하는 기존 필드를 훼손하지 않는다.
  expect(saved.nickname).toBe("김민수");
  expect(saved.sidebarCollapsed).toBe(true);
});

test("저장된 접힘 목록이 재마운트 시 복원된다", () => {
  localStorage.setItem(
    KEY,
    JSON.stringify({ nickname: null, treeCollapsed: ["1", "2"] })
  );
  const { getByTestId } = renderStore();
  expect(getByTestId("collapsed-ids").textContent).toBe("1,2");
});

test("treeCollapsed 필드가 없는 기존 저장 데이터는 전부 펼침으로 복원된다", () => {
  localStorage.setItem(KEY, JSON.stringify({ nickname: null }));
  const { getByTestId } = renderStore();
  expect(getByTestId("collapsed-ids").textContent).toBe("");
});

test("문자열이 아닌 항목은 버린다(스키마 방어)", () => {
  localStorage.setItem(
    KEY,
    JSON.stringify({ treeCollapsed: ["1", 2, null, "3"] })
  );
  const { getByTestId } = renderStore();
  expect(getByTestId("collapsed-ids").textContent).toBe("1,3");
});
