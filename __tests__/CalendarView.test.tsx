import { afterEach, beforeEach, expect, test, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type { CalendarEvent } from "@/lib/events";
import { CalendarView } from "@/components/calendar/CalendarView";

// 네트워크 함수만 목으로 바꾸고 순수 매핑(toEventPayload 등)은 실제 구현을 쓴다.
vi.mock("@/lib/events", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/events")>();
  return {
    ...actual,
    fetchMyEvents: vi.fn(),
    insertEvent: vi.fn(),
    updateEvent: vi.fn(),
    deleteEvent: vi.fn(),
  };
});

import {
  deleteEvent,
  fetchMyEvents,
  insertEvent,
  updateEvent,
} from "@/lib/events";

const fetchMock = vi.mocked(fetchMyEvents);
const insertMock = vi.mocked(insertEvent);
const updateMock = vi.mocked(updateEvent);
const deleteMock = vi.mocked(deleteEvent);

const JULY = new Date(2026, 6, 21); // 2026-07-21

function makeEvent(over: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: "e-1",
    title: "치과",
    description: "정기 검진",
    startAt: new Date(2026, 6, 21, 9).getTime(),
    endAt: new Date(2026, 6, 21, 10).getTime(),
    allDay: false,
    color: "green",
    ...over,
  };
}

async function renderCalendar(initialDate = JULY) {
  const result = render(<CalendarView initialDate={initialDate} />);
  await waitFor(() => expect(fetchMock).toHaveBeenCalled());
  return result;
}

beforeEach(() => {
  fetchMock.mockReset().mockResolvedValue([]);
  insertMock.mockReset();
  updateMock.mockReset();
  deleteMock.mockReset();
  vi.spyOn(window, "alert").mockImplementation(() => {});
  vi.spyOn(window, "confirm").mockReturnValue(true);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

test("월 헤더·요일 행·42칸 그리드를 렌더한다", async () => {
  const { container } = await renderCalendar();

  expect(screen.getByText("2026년 7월")).toBeTruthy();
  expect(container.querySelectorAll(".calendar-cell")).toHaveLength(42);
  const weekdays = [...container.querySelectorAll(".calendar-weekdays span")].map(
    (el) => el.textContent
  );
  expect(weekdays).toEqual(["일", "월", "화", "수", "목", "금", "토"]);
});

test("이전/다음 달 버튼으로 이동하고 오늘 버튼으로 현재 달로 돌아온다", async () => {
  await renderCalendar();

  fireEvent.click(screen.getByRole("button", { name: "다음 달" }));
  expect(screen.getByText("2026년 8월")).toBeTruthy();

  fireEvent.click(screen.getByRole("button", { name: "이전 달" }));
  fireEvent.click(screen.getByRole("button", { name: "이전 달" }));
  expect(screen.getByText("2026년 6월")).toBeTruthy();

  fireEvent.click(screen.getByRole("button", { name: "오늘" }));
  const now = new Date();
  expect(
    screen.getByText(`${now.getFullYear()}년 ${now.getMonth() + 1}월`)
  ).toBeTruthy();
});

test("달을 이동하면 그 달 범위로 일정을 다시 조회한다", async () => {
  await renderCalendar();
  expect(fetchMock).toHaveBeenCalledTimes(1);

  fireEvent.click(screen.getByRole("button", { name: "다음 달" }));
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
});

test("날짜 칸 클릭 → 해당 날짜(09:00)가 프리필된 추가 모달", async () => {
  await renderCalendar();

  fireEvent.click(screen.getByRole("button", { name: "7월 21일 일정 추가" }));

  expect(screen.getByRole("dialog", { name: "일정 추가" })).toBeTruthy();
  expect((screen.getByLabelText("시작") as HTMLInputElement).value).toBe(
    "2026-07-21T09:00"
  );
});

test("저장하면 insertEvent 후 로컬 상태에 칩이 즉시 나타난다", async () => {
  insertMock.mockResolvedValue(makeEvent({ id: "new-1", title: "회의" }));
  await renderCalendar();

  fireEvent.click(screen.getByRole("button", { name: "7월 21일 일정 추가" }));
  fireEvent.change(screen.getByLabelText("제목"), {
    target: { value: "회의" },
  });
  fireEvent.click(screen.getByRole("button", { name: "저장" }));

  await waitFor(() =>
    expect(screen.queryByRole("dialog", { name: "일정 추가" })).toBeNull()
  );
  expect(insertMock).toHaveBeenCalledWith(
    expect.objectContaining({ title: "회의", color: "blue", all_day: false })
  );
  expect(screen.getByRole("button", { name: "회의" })).toBeTruthy();
});

test("제목이 비어 있으면 저장하지 않고 알린다", async () => {
  await renderCalendar();

  fireEvent.click(screen.getByRole("button", { name: "7월 21일 일정 추가" }));
  fireEvent.click(screen.getByRole("button", { name: "저장" }));

  expect(window.alert).toHaveBeenCalledWith("제목을 입력해 주세요.");
  expect(insertMock).not.toHaveBeenCalled();
});

test("칩 클릭 → 수정 모달(값 프리필 + 삭제 버튼), 저장 시 updateEvent", async () => {
  fetchMock.mockResolvedValue([makeEvent()]);
  updateMock.mockResolvedValue(undefined);
  await renderCalendar();

  fireEvent.click(await screen.findByRole("button", { name: "치과" }));

  expect(screen.getByRole("dialog", { name: "일정 수정" })).toBeTruthy();
  expect((screen.getByLabelText("제목") as HTMLInputElement).value).toBe("치과");

  fireEvent.change(screen.getByLabelText("제목"), {
    target: { value: "치과 재검진" },
  });
  fireEvent.click(screen.getByRole("button", { name: "저장" }));

  await waitFor(() =>
    expect(updateMock).toHaveBeenCalledWith(
      "e-1",
      expect.objectContaining({ title: "치과 재검진" })
    )
  );
  expect(screen.getByRole("button", { name: "치과 재검진" })).toBeTruthy();
});

test("수정 모달의 삭제 → confirm 후 deleteEvent, 칩이 사라진다", async () => {
  fetchMock.mockResolvedValue([makeEvent()]);
  deleteMock.mockResolvedValue(undefined);
  await renderCalendar();

  fireEvent.click(await screen.findByRole("button", { name: "치과" }));
  fireEvent.click(screen.getByRole("button", { name: "삭제" }));

  await waitFor(() => expect(deleteMock).toHaveBeenCalledWith("e-1"));
  expect(screen.queryByRole("button", { name: "치과" })).toBeNull();
  expect(screen.queryByRole("dialog", { name: "일정 수정" })).toBeNull();
});

test("셀당 칩은 최대 3개, 나머지는 +N으로 요약한다", async () => {
  fetchMock.mockResolvedValue(
    [1, 2, 3, 4].map((n) =>
      makeEvent({ id: `e-${n}`, title: `일정${n}`, endAt: null })
    )
  );
  const { container } = await renderCalendar();

  await screen.findByRole("button", { name: "일정1" });
  expect(container.querySelectorAll(".calendar-chip")).toHaveLength(3);
  expect(screen.getByText("+1")).toBeTruthy();
});

test("ESC로 모달이 닫힌다", async () => {
  await renderCalendar();

  fireEvent.click(screen.getByRole("button", { name: "7월 21일 일정 추가" }));
  expect(screen.getByRole("dialog", { name: "일정 추가" })).toBeTruthy();

  fireEvent.keyDown(window, { key: "Escape" });
  expect(screen.queryByRole("dialog", { name: "일정 추가" })).toBeNull();
});

test("조회 실패 시 alert로 알리고 빈 달력을 유지한다", async () => {
  fetchMock.mockRejectedValue(new Error("조회 실패"));
  const { container } = await renderCalendar();

  await waitFor(() => expect(window.alert).toHaveBeenCalledWith("조회 실패"));
  expect(container.querySelectorAll(".calendar-chip")).toHaveLength(0);
});
