/**
 * 월간 캘린더 순수 유틸. React·Supabase 의존 없이 날짜 계산만 담당한다
 * (spec: docs/superpowers/specs/2026-07-21-calendar-design.md).
 * 모든 계산은 로컬 시간대 기준이다 — 사용자는 자기 시간대의 달력을 본다.
 */

export type GridCell = {
  date: Date;
  /** 표시 중인 달의 날짜인지(아니면 앞뒤 달 채움 칸인지). */
  inMonth: boolean;
};

/**
 * 일요일 시작 6주(42칸) 고정 그리드. `month`는 JS Date 규약과 같은 0-based.
 * 항상 42칸이라 달이 바뀌어도 그리드 높이가 출렁이지 않는다.
 */
export function monthGrid(year: number, month: number): GridCell[] {
  const first = new Date(year, month, 1);
  // 그 주의 일요일로 되감는다. 1일이 일요일이면 1일부터 시작한다.
  const start = new Date(year, month, 1 - first.getDay());
  const cells: GridCell[] = [];
  for (let i = 0; i < 42; i++) {
    const date = new Date(
      start.getFullYear(),
      start.getMonth(),
      start.getDate() + i
    );
    cells.push({
      date,
      inMonth: date.getFullYear() === year && date.getMonth() === month,
    });
  }
  return cells;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** 로컬 기준 YYYY-MM-DD. Map 키·오늘 판별 등 날짜 단위 비교에 쓴다. */
export function dateKey(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(
    date.getDate()
  )}`;
}

/** epoch ms → `<input type="datetime-local">` 값(YYYY-MM-DDTHH:mm, 로컬). */
export function toDatetimeLocal(ms: number): string {
  const d = new Date(ms);
  return `${dateKey(d)}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** datetime-local 입력값 → epoch ms. 빈 값·해석 불가면 null(시각 없음). */
export function fromDatetimeLocal(value: string): number | null {
  if (!value) return null;
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? null : ms;
}

/** eventsByDay가 필요로 하는 최소 형태. CalendarEvent(lib/events.ts)가 이를 만족한다. */
type DaySpan = { startAt: number; endAt: number | null };

/**
 * 이벤트를 걸치는 **모든 날짜**(start_at~end_at, end 없으면 start만)에 매핑한
 * `Map<dateKey, 이벤트[]>`. 여러 날 일정의 연속 바 대신 날짜마다 칩을 표시하는
 * 단순화 정책(spec 범위)의 근거 자료다. 그리드 밖 구간은 잘라낸다.
 */
export function eventsByDay<T extends DaySpan>(
  events: T[],
  gridStart: Date,
  gridEnd: Date
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  const rangeStart = new Date(
    gridStart.getFullYear(),
    gridStart.getMonth(),
    gridStart.getDate()
  ).getTime();
  const rangeEnd = new Date(
    gridEnd.getFullYear(),
    gridEnd.getMonth(),
    gridEnd.getDate()
  ).getTime();

  for (const event of events) {
    const s = new Date(event.startAt);
    const e = new Date(event.endAt ?? event.startAt);
    const first = new Date(s.getFullYear(), s.getMonth(), s.getDate()).getTime();
    const last = new Date(e.getFullYear(), e.getMonth(), e.getDate()).getTime();
    // 그리드와 겹치는 날짜 구간만 순회한다.
    let cursor = Math.max(first, rangeStart);
    const end = Math.min(last, rangeEnd);
    while (cursor <= end) {
      const day = new Date(cursor);
      const key = dateKey(day);
      const list = map.get(key);
      if (list) list.push(event);
      else map.set(key, [event]);
      // DST 안전: 날짜 단위로 다음 날 자정을 다시 계산한다(+864e5 금지).
      cursor = new Date(
        day.getFullYear(),
        day.getMonth(),
        day.getDate() + 1
      ).getTime();
    }
  }
  return map;
}
