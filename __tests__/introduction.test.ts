import { describe, expect, test } from "vitest";
import {
  INTRODUCTION_MAX_LENGTH,
  normalizeIntroduction,
} from "@/lib/profile-sync";

// normalizeIntroduction: 자기소개 입력값 → profile.introduction 에 저장할 값.
// 별명(saveNickname)과 동일한 규칙 — 앞뒤 공백 제거, 빈 값은 null.
describe("normalizeIntroduction", () => {
  test("앞뒤 공백을 제거한 값을 저장한다 (FR-006)", () => {
    expect(normalizeIntroduction("  안녕하세요  ")).toBe("안녕하세요");
  });

  test("공백만 입력하면 빈 값(null)으로 취급한다 (FR-006)", () => {
    expect(normalizeIntroduction("   \n  ")).toBe(null);
  });

  test("빈 문자열이면 null — 자기소개 삭제 (FR-005)", () => {
    expect(normalizeIntroduction("")).toBe(null);
  });

  test("가운데 줄바꿈은 그대로 보존한다 (FR-008)", () => {
    expect(normalizeIntroduction("첫 줄\n둘째 줄\n\n넷째 줄")).toBe(
      "첫 줄\n둘째 줄\n\n넷째 줄"
    );
  });

  test("최대 길이는 200자다 (FR-007)", () => {
    expect(INTRODUCTION_MAX_LENGTH).toBe(200);
  });

  test("한도를 넘는 입력은 한도까지만 받아들인다 (FR-007)", () => {
    const long = "가".repeat(250);
    expect(normalizeIntroduction(long)).toBe("가".repeat(200));
  });

  test("정확히 한도 길이면 잘리지 않는다 (FR-007)", () => {
    const exact = "나".repeat(200);
    expect(normalizeIntroduction(exact)).toBe(exact);
  });
});
