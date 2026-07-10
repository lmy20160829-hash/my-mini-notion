import { describe, expect, test } from "vitest";
import { countGraphemes } from "@/lib/charCount";

// Contract: specs/001-char-counter/contracts/count-graphemes.md
// grapheme cluster(사용자가 하나로 인식하는 글자) 단위로 계수한다.
describe("countGraphemes", () => {
  test.each([
    ["", 0], // FR-005 빈 내용
    ["안녕", 2], // FR-009 한글 각 1
    ["hello", 5], // FR-009 라틴
    ["a b\nc", 5], // FR-009 공백+줄바꿈 포함
    ["   ", 3], // FR-009 공백 3
    ["👨‍👩‍👧", 1], // FR-009 ZWJ 가족 이모지 → 1
    ["🇰🇷", 1], // FR-009 국기 → 1
    ["👍🏽", 1], // FR-009 피부톤 변형 → 1
    ["가나다😀", 4], // FR-009 한글 3 + 이모지 1
  ])("countGraphemes(%j) === %i", (input, expected) => {
    expect(countGraphemes(input)).toBe(expected);
  });
});
