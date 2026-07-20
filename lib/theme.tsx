"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

// Contract: specs/003-dark-mode/contracts/theme-ui.md §1

export type Theme = "light" | "dark";

/**
 * 테마 선호 전용 localStorage 키. 앱 상태 키("mini-notion-v1")와 분리한다 —
 * <head> 인라인 스크립트가 앱 번들보다 먼저 실행되므로 JSON 파싱 없이 읽어야 한다(research §R5).
 */
export const THEME_STORAGE_KEY = "mini-notion-theme";

/**
 * 초기 테마 해석. 순수 함수 — localStorage/DOM에 접근하지 않고 값만 계산한다.
 * 명시 선택(저장값)이 시스템 설정보다 우선한다(FR-006).
 */
export function resolveInitialTheme(
  stored: string | null,
  systemPrefersDark: boolean
): Theme {
  if (stored === "light" || stored === "dark") return stored;
  return systemPrefersDark ? "dark" : "light";
}

// --- 브라우저 경계 (모두 try/catch — 저장 차단 환경에서도 앱이 멈추지 않는다, FR-010) ---

function readStoredTheme(): string | null {
  try {
    return window.localStorage.getItem(THEME_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStoredTheme(theme: Theme): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // 시크릿 모드·저장소 차단: 저장만 생략하고 세션 상태는 그대로 유지한다.
  }
}

function systemPrefersDark(): boolean {
  try {
    return (
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
    );
  } catch {
    return false;
  }
}

type ThemeContextValue = {
  theme: Theme;
  toggle: () => void;
  setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // lazy 초기화: <head> 인라인 스크립트와 **같은 소스**를 읽어 DOM과 초기 상태가 항상 일치한다
  // (Next.js 가이드 preventing-flash-before-hydration §Syncing with React state).
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") return "light";
    return resolveInitialTheme(readStoredTheme(), systemPrefersDark());
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // 명시 선택만 저장한다(data-model). 시스템에서 유래한 초기값은 기록하지 않는다.
  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    writeStoredTheme(next);
  }, []);

  // 함수형 업데이트 — 빠른 연속 토글에서도 최종 상태가 어긋나지 않는다(스펙 엣지 케이스).
  const toggle = useCallback(() => {
    setThemeState((current) => {
      const next: Theme = current === "dark" ? "light" : "dark";
      writeStoredTheme(next);
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggle, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within <ThemeProvider>");
  return ctx;
}
