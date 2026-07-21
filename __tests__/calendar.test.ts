import { describe, expect, test } from "vitest";
import {
  dateKey,
  eventsByDay,
  fromDatetimeLocal,
  monthGrid,
  toDatetimeLocal,
} from "@/lib/calendar";

// 월간 캘린더 그리드: 일요일 시작, 6주(42칸) 고정 (spec: 2026-07-21-calendar-design.md)
describe("monthGrid", () => {
  test("항상 42칸(6주)이고 첫 칸은 일요일이다", () => {
    const cells = monthGrid(2026, 6); // 2026년 7월
    expect(cells).toHaveLength(42);
    expect(cells[0].date.getDay()).toBe(0);
  });

  test("2026년 7월: 그리드가 6/28(일)에서 시작하고 7/1은 수요일 자리(index 3)다", () => {
    const cells = monthGrid(2026, 6);
    expect(dateKey(cells[0].date)).toBe("2026-06-28");
    expect(cells[0].inMonth).toBe(false);
    expect(dateKey(cells[3].date)).toBe("2026-07-01");
    expect(cells[3].inMonth).toBe(true);
  });

  test("표시 월의 모든 날짜가 inMonth=true로 포함된다", () => {
    const cells = monthGrid(2026, 6);
    const inMonthKeys = cells.filter((c) => c.inMonth).map((c) => dateKey(c.date));
    expect(inMonthKeys).toHaveLength(31);
    expect(inMonthKeys[0]).toBe("2026-07-01");
    expect(inMonthKeys[30]).toBe("2026-07-31");
  });

  test("1일이 일요일인 달(2026년 2월)은 그리드가 1일부터 시작한다", () => {
    const cells = monthGrid(2026, 1); // 2026년 2월 1일 = 일요일
    expect(dateKey(cells[0].date)).toBe("2026-02-01");
    expect(cells[0].inMonth).toBe(true);
    // 28일(2월) 뒤에는 다음 달 날짜가 inMonth=false로 채워진다.
    expect(dateKey(cells[28].date)).toBe("2026-03-01");
    expect(cells[28].inMonth).toBe(false);
  });

  test("연말 경계: 2026년 12월 그리드는 2027년 1월 날짜로 끝난다", () => {
    const cells = monthGrid(2026, 11);
    const last = cells[41];
    expect(last.date.getFullYear()).toBe(2027);
    expect(last.inMonth).toBe(false);
  });
});

describe("dateKey", () => {
  test("로컬 기준 YYYY-MM-DD로, 월·일을 0으로 채운다", () => {
    expect(dateKey(new Date(2026, 0, 5))).toBe("2026-01-05");
    expect(dateKey(new Date(2026, 11, 31))).toBe("2026-12-31");
  });
});

// datetime-local 입력값(로컬 시각) ↔ epoch ms 변환
describe("toDatetimeLocal / fromDatetimeLocal", () => {
  test("epoch ms를 YYYY-MM-DDTHH:mm(로컬)로 변환한다", () => {
    const ms = new Date(2026, 6, 21, 9, 5).getTime();
    expect(toDatetimeLocal(ms)).toBe("2026-07-21T09:05");
  });

  test("입력값을 epoch ms로 되돌린다(왕복 보존)", () => {
    const ms = new Date(2026, 6, 21, 14, 30).getTime();
    expect(fromDatetimeLocal(toDatetimeLocal(ms))).toBe(ms);
  });

  test("빈 입력은 null(종료 시각 없음)", () => {
    expect(fromDatetimeLocal("")).toBeNull();
  });
});

// 이벤트 → 날짜별 매핑. 여러 날 일정은 걸치는 모든 날짜에 나타난다(연속 바 대신 칩 표시).
describe("eventsByDay", () => {
  const gridStart = new Date(2026, 5, 28); // 2026-06-28
  const gridEnd = new Date(2026, 7, 8); // 2026-08-08
  const at = (m: number, d: number, h = 0) => new Date(2026, m, d, h).getTime();

  test("end가 없는 일정은 시작 날짜에만 매핑된다", () => {
    const ev = { id: "1", startAt: at(6, 21, 10), endAt: null };
    const map = eventsByDay([ev], gridStart, gridEnd);
    expect(map.get("2026-07-21")).toEqual([ev]);
    expect(map.size).toBe(1);
  });

  test("여러 날 일정은 걸치는 모든 날짜에 매핑된다", () => {
    const ev = { id: "1", startAt: at(6, 20, 10), endAt: at(6, 22, 11) };
    const map = eventsByDay([ev], gridStart, gridEnd);
    expect(map.get("2026-07-20")).toEqual([ev]);
    expect(map.get("2026-07-21")).toEqual([ev]);
    expect(map.get("2026-07-22")).toEqual([ev]);
    expect(map.size).toBe(3);
  });

  test("그리드 범위를 벗어나는 구간은 잘라낸다", () => {
    const ev = { id: "1", startAt: at(5, 25), endAt: at(6, 1) }; // 6/25~7/1
    const map = eventsByDay([ev], gridStart, gridEnd);
    expect(map.has("2026-06-27")).toBe(false); // 그리드 시작 전
    expect(map.get("2026-06-28")).toEqual([ev]);
    expect(map.get("2026-07-01")).toEqual([ev]);
  });

  test("그리드와 전혀 겹치지 않는 일정은 매핑되지 않는다", () => {
    const ev = { id: "1", startAt: at(9, 1), endAt: null }; // 10월
    expect(eventsByDay([ev], gridStart, gridEnd).size).toBe(0);
  });

  test("같은 날의 여러 일정은 배열로 쌓인다", () => {
    const a = { id: "a", startAt: at(6, 21, 9), endAt: null };
    const b = { id: "b", startAt: at(6, 21, 13), endAt: null };
    const map = eventsByDay([a, b], gridStart, gridEnd);
    expect(map.get("2026-07-21")).toEqual([a, b]);
  });
});
