import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { ThemeProvider, useTheme, THEME_STORAGE_KEY } from "@/lib/theme";

// Contract: specs/003-dark-mode/contracts/theme-ui.md §1, §불변식

// 이 설정은 globals를 켜지 않아 RTL 자동 cleanup이 없다(기존 테스트와 동일 규약).
afterEach(() => {
  cleanup();
  window.localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  vi.unstubAllGlobals();
});

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
});

/**
 * jsdom은 matchMedia를 제공하지 않는다 → 브라우저 경계만 최소로 목한다(헌법 원칙 II).
 * 실제 미디어 질의 결과를 흉내 낼 뿐, 단언은 실제 Provider 동작·실제 DOM 속성에 대해 한다.
 */
function stubSystemPrefersDark(prefersDark: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query === "(prefers-color-scheme: dark)" ? prefersDark : false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }));
}

function Probe() {
  const { theme, toggle, setTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <button type="button" onClick={toggle}>
        toggle
      </button>
      <button type="button" onClick={() => setTheme("dark")}>
        force-dark
      </button>
    </div>
  );
}

function renderProbe() {
  return render(
    <ThemeProvider>
      <Probe />
    </ThemeProvider>
  );
}

test("저장값 'dark'로 마운트하면 초기 테마와 data-theme이 모두 dark다 (불변식 3)", () => {
  window.localStorage.setItem(THEME_STORAGE_KEY, "dark");
  stubSystemPrefersDark(false);

  renderProbe();

  expect(screen.getByTestId("theme").textContent).toBe("dark");
  expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
});

test("저장값이 없고 시스템이 다크면 초기 테마가 dark다 (불변식 4, FR-005)", () => {
  stubSystemPrefersDark(true);

  renderProbe();

  expect(screen.getByTestId("theme").textContent).toBe("dark");
  expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
});

test("저장값이 없고 시스템이 라이트면 초기 테마가 light다 (US3-2)", () => {
  stubSystemPrefersDark(false);

  renderProbe();

  expect(screen.getByTestId("theme").textContent).toBe("light");
  expect(document.documentElement.getAttribute("data-theme")).toBe("light");
});

test("토글하면 data-theme이 반대 값으로 바뀌고 localStorage에 저장된다 (불변식 1·2, FR-002/FR-004)", () => {
  stubSystemPrefersDark(false);
  renderProbe();

  act(() => {
    screen.getByRole("button", { name: "toggle" }).click();
  });

  expect(screen.getByTestId("theme").textContent).toBe("dark");
  expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");

  act(() => {
    screen.getByRole("button", { name: "toggle" }).click();
  });

  expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
});

test("시스템 설정에서 유래한 초기값은 저장하지 않는다 (data-model §명시 선택만 저장)", () => {
  stubSystemPrefersDark(true);

  renderProbe();

  expect(screen.getByTestId("theme").textContent).toBe("dark");
  expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
});

test("setTheme으로 특정 테마를 지정하면 적용·저장된다", () => {
  stubSystemPrefersDark(false);
  renderProbe();

  act(() => {
    screen.getByRole("button", { name: "force-dark" }).click();
  });

  expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
});

test("빠르게 연속 토글해도 최종 상태가 일관된다 (스펙 엣지 케이스)", () => {
  stubSystemPrefersDark(false);
  renderProbe();

  const button = screen.getByRole("button", { name: "toggle" });
  act(() => {
    button.click();
    button.click();
    button.click();
  });

  // light → dark → light → dark
  expect(screen.getByTestId("theme").textContent).toBe("dark");
  expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
});

test("localStorage 접근이 실패해도 렌더·토글이 세션 내에서 정상 동작한다 (FR-010, 불변식 5)", () => {
  stubSystemPrefersDark(false);
  const blocked = {
    getItem: () => {
      throw new Error("storage blocked");
    },
    setItem: () => {
      throw new Error("storage blocked");
    },
    removeItem: () => {},
    clear: () => {},
    key: () => null,
    length: 0,
  };
  vi.stubGlobal("localStorage", blocked);

  expect(() => renderProbe()).not.toThrow();
  expect(screen.getByTestId("theme").textContent).toBe("light");

  act(() => {
    screen.getByRole("button", { name: "toggle" }).click();
  });

  expect(screen.getByTestId("theme").textContent).toBe("dark");
  expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
});

test("Provider 밖에서 useTheme을 호출하면 에러를 던진다 (기존 useApp/useAuth 규약)", () => {
  expect(() => render(<Probe />)).toThrow();
});
