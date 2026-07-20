import { afterEach, beforeEach, expect, test, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";

// 마이 페이지 자기소개 통합 검증 (US1 등록 / US2 조회 / US3 수정·삭제).
// 모킹은 외부 경계인 Supabase 클라이언트 한 곳뿐 — AuthProvider·AppProvider·useProfile·
// profile-sync·페이지는 전부 실제 코드다. 가짜 클라이언트는 profile 행 하나를 실제로
// 보관하고 update/upsert 로 갱신하므로, "다른 필드가 보존되는가"까지 진짜로 검증된다.
const db = vi.hoisted(() => ({
  row: {} as Record<string, unknown>,
}));

vi.mock("@/lib/supabase", () => {
  const session = {
    user: {
      id: "u-1",
      email: "gildong@gmail.com",
      user_metadata: { full_name: "홍길동", avatar_url: "https://img/g.png" },
    },
  };
  return {
    isSupabaseConfigured: true,
    getSupabase: () => ({
      auth: {
        getSession: async () => ({ data: { session } }),
        onAuthStateChange: () => ({
          data: { subscription: { unsubscribe: () => {} } },
        }),
        signOut: async () => {},
      },
      from: (table: string) => ({
        // 로그인 시 syncProfileRow 가 쓰는 경로. introduction 은 payload 에 없으므로 보존된다.
        upsert(payload: Record<string, unknown>) {
          if (table === "profile") Object.assign(db.row, payload);
          return Promise.resolve({ error: null });
        },
        select(columns: string) {
          // page 테이블 조회(목록)는 빈 결과로 끝낸다 — 이 파일은 프로필만 다룬다.
          // 지원하지 않으면 스토어가 로드 실패 알림을 띄워, 저장 실패 알림과 구분되지 않는다.
          const chain = {
            eq: (column: string, value: unknown) => {
              void column;
              void value;
              return chain;
            },
            order: () => Promise.resolve({ data: [], error: null }),
            maybeSingle: async () => {
              if (table !== "profile") return { data: null, error: null };
              const picked: Record<string, unknown> = {};
              for (const key of columns.split(",")) {
                picked[key.trim()] = db.row[key.trim()] ?? null;
              }
              return { data: picked, error: null };
            },
          };
          return chain;
        },
        // 실제 PostgREST 처럼 동작한다: 조건에 맞는 행이 없으면 에러가 아니라 0행이다.
        // .select() 를 붙이면 갱신된 행이 돌아오고, 붙이지 않으면 결과만 돌아온다.
        update(payload: Record<string, unknown>) {
          const matched = () => table === "profile" && db.row[column] === value;
          let column = "";
          let value: unknown;
          const result = () => {
            if (!matched()) return { data: [], error: null };
            Object.assign(db.row, payload);
            return { data: [{ ...db.row }], error: null };
          };
          const chain = {
            eq: (c: string, v: unknown) => {
              column = c;
              value = v;
              // .select() 없이 await 하는 호출자도 지원한다.
              return Object.assign(Promise.resolve(result()), {
                select: async () => result(),
              });
            },
          };
          return chain;
        },
      }),
    }),
  };
});

const { AppProvider } = await import("@/lib/store");
const { AuthProvider } = await import("@/lib/auth");
const MyPage = (await import("@/app/(app)/mypage/page")).default;

function renderMyPage() {
  return render(
    <AuthProvider>
      <AppProvider>
        <MyPage />
      </AppProvider>
    </AuthProvider>
  );
}

/** 자기소개 입력란이 로딩을 마치고 현재 값을 보여줄 때까지 기다린다. */
async function introField(expected: string): Promise<HTMLTextAreaElement> {
  const field = (await screen.findByLabelText(
    "자기소개"
  )) as HTMLTextAreaElement;
  await waitFor(() => expect(field.value).toBe(expected));
  return field;
}

function save() {
  fireEvent.click(screen.getByRole("button", { name: "변경사항 저장" }));
}

beforeEach(() => {
  db.row = {
    user_id: "u-1",
    name: "홍길동",
    email: "gildong@gmail.com",
    avatar_url: "https://img/g.png",
    introduction: null,
  };
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});

// ── US1 자기소개 등록 ────────────────────────────────────────────────
test("US1: 자기소개를 입력하고 저장하면 저장 완료가 표시되고 프로필에 반영된다", async () => {
  renderMyPage();
  const field = await introField("");

  fireEvent.change(field, { target: { value: "안녕하세요, 기획자입니다." } });
  save();

  expect(await screen.findByText("저장되었습니다")).toBeDefined();
  await waitFor(() =>
    expect(db.row.introduction).toBe("안녕하세요, 기획자입니다.")
  );
});

test("US1: 아무것도 입력하지 않고 저장해도 오류 없이 빈 상태로 완료된다", async () => {
  renderMyPage();
  await introField("");

  save();

  expect(await screen.findByText("저장되었습니다")).toBeDefined();
  await waitFor(() => expect(db.row.introduction).toBe(null));
});

// ── US2 자기소개 조회 ────────────────────────────────────────────────
test("US2: 저장해 둔 자기소개가 마이 페이지를 열면 입력란에 표시된다", async () => {
  db.row.introduction = "미니 노션으로 기록하는 사람";
  renderMyPage();

  await introField("미니 노션으로 기록하는 사람");
});

test("US2: 자기소개가 없으면 입력란은 비어 있고 안내 문구만 보인다", async () => {
  renderMyPage();
  const field = await introField("");

  expect(field.placeholder).toBe("자신을 간단히 소개해 보세요");
});

// ── US3 자기소개 수정·삭제 ──────────────────────────────────────────
test("US3: 다른 문장으로 바꿔 저장하면 이전 내용이 남지 않는다", async () => {
  db.row.introduction = "이전 소개";
  renderMyPage();
  const field = await introField("이전 소개");

  fireEvent.change(field, { target: { value: "새로 쓴 소개" } });
  save();

  await waitFor(() => expect(db.row.introduction).toBe("새로 쓴 소개"));
});

test("US3: 입력란을 비우고 저장하면 자기소개가 제거된다", async () => {
  db.row.introduction = "지울 소개";
  renderMyPage();
  const field = await introField("지울 소개");

  fireEvent.change(field, { target: { value: "" } });
  save();

  expect(await screen.findByText("저장되었습니다")).toBeDefined();
  await waitFor(() => expect(db.row.introduction).toBe(null));
});

// ── 엣지 케이스 ──────────────────────────────────────────────────────
test("공백만 입력하고 저장하면 빈 값으로 취급된다", async () => {
  db.row.introduction = "지울 소개";
  renderMyPage();
  const field = await introField("지울 소개");

  fireEvent.change(field, { target: { value: "   \n  " } });
  save();

  await waitFor(() => expect(db.row.introduction).toBe(null));
});

test("여러 줄 자기소개는 줄바꿈이 보존되어 다시 조회된다", async () => {
  renderMyPage();
  const field = await introField("");

  fireEvent.change(field, { target: { value: "첫 줄\n둘째 줄" } });
  save();
  await waitFor(() => expect(db.row.introduction).toBe("첫 줄\n둘째 줄"));

  cleanup();
  renderMyPage();
  await introField("첫 줄\n둘째 줄");
});

test("입력란은 최대 글자 수를 넘겨 입력할 수 없다", async () => {
  renderMyPage();
  const field = await introField("");

  expect(field.maxLength).toBe(200);
});

test("별명만 바꿔 저장해도 자기소개는 그대로 유지된다", async () => {
  db.row.introduction = "그대로 남을 소개";
  renderMyPage();
  await introField("그대로 남을 소개");

  fireEvent.change(screen.getByLabelText("별명"), {
    target: { value: "길동이" },
  });
  save();

  await waitFor(() => expect(db.row.introduction).toBe("그대로 남을 소개"));
});

test("자기소개만 저장해도 별명·이메일 등 다른 프로필 값은 변하지 않는다 (SC-005)", async () => {
  renderMyPage();
  const field = await introField("");

  fireEvent.change(field, { target: { value: "소개만 바꿈" } });
  save();

  await waitFor(() => expect(db.row.introduction).toBe("소개만 바꿈"));
  expect(db.row.name).toBe("홍길동");
  expect(db.row.email).toBe("gildong@gmail.com");
  expect(db.row.avatar_url).toBe("https://img/g.png");
});

// 저장이 실제로 이뤄지지 않았는데 "저장되었습니다"가 뜨면 사용자는 글을 잃고도 모른다.
// profile 행이 없거나(로그인 시 동기화 실패) RLS 가 거부하면 update 는 0행으로 끝나므로,
// 그 경우 성공 표시를 내지 않고 store 의 관행대로 알림을 띄워야 한다.
test("자기소개 저장이 실패하면 저장 완료 표시를 내지 않는다", async () => {
  const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
  renderMyPage();
  const field = await introField("");
  // 세션이 붙어 실제 저장 경로를 타는지 확인한 뒤에 조작한다.
  await screen.findByText("gildong@gmail.com");

  // 프로필 행이 사라진 상태 → update 가 어떤 행에도 매칭되지 않는다(0행, 에러 아님).
  db.row = {};
  fireEvent.change(field, { target: { value: "저장되지 않을 소개" } });
  save();

  await waitFor(() =>
    expect(alertSpy).toHaveBeenCalledWith(
      "프로필을 찾지 못해 자기소개를 저장하지 못했습니다."
    )
  );
  expect(screen.queryByText("저장되었습니다")).toBeNull();
  alertSpy.mockRestore();
});
