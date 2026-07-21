import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  deleteEvent,
  fetchMyEvents,
  insertEvent,
  rowToEvent,
  toEventPayload,
  updateEvent,
} from "@/lib/events";

// Supabase 클라이언트 목: posts.test.ts 와 같은 방식으로 { data, error } 구조를 재현한다.
const fromMock = vi.fn();

vi.mock("@/lib/supabase", () => ({
  isSupabaseConfigured: true,
  getSupabase: () => ({ from: fromMock }),
}));

type Result = { data?: unknown; error?: unknown };

/** 체이닝 가능한 쿼리 빌더 목. await 하면 주어진 결과로 resolve 된다. */
function makeQuery(result: Result) {
  const q: Record<string, unknown> = {
    then: (res: (v: Result) => unknown, rej: (e: unknown) => unknown) =>
      Promise.resolve(result).then(res, rej),
  };
  for (const m of [
    "insert",
    "select",
    "order",
    "update",
    "delete",
    "eq",
    "gte",
    "lte",
    "single",
  ]) {
    q[m] = vi.fn(() => q);
  }
  return q as Record<string, ReturnType<typeof vi.fn>> & Result;
}

const ROW = {
  id: "e-1",
  user_id: "u-1",
  title: "치과",
  description: "정기 검진",
  start_at: "2026-07-21T09:00:00.000Z",
  end_at: "2026-07-21T10:00:00.000Z",
  all_day: false,
  color: "green",
  created_at: "2026-07-20T00:00:00.000Z",
  updated_at: "2026-07-20T00:00:00.000Z",
};

beforeEach(() => {
  fromMock.mockReset();
});

// events 행 ↔ 클라이언트 CalendarEvent 매핑 (lib/posts.ts rowToPost 대칭)
describe("rowToEvent", () => {
  test("uuid id는 문자열 그대로, 시각은 epoch ms로 매핑한다", () => {
    expect(rowToEvent(ROW)).toEqual({
      id: "e-1",
      title: "치과",
      description: "정기 검진",
      startAt: Date.parse("2026-07-21T09:00:00.000Z"),
      endAt: Date.parse("2026-07-21T10:00:00.000Z"),
      allDay: false,
      color: "green",
    });
  });

  test("description/end_at이 null이면 빈 문자열/null로 채운다", () => {
    const ev = rowToEvent({ ...ROW, description: null, end_at: null });
    expect(ev.description).toBe("");
    expect(ev.endAt).toBeNull();
  });

  test("허용 목록 밖의 color는 기본값 blue로 폴백한다", () => {
    expect(rowToEvent({ ...ROW, color: "magenta" }).color).toBe("blue");
  });
});

// 모달 초안 → INSERT/UPDATE 페이로드 (제목 trim, 빈 설명 → null, ms → ISO)
describe("toEventPayload", () => {
  test("제목을 trim하고 시각을 ISO 문자열로 변환한다", () => {
    const startAt = Date.parse("2026-07-21T09:00:00.000Z");
    const endAt = Date.parse("2026-07-21T10:00:00.000Z");
    expect(
      toEventPayload({
        title: "  치과  ",
        description: "정기 검진",
        startAt,
        endAt,
        allDay: false,
        color: "green",
      })
    ).toEqual({
      title: "치과",
      description: "정기 검진",
      start_at: new Date(startAt).toISOString(),
      end_at: new Date(endAt).toISOString(),
      all_day: false,
      color: "green",
    });
  });

  test("빈 설명은 null로, 종료 없음은 end_at null로 보낸다", () => {
    const payload = toEventPayload({
      title: "t",
      description: "   ",
      startAt: Date.parse("2026-07-21T09:00:00.000Z"),
      endAt: null,
      allDay: true,
      color: "blue",
    });
    expect(payload.description).toBeNull();
    expect(payload.end_at).toBeNull();
    expect(payload.all_day).toBe(true);
  });

  test("user_id를 넣지 않는다 — DB default(auth.uid())가 소유자를 기록한다", () => {
    const payload = toEventPayload({
      title: "t",
      description: "",
      startAt: 0,
      endAt: null,
      allDay: false,
      color: "blue",
    });
    expect("user_id" in payload).toBe(false);
  });
});

describe("fetchMyEvents", () => {
  test("표시 범위를 start_at 기준으로 조회해 CalendarEvent[]로 매핑한다", async () => {
    const q = makeQuery({ data: [ROW], error: null });
    fromMock.mockReturnValue(q);

    const events = await fetchMyEvents(
      "2026-06-28T00:00:00.000Z",
      "2026-08-08T23:59:59.999Z"
    );

    expect(fromMock).toHaveBeenCalledWith("events");
    expect(q.select).toHaveBeenCalledWith("*");
    expect(q.gte).toHaveBeenCalledWith("start_at", "2026-06-28T00:00:00.000Z");
    expect(q.lte).toHaveBeenCalledWith("start_at", "2026-08-08T23:59:59.999Z");
    expect(q.order).toHaveBeenCalledWith("start_at", { ascending: true });
    // 사용자 필터를 클라이언트에서 걸지 않는다 — 격리는 RLS(events_select_own)가 강제한다.
    expect(q.eq).not.toHaveBeenCalled();
    expect(events).toEqual([rowToEvent(ROW)]);
  });

  test("서버 오류면 throw 한다", async () => {
    fromMock.mockReturnValue(makeQuery({ data: null, error: { message: "조회 실패" } }));
    await expect(fetchMyEvents("a", "b")).rejects.toThrow("조회 실패");
  });

  test("data가 null이면 빈 배열", async () => {
    fromMock.mockReturnValue(makeQuery({ data: null, error: null }));
    expect(await fetchMyEvents("a", "b")).toEqual([]);
  });
});

describe("insertEvent", () => {
  test("payload를 INSERT하고 반환 행을 CalendarEvent로 매핑한다", async () => {
    const q = makeQuery({ data: ROW, error: null });
    fromMock.mockReturnValue(q);
    const payload = toEventPayload({
      title: "치과",
      description: "정기 검진",
      startAt: Date.parse(ROW.start_at),
      endAt: Date.parse(ROW.end_at),
      allDay: false,
      color: "green",
    });

    const ev = await insertEvent(payload);

    expect(fromMock).toHaveBeenCalledWith("events");
    expect(q.insert).toHaveBeenCalledWith(payload);
    expect(q.select).toHaveBeenCalled();
    expect(q.single).toHaveBeenCalled();
    expect(ev).toEqual(rowToEvent(ROW));
  });

  test("서버 오류면 throw 한다", async () => {
    fromMock.mockReturnValue(makeQuery({ data: null, error: { message: "insert 거부" } }));
    await expect(
      insertEvent(
        toEventPayload({
          title: "t",
          description: "",
          startAt: 0,
          endAt: null,
          allDay: false,
          color: "blue",
        })
      )
    ).rejects.toThrow("insert 거부");
  });
});

// A2 계약: RLS가 거른 UPDATE/DELETE는 에러가 아니라 0행으로 끝난다.
// .select("id")로 영향받은 행을 돌려받아 0행이면 실패로 throw 한다.
describe("updateEvent", () => {
  test("id로 UPDATE하고 .select('id')로 영향 행을 확인한다", async () => {
    const q = makeQuery({ data: [{ id: "e-1" }], error: null });
    fromMock.mockReturnValue(q);

    await updateEvent("e-1", { title: "고친 제목" });

    expect(fromMock).toHaveBeenCalledWith("events");
    expect(q.update).toHaveBeenCalledWith({ title: "고친 제목" });
    expect(q.eq).toHaveBeenCalledWith("id", "e-1");
    expect(q.select).toHaveBeenCalledWith("id");
  });

  test("0행이면 throw 한다(무성음 실패 차단 — A2)", async () => {
    fromMock.mockReturnValue(makeQuery({ data: [], error: null }));
    await expect(updateEvent("e-1", { title: "x" })).rejects.toThrow(
      "일정을 찾지 못해 저장하지 못했습니다."
    );
  });

  test("서버 오류면 그 메시지로 throw 한다", async () => {
    fromMock.mockReturnValue(makeQuery({ data: null, error: { message: "수정 실패" } }));
    await expect(updateEvent("e-1", { title: "x" })).rejects.toThrow("수정 실패");
  });
});

describe("deleteEvent", () => {
  test("id로 DELETE하고 .select('id')로 영향 행을 확인한다", async () => {
    const q = makeQuery({ data: [{ id: "e-1" }], error: null });
    fromMock.mockReturnValue(q);

    await deleteEvent("e-1");

    expect(fromMock).toHaveBeenCalledWith("events");
    expect(q.delete).toHaveBeenCalled();
    expect(q.eq).toHaveBeenCalledWith("id", "e-1");
    expect(q.select).toHaveBeenCalledWith("id");
  });

  test("0행이면 throw 한다(무성음 실패 차단 — A2)", async () => {
    fromMock.mockReturnValue(makeQuery({ data: [], error: null }));
    await expect(deleteEvent("e-1")).rejects.toThrow(
      "일정을 찾지 못해 삭제하지 못했습니다."
    );
  });

  test("서버 오류면 그 메시지로 throw 한다", async () => {
    fromMock.mockReturnValue(makeQuery({ data: null, error: { message: "삭제 실패" } }));
    await expect(deleteEvent("e-1")).rejects.toThrow("삭제 실패");
  });
});
