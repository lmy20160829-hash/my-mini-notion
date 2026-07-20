import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { AppProvider } from "@/lib/store";
import { AppShell } from "@/components/AppShell";

// 사이드바 접기/펼치기 앱 셸 통합 검증.
// next/navigation은 Next 런타임 밖(jsdom)에서 동작하지 않는 프레임워크 경계라 최소 모킹한다.
// 스토어(AppProvider)·AppShell·사이드바 프리미티브는 모두 실제 코드다(헌법 II 모킹 규율).
const nav = vi.hoisted(() => ({
  pathname: "/" as string,
  pushed: [] as string[],
}));
vi.mock("next/navigation", () => ({
  usePathname: () => nav.pathname,
  useRouter: () => ({
    push: (href: string) => nav.pushed.push(href),
    replace: (href: string) => nav.pushed.push(href),
  }),
}));

const KEY = "mini-notion-v1";

const SEED = {
  loggedIn: true,
  nickname: "김민수",
  avatar: null,
  posts: [
    { id: "p1", title: "이번 주 할 일 정리", content: "", favorite: false, createdAt: 1 },
  ],
};

function renderShell() {
  return render(
    <AppProvider>
      <AppShell>
        <div>본문</div>
      </AppShell>
    </AppProvider>
  );
}

const toggle = () => screen.getByRole("button", { name: /사이드바 (접기|펼치기)/ });

beforeEach(() => {
  nav.pathname = "/";
  nav.pushed = [];
  localStorage.setItem(KEY, JSON.stringify(SEED));
});
afterEach(() => {
  cleanup();
  localStorage.clear();
});

// ---------- User Story 1: 한 버튼으로 접고 펼치기 ----------

// FR-001/FR-004/FR-005: 사이드바 안에 단일 토글 버튼이 있고, 현재 상태를 이름으로 구분한다.
test("펼침 상태에서 토글 버튼은 '사이드바 접기'로 노출된다 (FR-001/FR-005)", () => {
  const { container } = renderShell();

  const btn = toggle();
  expect(container.querySelector(".sidebar")!.contains(btn)).toBe(true);
  expect(btn).toHaveProperty("tagName", "BUTTON");
  expect(btn.getAttribute("aria-label")).toBe("사이드바 접기");
  expect(btn.getAttribute("aria-expanded")).toBe("true");
});

// US1 시나리오 1: 클릭하면 좁은 레일로 접힌다.
test("토글 클릭 시 사이드바가 레일로 접힌다 (US1-1/FR-002)", () => {
  const { container } = renderShell();

  fireEvent.click(toggle());

  expect(container.querySelector(".sidebar")!.className).toContain("is-collapsed");
});

// US1 시나리오 2 + FR-003/FR-004: 같은 버튼을 다시 눌러 펼친다.
test("같은 버튼을 다시 클릭하면 원래 너비로 펼쳐진다 (US1-2/FR-003)", () => {
  const { container } = renderShell();
  const sidebar = () => container.querySelector(".sidebar")!;

  fireEvent.click(toggle());
  expect(sidebar().className).toContain("is-collapsed");

  fireEvent.click(toggle());
  expect(sidebar().className).not.toContain("is-collapsed");
  // 펼치면 검색·글 목록이 다시 나타난다.
  expect(screen.getByPlaceholderText("글 검색")).toBeTruthy();
  expect(screen.getByText("이번 주 할 일 정리")).toBeTruthy();
});

// US1 시나리오 3 + FR-004/FR-005: 접힌 상태에서도 같은 버튼 1개가 보이며 방향이 바뀐다.
test("접힌 상태에서도 토글 버튼 1개가 보이며 '사이드바 펼치기'로 바뀐다 (US1-3/FR-004)", () => {
  renderShell();

  fireEvent.click(toggle());

  const btns = screen.getAllByRole("button", { name: /사이드바 (접기|펼치기)/ });
  expect(btns).toHaveLength(1);
  expect(btns[0].getAttribute("aria-label")).toBe("사이드바 펼치기");
  expect(btns[0].getAttribute("aria-expanded")).toBe("false");
});

// Edge Case "연타": 빠르게 여러 번 눌러도 중간 상태에 갇히지 않는다.
test("연타해도 마지막 클릭의 최종 상태로 수렴한다 (Edge Case: 연타)", () => {
  const { container } = renderShell();

  fireEvent.click(toggle());
  fireEvent.click(toggle());
  fireEvent.click(toggle());

  expect(container.querySelector(".sidebar")!.className).toContain("is-collapsed");
});

// FR-012: 키보드 조작 가능 + 보조 기술이 이름/펼침 여부를 인지할 수 있다.
test("토글 버튼은 키보드로 포커스 가능하고 aria-controls로 사이드바를 가리킨다 (FR-012)", () => {
  const { container } = renderShell();
  const btn = toggle() as HTMLButtonElement;

  // 네이티브 <button>이므로 Tab 순서에 포함되고 Enter/Space로 활성화된다.
  expect(btn.disabled).toBe(false);
  expect(btn.getAttribute("tabindex")).toBeNull();
  btn.focus();
  expect(document.activeElement).toBe(btn);

  const controls = btn.getAttribute("aria-controls");
  expect(controls).toBeTruthy();
  expect(container.querySelector(".sidebar")!.id).toBe(controls);
});

// ---------- User Story 2: 접힌 상태에서도 핵심 내비게이션 유지 ----------

// US2 시나리오 3 + FR-007: 레일에서는 텍스트 기반 요소가 숨겨진다.
test("접힌 레일에서 검색·섹션 헤더·글 목록이 숨겨진다 (US2-3/FR-007)", () => {
  renderShell();

  fireEvent.click(toggle());

  expect(screen.queryByPlaceholderText("글 검색")).toBeNull();
  expect(screen.queryByText("내 글")).toBeNull();
  expect(screen.queryByText("앱")).toBeNull();
  expect(screen.queryByText("이번 주 할 일 정리")).toBeNull();
  expect(screen.queryByRole("button", { name: "새 페이지" })).toBeNull();
  // 프로필의 텍스트도 숨긴다.
  expect(screen.queryByText("마이 페이지")).toBeNull();
});

// US2 시나리오 3 + FR-007: 고정 내비 아이콘·토글·프로필 아바타는 레일에 남는다.
test("접힌 레일에 고정 내비 항목과 프로필 아바타가 남는다 (US2-3/FR-007)", () => {
  const { container } = renderShell();

  fireEvent.click(toggle());

  const sidebar = container.querySelector(".sidebar")!;
  const labels = Array.from(sidebar.querySelectorAll(".sidebar-item")).map((el) =>
    el.getAttribute("title")
  );
  expect(labels).toEqual(["홈", "캘린더", "할 일", "휴지통"]);
  expect(sidebar.querySelector(".sidebar__profile .avatar")).not.toBeNull();
});

// US2 시나리오 1 + FR-008: 레일의 홈 아이콘은 펼침 상태와 동일하게 이동한다.
test("접힌 레일의 홈 아이콘 클릭 시 홈으로 이동한다 (US2-1/FR-008)", () => {
  nav.pathname = "/posts/p1";
  const { container } = renderShell();

  fireEvent.click(toggle());

  const home = container.querySelector('.sidebar-item[title="홈"]')!;
  fireEvent.click(home);
  expect(nav.pushed).toContain("/");
});

// US2 시나리오 2 + FR-009/SC-005: 레일 아이콘에 호버하면 항목 이름을 툴팁으로 확인할 수 있다.
test("접힌 레일의 각 아이콘이 이름 툴팁을 가진다 (US2-2/FR-009)", () => {
  const { container } = renderShell();

  fireEvent.click(toggle());

  const items = Array.from(container.querySelectorAll(".sidebar-item"));
  expect(items.length).toBeGreaterThan(0);
  for (const item of items) {
    expect(item.getAttribute("title")).toBeTruthy();
  }
});

// Edge Case "현재 열려 있는 글의 활성 표시": 레일에 남는 항목의 활성 표시는 유지된다.
test("접힌 레일에서도 홈의 활성 표시가 유지된다 (Edge Case: 활성 표시)", () => {
  const { container } = renderShell();

  fireEvent.click(toggle());

  const home = container.querySelector('.sidebar-item[title="홈"]')!;
  expect(home.className).toContain("is-active");
});

// ---------- User Story 3: 상태 유지 ----------

// US3 시나리오 2 + SC-004: 새로고침(재마운트) 후에도 접힌 상태가 유지된다.
test("접은 뒤 재마운트해도 접힌 상태가 유지된다 (US3-2/SC-004)", () => {
  const first = renderShell();
  fireEvent.click(toggle());
  expect(first.container.querySelector(".sidebar")!.className).toContain("is-collapsed");

  cleanup();

  const second = renderShell();
  expect(second.container.querySelector(".sidebar")!.className).toContain("is-collapsed");
  expect(screen.queryByPlaceholderText("글 검색")).toBeNull();
});

// US3 시나리오 3: 펼친 상태로 새로고침하면 펼친 상태로 표시된다.
test("펼친 상태로 재마운트하면 펼친 상태가 유지된다 (US3-3)", () => {
  const { container } = renderShell();
  expect(container.querySelector(".sidebar")!.className).not.toContain("is-collapsed");
  expect(screen.getByPlaceholderText("글 검색")).toBeTruthy();
});
