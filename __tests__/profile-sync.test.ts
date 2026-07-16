import { describe, expect, test } from "vitest";
import type { User } from "@supabase/supabase-js";
import { toProfileRow } from "@/lib/profile-sync";

// toProfileRow: 구글 User → profile 테이블에 저장할 값(로컬 오버라이드 없이 인증 원본).
function user(partial: Partial<User>): User {
  return { id: "u-1", ...partial } as unknown as User;
}

describe("toProfileRow", () => {
  test("id/이름/이메일/아바타를 그대로 저장 값으로 뽑는다", () => {
    expect(
      toProfileRow(
        user({
          id: "abc-123",
          email: "gildong@gmail.com",
          user_metadata: {
            full_name: "홍길동",
            avatar_url: "https://img/g.png",
          },
        })
      )
    ).toEqual({
      user_id: "abc-123",
      name: "홍길동",
      email: "gildong@gmail.com",
      avatar_url: "https://img/g.png",
    });
  });

  test("full_name 없으면 name → email 순으로 이름 폴백", () => {
    expect(
      toProfileRow(user({ email: "x@y.com", user_metadata: { name: "김이름" } }))
        .name
    ).toBe("김이름");
    expect(
      toProfileRow(user({ email: "x@y.com", user_metadata: {} })).name
    ).toBe("x@y.com");
  });

  test("이름 후보가 전혀 없으면 '사용자' 기본값", () => {
    expect(toProfileRow(user({ email: undefined, user_metadata: {} })).name).toBe(
      "사용자"
    );
  });

  test("구글 picture 필드도 아바타로 인식", () => {
    expect(
      toProfileRow(user({ user_metadata: { picture: "https://img/p.png" } }))
        .avatar_url
    ).toBe("https://img/p.png");
  });

  test("아바타가 없으면 null", () => {
    expect(toProfileRow(user({ user_metadata: {} })).avatar_url).toBe(null);
  });

  test("이메일이 없으면 null", () => {
    expect(toProfileRow(user({ email: undefined, user_metadata: {} })).email).toBe(
      null
    );
  });
});
