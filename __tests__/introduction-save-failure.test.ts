import { beforeEach, expect, test, vi } from "vitest";
import { saveIntroduction } from "@/lib/profile-sync";

// saveIntroduction 은 upsert 가 아니라 update 를 쓴다(같은 행의 name/email/avatar_url 보존).
// 그런데 update 는 조건에 맞는 행이 없으면 **에러가 아니라 0행**을 돌려준다.
// - profile 행이 아직 없는 경우(로그인 시 syncProfileRow 가 실패했던 사용자)
// - RLS 의 update USING 절이 행을 걸러내는 경우
// 둘 다 PostgREST는 성공으로 응답하므로, 호출자는 "저장됐다"고 오해한다.
// 따라서 영향받은 행 수를 확인해 0행이면 실패로 보고해야 한다.

const fromMock = vi.fn();
vi.mock("@/lib/supabase", () => ({
  isSupabaseConfigured: true,
  getSupabase: () => ({ from: fromMock }),
}));

/** update(...).eq(...).select() 체인이 주어진 결과로 끝나는 쿼리 목. */
function makeQuery(result: unknown) {
  const q: Record<string, unknown> = {
    then: (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) =>
      Promise.resolve(result).then(res, rej),
  };
  for (const m of ["update", "eq", "select"]) q[m] = vi.fn(() => q);
  return q;
}

beforeEach(() => {
  fromMock.mockReset();
});

test("한 행이 갱신되면 성공으로 보고한다", async () => {
  fromMock.mockImplementation(() =>
    makeQuery({ data: [{ user_id: "user-1" }], error: null })
  );

  const { error } = await saveIntroduction("user-1", "안녕하세요");

  expect(error).toBeNull();
});

test("갱신된 행이 없으면(프로필 행 없음·RLS 거부) 실패로 보고한다", async () => {
  fromMock.mockImplementation(() => makeQuery({ data: [], error: null }));

  const { error } = await saveIntroduction("user-1", "안녕하세요");

  expect(error).toBeTruthy();
});

test("Supabase가 에러를 돌려주면 그 메시지를 전달한다", async () => {
  fromMock.mockImplementation(() =>
    makeQuery({ data: null, error: { message: "network down" } })
  );

  const { error } = await saveIntroduction("user-1", "안녕하세요");

  expect(error).toBe("network down");
});
