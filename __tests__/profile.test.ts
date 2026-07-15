import { describe, expect, test } from "vitest";
import { mergeProfile } from "@/lib/profile";

// mergeProfile: 구글 계정 정보 + 로컬 오버라이드 병합 규칙.
const noOverride = { nickname: null, avatar: null };

describe("mergeProfile", () => {
  test("구글 full_name / email / avatar_url 을 그대로 쓴다", () => {
    const user = {
      email: "gildong@gmail.com",
      user_metadata: {
        full_name: "홍길동",
        avatar_url: "https://img/g.png",
      },
    };
    expect(mergeProfile(user, noOverride)).toEqual({
      displayName: "홍길동",
      email: "gildong@gmail.com",
      avatarUrl: "https://img/g.png",
    });
  });

  test("로컬 nickname 오버라이드가 구글 이름보다 우선", () => {
    const user = {
      email: "gildong@gmail.com",
      user_metadata: { full_name: "홍길동" },
    };
    const p = mergeProfile(user, { nickname: "길동이", avatar: null });
    expect(p.displayName).toBe("길동이");
    expect(p.email).toBe("gildong@gmail.com");
  });

  test("로컬 avatar(dataURL) 오버라이드가 구글 사진보다 우선", () => {
    const user = {
      email: "a@b.com",
      user_metadata: { avatar_url: "https://img/g.png" },
    };
    const p = mergeProfile(user, { nickname: null, avatar: "data:image/png;base64,AAA" });
    expect(p.avatarUrl).toBe("data:image/png;base64,AAA");
  });

  test("full_name 없으면 name → email 순으로 이름 폴백", () => {
    expect(
      mergeProfile(
        { email: "x@y.com", user_metadata: { name: "김이름" } },
        noOverride
      ).displayName
    ).toBe("김이름");
    expect(
      mergeProfile({ email: "x@y.com", user_metadata: {} }, noOverride)
        .displayName
    ).toBe("x@y.com");
  });

  test("구글 picture 필드도 아바타로 인식", () => {
    const user = { email: "a@b.com", user_metadata: { picture: "https://img/p.png" } };
    expect(mergeProfile(user, noOverride).avatarUrl).toBe("https://img/p.png");
  });

  test("아바타가 로컬·구글 모두 없으면 null", () => {
    expect(mergeProfile({ email: "a@b.com", user_metadata: {} }, noOverride).avatarUrl).toBe(
      null
    );
  });

  test("user 가 null(비로그인)이면 email 빈값, 이름은 기본값", () => {
    expect(mergeProfile(null, noOverride)).toEqual({
      displayName: "사용자",
      email: "",
      avatarUrl: null,
    });
  });

  test("비로그인이라도 로컬 nickname 이 있으면 그 값을 쓴다", () => {
    expect(mergeProfile(null, { nickname: "익명", avatar: null }).displayName).toBe(
      "익명"
    );
  });
});
