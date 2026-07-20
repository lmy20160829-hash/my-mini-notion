import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { ThemeProvider, THEME_STORAGE_KEY } from "@/lib/theme";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

// Contract: specs/003-dark-mode/contracts/theme-ui.md §2, §불변식 6

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  vi.unstubAllGlobals();
});

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  // jsdom 미제공 경계만 최소 목: 시스템 설정은 항상 라이트로 고정한다.
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }));
});

function renderToggle() {
  return render(
    <ThemeProvider>
      <ThemeToggle />
    </ThemeProvider>
  );
}

test("라이트에서는 '다크 모드로 전환' 라벨의 버튼을 렌더한다 (FR-008)", () => {
  renderToggle();

  const button = screen.getByRole("button", { name: "다크 모드로 전환" });
  expect(button).toBeDefined();
  expect(button.getAttribute("title")).toBe("다크 모드로 전환");
  expect(button.getAttribute("type")).toBe("button");
});

test("기존 .icon-btn 프리미티브를 재사용한다 (DESIGN.md §2.2, research §R6)", () => {
  renderToggle();

  const button = screen.getByRole("button", { name: "다크 모드로 전환" });
  expect(button.classList.contains("icon-btn")).toBe(true);
});

test("현재 테마를 aria-pressed로 표현한다 (contract §2 접근성)", () => {
  renderToggle();

  const button = screen.getByRole("button", { name: "다크 모드로 전환" });
  expect(button.getAttribute("aria-pressed")).toBe("false");
});

test("클릭하면 data-theme이 dark로 바뀌고 라벨이 반대 동작을 안내한다 (불변식 1·6, FR-002)", () => {
  renderToggle();

  act(() => {
    screen.getByRole("button", { name: "다크 모드로 전환" }).click();
  });

  expect(document.documentElement.getAttribute("data-theme")).toBe("dark");

  const button = screen.getByRole("button", { name: "라이트 모드로 전환" });
  expect(button.getAttribute("aria-pressed")).toBe("true");
});

test("다시 클릭하면 라이트로 복귀한다 (US1-2)", () => {
  renderToggle();

  act(() => {
    screen.getByRole("button", { name: "다크 모드로 전환" }).click();
  });
  act(() => {
    screen.getByRole("button", { name: "라이트 모드로 전환" }).click();
  });

  expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  expect(screen.getByRole("button", { name: "다크 모드로 전환" })).toBeDefined();
});

test("클릭한 선택은 localStorage에 저장된다 (불변식 2, FR-004)", () => {
  renderToggle();

  act(() => {
    screen.getByRole("button", { name: "다크 모드로 전환" }).click();
  });

  expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
});
