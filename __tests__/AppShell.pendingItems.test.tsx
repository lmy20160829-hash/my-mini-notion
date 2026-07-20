import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { AppProvider } from "@/lib/store";
import { ThemeProvider } from "@/lib/theme";
import { AppShell } from "@/components/AppShell";

// 아직 만들지 않은 셸 요소(상단바 5종 + 사이드바 "앱" 3종)가 **비활성으로 보이는지** 검증한다.
// 이 테스트가 있는 이유: 이전에는 onClick 만 빼고 겉모습은 눌리는 버튼 그대로여서,
// 사용자가 두 번이나 "작동하지 않는다"고 고장으로 신고했다. 장식이라는 사실이
// 화면에 드러나지 않으면 그건 장식이 아니라 버그로 읽힌다.
const nav = vi.hoisted(() => ({ pathname: "/" as string, pushed: [] as string[] }));
vi.mock("next/navigation", () => ({
  usePathname: () => nav.pathname,
  useRouter: () => ({
    push: (href: string) => nav.pushed.push(href),
    replace: (href: string) => nav.pushed.push(href),
  }),
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

function makeQuery(result: unknown) {
  const q: Record<string, unknown> = {
    then: (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) =>
      Promise.resolve(result).then(res, rej),
  };
  for (const m of ["insert", "select", "order", "update", "delete", "eq", "single", "maybeSingle"]) {
    q[m] = vi.fn(() => q);
  }
  return q;
}

/** 상단바 5종 + "앱" 섹션 3종 = 미구현 8개. */
const PENDING = ["알림", "검색", "도움말", "앱", "메뉴", "캘린더", "할 일", "휴지통"];

async function renderShell() {
  const result = render(
    <ThemeProvider>
      <AppProvider>
        <AppShell>
          <div>본문</div>
        </AppShell>
      </AppProvider>
    </ThemeProvider>
  );
  await screen.findByRole("button", { name: /사이드바 (접기|펼치기)/ });
  return result;
}

/**
 * 이름으로 셸 버튼을 찾는다. `title` 로 찾는 이유: 상단바 아이콘은 접근성 이름이
 * `aria-label`("알림 (준비 중)")에서 오지만, 사이드바 항목은 보이는 텍스트("캘린더")에서
 * 온다(보이는 레이블과 접근성 이름을 일치시키는 게 옳다). 두 경우 모두 `title` 은
 * "X (준비 중)" 으로 같으므로 이 속성으로 통일해 조회한다.
 */
function pendingButton(name: string): HTMLButtonElement {
  const el = document.querySelector<HTMLButtonElement>(
    `button[title="${name} (준비 중)"]`
  );
  if (!el) throw new Error(`"${name} (준비 중)" 버튼을 찾지 못했습니다.`);
  return el;
}

beforeEach(() => {
  nav.pathname = "/";
  nav.pushed = [];
  localStorage.setItem("mini-notion-v1", JSON.stringify({ nickname: "김민수" }));
  fromMock.mockReset();
  fromMock.mockImplementation(() => makeQuery({ data: [], error: null }));
});
afterEach(() => {
  cleanup();
  localStorage.clear();
});

test("미구현 8종이 모두 aria-disabled 로 노출된다", async () => {
  await renderShell();

  for (const name of PENDING) {
    const btn = pendingButton(name);
    expect(btn.getAttribute("aria-disabled")).toBe("true");
    expect(btn.className).toContain("is-disabled");
  }
});

// 툴팁이 "준비 중"을 알리는 유일한 수단이라, 이름이 통째로 사라지면 안 된다.
test("툴팁에 원래 이름과 '(준비 중)'이 함께 남는다", async () => {
  await renderShell();

  for (const name of PENDING) {
    expect(pendingButton(name).getAttribute("title")).toBe(`${name} (준비 중)`);
  }
});

// 진짜 `disabled` 속성을 쓰면 브라우저가 포인터 이벤트를 없애 title 툴팁이 뜨지 않는다.
// 그러면 "준비 중"이라는 사실을 전달할 방법이 사라지고, 접힌 레일에서 아이콘 이름을
// 확인하는 FR-009 도 함께 깨진다. 그래서 aria-disabled 를 쓴다 — 이 선택을 고정한다.
test("disabled 속성 대신 aria-disabled 를 써서 툴팁이 살아 있다", async () => {
  await renderShell();

  for (const name of PENDING) {
    expect(pendingButton(name).disabled).toBe(false);
  }
});

test("눌러도 아무 일이 일어나지 않는다 (라우팅 없음)", async () => {
  await renderShell();

  for (const name of PENDING) {
    fireEvent.click(pendingButton(name));
  }

  expect(nav.pushed).toEqual([]);
});

// 실제로 동작하는 항목까지 비활성으로 만들면 안 된다.
test("동작하는 항목(홈·프로필·사이드바 토글·테마)은 비활성이 아니다", async () => {
  const { container } = await renderShell();

  const home = container.querySelector('.sidebar-item[title="홈"]')!;
  expect(home.getAttribute("aria-disabled")).toBeNull();
  fireEvent.click(home);
  expect(nav.pushed).toContain("/");

  const toggle = screen.getByRole("button", { name: /사이드바 (접기|펼치기)/ });
  expect(toggle.getAttribute("aria-disabled")).toBeNull();
  expect(toggle.className).not.toContain("is-disabled");
});
