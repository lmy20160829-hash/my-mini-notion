import { expect, test } from "vitest";
import { TEXT_COLORS, HIGHLIGHT_COLORS } from "@/lib/editor/palette";

test("글자색 8종(기본 포함)", () => {
  expect(TEXT_COLORS).toHaveLength(8);
  expect(TEXT_COLORS[0].value).toBeNull(); // 기본 = 상속
});
test("배경색 8종(없음 포함)", () => {
  expect(HIGHLIGHT_COLORS).toHaveLength(8);
  expect(HIGHLIGHT_COLORS[0].value).toBeNull();
});
test("hex는 소문자 6자리 고정(임의 색 차단)", () => {
  [...TEXT_COLORS, ...HIGHLIGHT_COLORS].filter((c) => c.value).forEach((c) => {
    expect(c.value).toMatch(/^#[0-9a-f]{6}$/);
  });
});
