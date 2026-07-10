import { afterEach, expect, test } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { CharCount } from "@/components/CharCount";

// Contract: specs/001-char-counter/contracts/char-count-component.md

// 이 설정은 globals를 켜지 않아 RTL 자동 cleanup이 없다. 렌더가 여러 개면
// document.body에 누적되므로 각 테스트 후 언마운트한다(테스트 격리).
afterEach(cleanup);

test("라틴 텍스트의 grapheme 수를 '자' 접미사와 함께 렌더한다", () => {
  render(<CharCount text="hello" />);
  expect(screen.getByText("5자")).toBeDefined();
});

test("한글 음절을 각각 1로 세어 표시한다", () => {
  render(<CharCount text="안녕하세요" />);
  expect(screen.getByText("5자")).toBeDefined();
});

test("text prop이 바뀌면 표시 숫자가 즉시 갱신된다 (실시간, FR-002)", () => {
  const { rerender } = render(<CharCount text="hi" />);
  expect(screen.getByText("2자")).toBeDefined();
  rerender(<CharCount text="hiya" />);
  expect(screen.getByText("4자")).toBeDefined();
});

test("상호작용 없이 초기 마운트 시 저장된 내용의 글자 수를 즉시 표시한다 (US2, FR-003)", () => {
  // 기존 글을 연 직후 상태: 아무 입력 없이 현재 content의 글자 수가 바로 보여야 한다.
  const content = "가".repeat(120);
  render(<CharCount text={content} />);
  expect(screen.getByText("120자")).toBeDefined();
});
