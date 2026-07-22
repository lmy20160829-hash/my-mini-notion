import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { PAGE_ICONS, PageIconButton } from "@/components/icon/PageIconButton";

// 페이지 이모지 아이콘(⑦, §4.3 확장) — 고정 24종 그리드 + "제거", 외부 라이브러리 금지.
// 저장(updatePost 단발 UPDATE)은 스토어 몫이라 여기서는 onChange 계약만 검증한다.

afterEach(cleanup);

function renderButton(icon: string | null = null) {
  const onChange = vi.fn();
  const utils = render(<PageIconButton icon={icon} onChange={onChange} />);
  return { ...utils, onChange };
}

test("고정 이모지 목록은 24종이다(외부 라이브러리 없음)", () => {
  expect(PAGE_ICONS).toHaveLength(24);
  expect(new Set(PAGE_ICONS).size).toBe(24);
});

test("아이콘이 없으면 '아이콘 추가' 유령 버튼을 렌더한다", () => {
  renderButton(null);
  expect(screen.getByRole("button", { name: /아이콘 추가/ })).toBeDefined();
});

test("아이콘이 있으면 이모지 버튼('아이콘 변경')을 렌더한다", () => {
  renderButton("🔥");
  const btn = screen.getByRole("button", { name: "아이콘 변경" });
  expect(btn.textContent).toBe("🔥");
});

test("버튼 클릭 → 팝오버(24종 그리드)가 열리고, 이모지 선택 시 onChange 후 닫힌다", () => {
  const { onChange } = renderButton(null);

  fireEvent.click(screen.getByRole("button", { name: /아이콘 추가/ }));
  const dialog = screen.getByRole("dialog", { name: "아이콘 선택" });
  expect(dialog.querySelectorAll(".icon-pick__item")).toHaveLength(24);

  fireEvent.click(screen.getByRole("button", { name: PAGE_ICONS[0] }));
  expect(onChange).toHaveBeenCalledWith(PAGE_ICONS[0]);
  expect(screen.queryByRole("dialog")).toBeNull();
});

test("아이콘이 있을 때만 '제거' 버튼이 있고, 누르면 onChange(null)", () => {
  const { onChange } = renderButton("🔥");

  fireEvent.click(screen.getByRole("button", { name: "아이콘 변경" }));
  fireEvent.click(screen.getByRole("button", { name: "제거" }));

  expect(onChange).toHaveBeenCalledWith(null);
  expect(screen.queryByRole("dialog")).toBeNull();
});

test("아이콘이 없으면 팝오버에 '제거' 버튼이 없다", () => {
  renderButton(null);
  fireEvent.click(screen.getByRole("button", { name: /아이콘 추가/ }));
  expect(screen.queryByRole("button", { name: "제거" })).toBeNull();
});

test("ESC로 팝오버가 닫힌다(선택 없음)", () => {
  const { onChange } = renderButton(null);
  fireEvent.click(screen.getByRole("button", { name: /아이콘 추가/ }));
  fireEvent.keyDown(window, { key: "Escape" });
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(onChange).not.toHaveBeenCalled();
});
