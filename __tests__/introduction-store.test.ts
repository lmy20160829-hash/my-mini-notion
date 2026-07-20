import { beforeEach, describe, expect, test, vi } from "vitest";

// fetchIntroduction / saveIntroduction 은 profile 테이블의 introduction 컬럼만 읽고 쓴다.
// 모킹은 외부 경계(네트워크 = Supabase 클라이언트) 한 곳에만 둔다 — 정규화·쿼리 구성·에러 매핑은
// 전부 실제 코드가 수행하고, 가짜 클라이언트는 supabase-js 의 체이닝 모양을 그대로 흉내낸다.
type Call = {
  op: "select" | "update";
  table: string;
  columns?: string;
  payload?: Record<string, unknown>;
  filter?: [string, unknown];
};

const db = vi.hoisted(() => ({
  configured: true,
  row: null as Record<string, unknown> | null,
  selectError: null as { message: string } | null,
  updateError: null as { message: string } | null,
  // update 가 몇 행에 매칭됐는지. 0이면 프로필 행 없음/RLS 거부(에러 아님).
  rowsUpdated: 1,
  calls: [] as Call[],
}));

vi.mock("@/lib/supabase", () => ({
  get isSupabaseConfigured() {
    return db.configured;
  },
  getSupabase: () => ({
    from(table: string) {
      return {
        select(columns: string) {
          const call: Call = { op: "select", table, columns };
          db.calls.push(call);
          const chain = {
            eq(column: string, value: unknown) {
              call.filter = [column, value];
              return chain;
            },
            async maybeSingle() {
              if (db.selectError) return { data: null, error: db.selectError };
              return { data: db.row, error: null };
            },
          };
          return chain;
        },
        update(payload: Record<string, unknown>) {
          const call: Call = { op: "update", table, payload };
          db.calls.push(call);
          return {
            eq(column: string, value: unknown) {
              call.filter = [column, value];
              // PostgREST 처럼 .select() 로 갱신된 행을 돌려준다.
              // 조건에 맞는 행이 없으면 에러가 아니라 빈 배열이다(db.rowsUpdated=0).
              return {
                select: async () => ({
                  data: db.updateError
                    ? null
                    : Array.from({ length: db.rowsUpdated }, () => ({
                        user_id: value,
                      })),
                  error: db.updateError,
                }),
              };
            },
          };
        },
      };
    },
  }),
}));

const { fetchIntroduction, saveIntroduction } = await import(
  "@/lib/profile-sync"
);

beforeEach(() => {
  db.configured = true;
  db.row = null;
  db.selectError = null;
  db.updateError = null;
  db.rowsUpdated = 1;
  db.calls = [];
});

describe("fetchIntroduction (US2 조회)", () => {
  test("본인 profile 행의 introduction 을 읽어온다 (FR-003)", async () => {
    db.row = { introduction: "안녕하세요, 기획자입니다." };
    const result = await fetchIntroduction("user-1");
    expect(result).toEqual({
      introduction: "안녕하세요, 기획자입니다.",
      error: null,
    });
    expect(db.calls[0]).toEqual({
      op: "select",
      table: "profile",
      columns: "introduction",
      filter: ["user_id", "user-1"],
    });
  });

  test("여러 줄 자기소개도 줄바꿈 그대로 돌려준다 (FR-008)", async () => {
    db.row = { introduction: "첫 줄\n둘째 줄" };
    expect((await fetchIntroduction("user-1")).introduction).toBe(
      "첫 줄\n둘째 줄"
    );
  });

  test("자기소개가 없으면 null (FR-011)", async () => {
    db.row = { introduction: null };
    expect((await fetchIntroduction("user-1")).introduction).toBe(null);
  });

  test("profile 행 자체가 없어도 오류 없이 null", async () => {
    db.row = null;
    expect(await fetchIntroduction("user-1")).toEqual({
      introduction: null,
      error: null,
    });
  });

  test("조회 실패는 error 로 전달하고 값은 null", async () => {
    db.selectError = { message: "permission denied" };
    expect(await fetchIntroduction("user-1")).toEqual({
      introduction: null,
      error: "permission denied",
    });
  });
});

describe("saveIntroduction (US1 등록 / US3 수정·삭제)", () => {
  test("정규화된 자기소개를 introduction 컬럼에만 쓴다 (FR-002/FR-012)", async () => {
    const result = await saveIntroduction("user-1", "  안녕하세요  ");
    expect(result).toEqual({ error: null });
    expect(db.calls[0]).toEqual({
      op: "update",
      table: "profile",
      payload: { introduction: "안녕하세요" },
      filter: ["user_id", "user-1"],
    });
    // update 만 사용하므로 name/email/avatar_url 은 쿼리에 등장하지 않는다.
    expect(Object.keys(db.calls[0].payload!)).toEqual(["introduction"]);
  });

  test("빈 값으로 저장하면 introduction 이 null 이 된다 (FR-005)", async () => {
    await saveIntroduction("user-1", "");
    expect(db.calls[0].payload).toEqual({ introduction: null });
  });

  test("공백만 저장해도 null 로 제거된다 (FR-006)", async () => {
    await saveIntroduction("user-1", "   \n ");
    expect(db.calls[0].payload).toEqual({ introduction: null });
  });

  test("한도를 넘는 값은 200자까지만 저장된다 (FR-007)", async () => {
    await saveIntroduction("user-1", "가".repeat(250));
    expect(db.calls[0].payload).toEqual({ introduction: "가".repeat(200) });
  });

  test("새 값이 이전 값을 덮어쓴다 — update 는 본인 행만 대상으로 한다 (FR-004)", async () => {
    await saveIntroduction("user-9", "바뀐 소개");
    expect(db.calls[0].filter).toEqual(["user_id", "user-9"]);
  });

  test("저장 실패는 error 로 전달한다", async () => {
    db.updateError = { message: "network error" };
    expect(await saveIntroduction("user-1", "소개")).toEqual({
      error: "network error",
    });
  });

  // update 는 조건에 맞는 행이 없어도 에러가 아니라 0행으로 끝난다
  // (프로필 행 없음, 또는 RLS 의 update USING 절이 행을 걸러낸 경우).
  // 이걸 성공으로 넘기면 아무것도 안 쓰였는데 "저장되었습니다"가 표시된다.
  test("갱신된 행이 0개면 에러가 없어도 실패로 보고한다", async () => {
    db.rowsUpdated = 0;
    const { error } = await saveIntroduction("user-1", "소개");
    expect(error).toBeTruthy();
  });
});

describe("Supabase 미설정 환경", () => {
  test("조회는 쿼리 없이 빈 값을 돌려준다", async () => {
    db.configured = false;
    expect(await fetchIntroduction("user-1")).toEqual({
      introduction: null,
      error: null,
    });
    expect(db.calls).toEqual([]);
  });

  test("저장은 쿼리 없이 조용히 넘어간다", async () => {
    db.configured = false;
    expect(await saveIntroduction("user-1", "소개")).toEqual({ error: null });
    expect(db.calls).toEqual([]);
  });
});
