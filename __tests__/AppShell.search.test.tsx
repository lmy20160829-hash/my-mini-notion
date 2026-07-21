import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { AppProvider } from "@/lib/store";
import { ThemeProvider } from "@/lib/theme";
import { AppShell } from "@/components/AppShell";

// 사이드바 검색 필터링 앱 셸 통합 검증
// (docs/superpowers/specs/2026-07-21-search-design.md).
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

// 게시글은 Supabase(page 테이블)에서 오고 로그인은 Supabase 세션이 담당한다.
// 인증 세션과 Supabase 응답만 목킹하고 스토어·셸·프리미티브는 실제 코드다(헌법 II).
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
    created_at: "2026-07-18T00:00:00.000Z",
    title: "이번 주 할 일 정리",
    content: "회의 준비와 보고서 작성",
    user_id: "user-1",
  },
  {
    id: "p2",
    created_at: "2026-07-17T00:00:00.000Z",
    title: "장보기 목록",
    content: "우유, 계란",
    user_id: "user-1",
  },
  {
    id: "p3",
    created_at: "2026-07-16T00:00:00.000Z",
    title: "",
    content: "Supabase RLS 정책 메모",
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
    "is",
    "not",
    "single",
    "maybeSingle",
  ]) {
    q[m] = vi.fn(() => q);
  }
  return q;
}

// 게시글이 서버에서 비동기로 도착해야 셸이 렌더된다(그 전에는 AppShell이 null).
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
  await screen.findByPlaceholderText("글 검색");
  return result;
}

const searchInput = () =>
  screen.getByPlaceholderText("글 검색") as HTMLInputElement;

/** "내 글" 섹션의 글 항목 레이블 목록(사이드바 아이템 title 기준, 고정 내비 제외). */
function postLabels(container: HTMLElement): (string | null)[] {
  return Array.from(
    container.querySelectorAll('.sidebar-item[title]')
  )
    .map((el) => el.getAttribute("title"))
    .filter(
      (t) =>
        t !== "홈" &&
        t !== "캘린더 (준비 중)" &&
        t !== "할 일 (준비 중)" &&
        t !== "휴지통 (준비 중)" &&
        // 병렬 기능 머지로 활성화된 고정 내비 항목(툴팁에 접미사 없음)도 글이 아니다.
        t !== "캘린더" &&
        t !== "휴지통"
    );
}

const count = (container: HTMLElement) =>
  container.querySelector(".sidebar-section__count")!.textContent;

beforeEach(() => {
  nav.pathname = "/";
  nav.pushed = [];
  fromMock.mockReset();
  fromMock.mockImplementation(() => makeQuery({ data: ROWS, error: null }));
});
afterEach(() => {
  cleanup();
  localStorage.clear();
});

test("평소(빈 입력)에는 전체 글과 전체 개수를 표시한다", async () => {
  const { container } = await renderShell();

  expect(postLabels(container)).toEqual([
    "이번 주 할 일 정리",
    "장보기 목록",
    "제목 없음",
  ]);
  expect(count(container)).toBe("3");
});

test("제목 매치로 입력 시 목록이 줄어든다", async () => {
  const { container } = await renderShell();

  fireEvent.change(searchInput(), { target: { value: "장보기" } });

  expect(postLabels(container)).toEqual(["장보기 목록"]);
});

test("본문 매치로도 걸러진다", async () => {
  const { container } = await renderShell();

  fireEvent.change(searchInput(), { target: { value: "회의" } });

  expect(postLabels(container)).toEqual(["이번 주 할 일 정리"]);
});

test("대소문자를 무시하고 매치한다", async () => {
  const { container } = await renderShell();

  fireEvent.change(searchInput(), { target: { value: "supabase" } });

  expect(postLabels(container)).toEqual(["제목 없음"]);
});

test("검색 중에는 섹션 카운트가 매치 개수를 표시한다", async () => {
  const { container } = await renderShell();

  fireEvent.change(searchInput(), { target: { value: "회의" } });

  expect(count(container)).toBe("1");
});

test("매치가 없으면 '검색 결과가 없어요.'를 표시한다", async () => {
  const { container } = await renderShell();

  fireEvent.change(searchInput(), { target: { value: "없는 검색어" } });

  expect(postLabels(container)).toEqual([]);
  expect(screen.getByText("검색 결과가 없어요.")).toBeTruthy();
  // 글 자체가 없는 상태의 문구와 구분한다.
  expect(screen.queryByText("아직 글이 없어요.")).toBeNull();
  expect(count(container)).toBe("0");
});

test("입력을 비우면 전체 목록과 전체 개수로 복귀한다", async () => {
  const { container } = await renderShell();

  fireEvent.change(searchInput(), { target: { value: "장보기" } });
  expect(postLabels(container)).toEqual(["장보기 목록"]);

  fireEvent.change(searchInput(), { target: { value: "" } });

  expect(postLabels(container)).toEqual([
    "이번 주 할 일 정리",
    "장보기 목록",
    "제목 없음",
  ]);
  expect(count(container)).toBe("3");
  expect(screen.queryByText("검색 결과가 없어요.")).toBeNull();
});

test("공백만 입력하면 필터하지 않는다", async () => {
  const { container } = await renderShell();

  fireEvent.change(searchInput(), { target: { value: "   " } });

  expect(postLabels(container)).toEqual([
    "이번 주 할 일 정리",
    "장보기 목록",
    "제목 없음",
  ]);
  expect(count(container)).toBe("3");
});

test("글이 하나도 없으면 검색 문구가 아니라 '아직 글이 없어요.'를 표시한다", async () => {
  fromMock.mockImplementation(() => makeQuery({ data: [], error: null }));
  await renderShell();

  fireEvent.change(searchInput(), { target: { value: "아무거나" } });

  expect(screen.getByText("아직 글이 없어요.")).toBeTruthy();
  expect(screen.queryByText("검색 결과가 없어요.")).toBeNull();
});
