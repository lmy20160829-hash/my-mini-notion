import { expect, test } from "vitest";
import { resolveInitialTheme, THEME_STORAGE_KEY } from "@/lib/theme";

// Contract: specs/003-dark-mode/contracts/theme-ui.md §1
// 표: specs/003-dark-mode/data-model.md §순수 함수 계약

test("저장값 'dark'는 시스템 설정과 무관하게 dark로 해석된다 (FR-006)", () => {
  expect(resolveInitialTheme("dark", false)).toBe("dark");
  expect(resolveInitialTheme("dark", true)).toBe("dark");
});

test("저장값 'light'는 시스템이 다크여도 light로 해석된다 (FR-006, US2-3)", () => {
  expect(resolveInitialTheme("light", true)).toBe("light");
  expect(resolveInitialTheme("light", false)).toBe("light");
});

test("저장값이 없으면 시스템 색상 설정을 따른다 (FR-005, US3)", () => {
  expect(resolveInitialTheme(null, true)).toBe("dark");
  expect(resolveInitialTheme(null, false)).toBe("light");
});

test("저장값이 무효하면 미저장과 동일하게 시스템 설정으로 해석한다 (data-model 검증 규칙)", () => {
  expect(resolveInitialTheme("garbage", true)).toBe("dark");
  expect(resolveInitialTheme("garbage", false)).toBe("light");
});

test("시스템 설정도 확인 불가(false)하고 저장값도 없으면 라이트가 기본값이다 (US3-3)", () => {
  expect(resolveInitialTheme(null, false)).toBe("light");
});

test("저장 키는 앱 상태 키(mini-notion-v1)와 분리된 전용 키다 (research §R5)", () => {
  expect(THEME_STORAGE_KEY).toBe("mini-notion-theme");
});
