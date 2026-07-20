import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, render, waitFor } from "@testing-library/react";
import { AppProvider, useApp } from "@/lib/store";

// 별명은 localStorage("mini-notion-v1")에 남는 로컬 오버라이드이고, 프로필 사진 경로는
// 서버(profile.image_path)에서 읽어 스토어에 담긴다. 둘 다 useProfile 이 구글 계정
// 값보다 **우선** 적용한다. 로그아웃 때 지우지 않으면 같은 브라우저에서 다음 사용자가
// 로그인했을 때 이전 사용자의 별명과 사진이 사이드바·마이페이지에 그대로 보인다.
// 게시글은 이미 로그아웃 시 비우고 있으므로(세션 effect), 프로필도 같은 규칙을 따라야 한다.
//
// 사이드바 접힘은 사용자 데이터가 아니라 기기 UI 환경설정이므로 유지한다.

const KEY = "mini-notion-v1";

const auth = vi.hoisted(() => ({
  state: { ready: true, session: null, user: null } as {
    ready: boolean;
    session: { user: { id: string } } | null;
    user: { id: string } | null;
  },
}));
vi.mock("@/lib/auth", () => ({ useAuth: () => auth.state }));

const fromMock = vi.fn();
vi.mock("@/lib/supabase", () => ({
  isSupabaseConfigured: true,
  getSupabase: () => ({ from: fromMock }),
}));

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

let store: ReturnType<typeof useApp> | null = null;
function Probe() {
  store = useApp();
  return null;
}
function renderStore() {
  return render(
    <AppProvider>
      <Probe />
    </AppProvider>
  );
}

beforeEach(() => {
  auth.state = {
    ready: true,
    session: { user: { id: "user-1" } },
    user: { id: "user-1" },
  };
  fromMock.mockReset();
  fromMock.mockImplementation(() => makeQuery({ data: [], error: null }));
  localStorage.clear();
});
afterEach(() => {
  cleanup();
  localStorage.clear();
  store = null;
});

test("로그아웃하면 별명이 localStorage에서 지워진다", async () => {
  localStorage.setItem(
    KEY,
    JSON.stringify({ nickname: "이전사용자", sidebarCollapsed: true })
  );
  renderStore();
  await waitFor(() => expect(store!.nickname).toBe("이전사용자"));

  // 로그아웃 = 세션이 사라진다.
  await act(async () => {
    auth.state = { ready: true, session: null, user: null };
  });
  renderStore();

  await waitFor(() => {
    const saved = JSON.parse(localStorage.getItem(KEY)!);
    expect(saved.nickname).toBeNull();
  });
});

// 예전 스키마의 base64 아바타를 읽어 오면, 서버에 올린 새 사진보다 우선해 버려
// 사진을 바꿔도 예전 이미지가 계속 보인다. 그래서 아예 읽지도 쓰지도 않는다.
test("예전 스키마의 avatar(base64)는 읽지도 다시 쓰지도 않는다", async () => {
  localStorage.setItem(
    KEY,
    JSON.stringify({ nickname: "김민수", avatar: "data:image/png;base64,AAA" })
  );
  renderStore();
  await waitFor(() => expect(store!.nickname).toBe("김민수"));

  expect(store!.profileImagePath).toBeNull();
  await waitFor(() => {
    const saved = JSON.parse(localStorage.getItem(KEY)!);
    expect(saved.avatar).toBeUndefined();
  });
});

test("로그아웃해도 사이드바 접힘(기기 환경설정)은 유지된다", async () => {
  localStorage.setItem(
    KEY,
    JSON.stringify({ nickname: "이전사용자", sidebarCollapsed: true })
  );
  renderStore();
  await waitFor(() => expect(store!.sidebarCollapsed).toBe(true));

  await act(async () => {
    auth.state = { ready: true, session: null, user: null };
  });
  renderStore();

  await waitFor(() => {
    const saved = JSON.parse(localStorage.getItem(KEY)!);
    expect(saved.sidebarCollapsed).toBe(true);
  });
});

test("로그아웃 직후 스토어 상태에도 이전 별명·사진이 남지 않는다", async () => {
  localStorage.setItem(KEY, JSON.stringify({ nickname: "이전사용자" }));
  const { rerender } = renderStore();
  await waitFor(() => expect(store!.nickname).toBe("이전사용자"));
  act(() => store!.setProfileImagePath("abc.png"));

  // 세션이 사라지면 useAuth가 새 값을 돌려주지만, 그건 리렌더가 있어야 반영된다.
  auth.state = { ready: true, session: null, user: null };
  await act(async () => {
    rerender(
      <AppProvider>
        <Probe />
      </AppProvider>
    );
  });

  await waitFor(() => {
    expect(store!.nickname).toBeNull();
    expect(store!.profileImagePath).toBeNull();
    expect(store!.profileImageUrl).toBeNull();
  });
});
