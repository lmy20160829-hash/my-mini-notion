import { getSupabase } from "./supabase";

/** 일정이 저장되는 테이블. 구조·RLS는 메인 세션에서 이미 적용·검증되었다(마이그레이션 금지). */
const TABLE = "events";

/** 일정 색상 5종. DB check 제약(blue|green|amber|red|gray)과 일치한다. */
export const EVENT_COLORS = ["blue", "green", "amber", "red", "gray"] as const;
export type EventColor = (typeof EVENT_COLORS)[number];

/** Supabase `public.events` 테이블 행. */
export type EventRow = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  start_at: string;
  end_at: string | null;
  all_day: boolean;
  color: string;
  created_at: string;
  updated_at: string;
};

/** 클라이언트 일정 엔티티. 시각은 epoch ms (lib/posts.ts 의 Post 대칭). */
export type CalendarEvent = {
  id: string;
  title: string;
  description: string;
  startAt: number;
  endAt: number | null;
  allDay: boolean;
  color: EventColor;
};

/** 모달이 만드는 일정 초안. toEventPayload 로 서버 페이로드가 된다. */
export type EventDraft = {
  title: string;
  description: string;
  startAt: number;
  endAt: number | null;
  allDay: boolean;
  color: EventColor;
};

/** INSERT/UPDATE 페이로드. user_id 는 넣지 않는다 — DB default(auth.uid())가 기록한다. */
export type EventPayload = {
  title: string;
  description: string | null;
  start_at: string;
  end_at: string | null;
  all_day: boolean;
  color: EventColor;
};

function toEventColor(value: string): EventColor {
  return (EVENT_COLORS as readonly string[]).includes(value)
    ? (value as EventColor)
    : "blue"; // DB check 가 보장하지만, 방어적으로 기본색(blue)으로 폴백한다.
}

/** 행 → 클라이언트 엔티티 (rowToPost 대칭). */
export function rowToEvent(row: EventRow): CalendarEvent {
  return {
    id: String(row.id),
    title: row.title ?? "",
    description: row.description ?? "",
    startAt: Date.parse(row.start_at),
    endAt: row.end_at === null ? null : Date.parse(row.end_at),
    allDay: !!row.all_day,
    color: toEventColor(row.color),
  };
}

/** 초안 → 서버 페이로드. 제목 trim, 빈 설명은 null, ms 는 ISO 문자열로. */
export function toEventPayload(draft: EventDraft): EventPayload {
  return {
    title: (draft.title ?? "").trim(),
    description: (draft.description ?? "").trim() || null,
    start_at: new Date(draft.startAt).toISOString(),
    end_at: draft.endAt === null ? null : new Date(draft.endAt).toISOString(),
    all_day: draft.allDay,
    color: draft.color,
  };
}

function fail(error: { message?: string } | null, fallback: string): never {
  throw new Error(error?.message || fallback);
}

/**
 * A2 계약: RLS 가 거른 UPDATE/DELETE 는 에러가 아니라 **0행 + error:null** 로 끝난다.
 * `.select("id")` 로 영향받은 행을 돌려받아 0행이면 실패로 throw 한다
 * (메인 lib/posts.ts 의 ensureAffected 패턴).
 */
function ensureAffected(data: unknown, message: string): void {
  if (!Array.isArray(data) || data.length === 0) throw new Error(message);
}

/**
 * 표시 월(그리드) 범위의 내 일정 조회 — `start_at` 기준.
 * 사용자 필터를 걸지 않는다: 소유자 격리는 RLS `events_select_own` 이 서버에서 강제한다.
 */
export async function fetchMyEvents(
  fromIso: string,
  toIso: string
): Promise<CalendarEvent[]> {
  const { data, error } = await getSupabase()
    .from(TABLE)
    .select("*")
    .gte("start_at", fromIso)
    .lte("start_at", toIso)
    .order("start_at", { ascending: true });
  if (error) fail(error, "일정을 불러오지 못했습니다.");
  return ((data ?? []) as EventRow[]).map(rowToEvent);
}

/** 새 일정 생성. user_id 는 DB default(auth.uid())가 기록한다. */
export async function insertEvent(payload: EventPayload): Promise<CalendarEvent> {
  const { data, error } = await getSupabase()
    .from(TABLE)
    .insert(payload)
    .select()
    .single();
  if (error || !data) fail(error, "일정을 저장하지 못했습니다.");
  return rowToEvent(data as EventRow);
}

/** 일정 수정. 0행이면 throw — RLS 거부·삭제된 일정의 무성음 실패를 차단한다(A2). */
export async function updateEvent(
  id: string,
  patch: Partial<EventPayload>
): Promise<void> {
  const { data, error } = await getSupabase()
    .from(TABLE)
    .update(patch)
    .eq("id", id)
    .select("id");
  if (error) fail(error, "일정을 저장하지 못했습니다.");
  ensureAffected(data, "일정을 찾지 못해 저장하지 못했습니다.");
}

/** 일정 삭제. 0행이면 throw — updateEvent 와 같은 이유(A2). */
export async function deleteEvent(id: string): Promise<void> {
  const { data, error } = await getSupabase()
    .from(TABLE)
    .delete()
    .eq("id", id)
    .select("id");
  if (error) fail(error, "일정을 삭제하지 못했습니다.");
  ensureAffected(data, "일정을 찾지 못해 삭제하지 못했습니다.");
}
