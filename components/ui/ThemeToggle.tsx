"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme";

// Contract: specs/003-dark-mode/contracts/theme-ui.md §2
// 상단바 중앙의 테마 토글. 기존 .icon-btn 프리미티브(DESIGN.md §2.2)를 그대로 재사용한다.
// 아이콘·라벨은 "누르면 일어날 동작"을 안내한다(FR-008).
export function ThemeToggle() {
  const { theme, toggle } = useTheme();

  const label = theme === "light" ? "다크 모드로 전환" : "라이트 모드로 전환";
  const Icon = theme === "light" ? Moon : Sun;

  return (
    <button
      type="button"
      className="icon-btn"
      title={label}
      aria-label={label}
      aria-pressed={theme === "dark"}
      onClick={toggle}
    >
      <Icon size={16} />
    </button>
  );
}
