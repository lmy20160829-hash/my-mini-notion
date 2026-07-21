"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { dateKey, eventsByDay, monthGrid } from "@/lib/calendar";
import {
  deleteEvent,
  fetchMyEvents,
  insertEvent,
  toEventPayload,
  updateEvent,
  type CalendarEvent,
  type EventDraft,
} from "@/lib/events";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { EventModal } from "./EventModal";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
/** 셀당 표시하는 최대 칩 수. 넘치면 "+N"으로 요약한다(spec). */
const MAX_CHIPS = 3;
/** 날짜 셀 클릭으로 여는 추가 모달의 프리필 시각(해당 날짜 09:00). */
const DEFAULT_START_HOUR = 9;

function errorMessage(e: unknown, fallback: string): string {
  return e instanceof Error && e.message ? e.message : fallback;
}

type ModalState =
  | { mode: "create"; date: Date }
  | { mode: "edit"; event: CalendarEvent };

/**
 * 월간 캘린더 화면(DESIGN.md §4.6). 일정은 표시 달의 그리드 범위로 조회하고,
 * 저장/삭제 성공 시 로컬 상태를 즉시 갱신한다. 실패는 window.alert(기존 notify 관행).
 * `initialDate`는 테스트가 표시 달을 고정하기 위한 것으로, 기본은 오늘이 속한 달이다.
 */
export function CalendarView({ initialDate }: { initialDate?: Date }) {
  // cursor = 표시 중인 달의 1일(로컬).
  const [cursor, setCursor] = useState(() => {
    const d = initialDate ?? new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [modal, setModal] = useState<ModalState | null>(null);

  const cells = useMemo(
    () => monthGrid(cursor.getFullYear(), cursor.getMonth()),
    [cursor]
  );
  const gridStart = cells[0].date;
  const gridEnd = cells[cells.length - 1].date;

  // 표시 달이 바뀔 때마다 그리드 범위(42칸)로 조회한다. 앞뒤 달 채움 칸의 일정도
  // 함께 보여야 하기 때문이다. 소유자 격리는 RLS(events_select_own)가 강제한다.
  useEffect(() => {
    let cancelled = false;
    const from = new Date(
      gridStart.getFullYear(),
      gridStart.getMonth(),
      gridStart.getDate()
    );
    const to = new Date(
      gridEnd.getFullYear(),
      gridEnd.getMonth(),
      gridEnd.getDate(),
      23,
      59,
      59,
      999
    );
    fetchMyEvents(from.toISOString(), to.toISOString())
      .then((list) => {
        if (!cancelled) setEvents(list);
      })
      .catch((e) => {
        if (cancelled) return;
        // 이전 달의 일정이 남아 보이지 않도록 비우되, 달력 자체는 열어 둔다.
        setEvents([]);
        window.alert(errorMessage(e, "일정을 불러오지 못했습니다."));
      });
    return () => {
      cancelled = true;
    };
    // gridStart/gridEnd 는 cells(=cursor) 의 파생값이라 cursor 만 보면 된다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor]);

  const byDay = useMemo(
    () => eventsByDay(events, gridStart, gridEnd),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [events, cells]
  );

  const todayKey = dateKey(new Date());

  const moveMonth = (delta: number) =>
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1));
  const goToday = () => {
    const now = new Date();
    setCursor(new Date(now.getFullYear(), now.getMonth(), 1));
  };

  const handleSave = async (draft: EventDraft) => {
    if (!modal) return;
    const payload = toEventPayload(draft);
    try {
      if (modal.mode === "create") {
        const created = await insertEvent(payload);
        setEvents((s) => [...s, created]);
      } else {
        const id = modal.event.id;
        await updateEvent(id, payload);
        // UPDATE 는 .select("id")만 돌려받으므로(A2 계약) 로컬 상태는 초안으로 재구성한다.
        setEvents((s) =>
          s.map((ev) =>
            ev.id === id
              ? {
                  id,
                  title: payload.title,
                  description: payload.description ?? "",
                  startAt: draft.startAt,
                  endAt: draft.endAt,
                  allDay: draft.allDay,
                  color: draft.color,
                }
              : ev
          )
        );
      }
      setModal(null);
    } catch (e) {
      window.alert(errorMessage(e, "일정을 저장하지 못했습니다."));
    }
  };

  const handleDelete = async () => {
    if (!modal || modal.mode !== "edit") return;
    if (!window.confirm("이 일정을 삭제할까요? 삭제하면 되돌릴 수 없어요.")) {
      return;
    }
    const id = modal.event.id;
    try {
      await deleteEvent(id);
      setEvents((s) => s.filter((ev) => ev.id !== id));
      setModal(null);
    } catch (e) {
      window.alert(errorMessage(e, "일정을 삭제하지 못했습니다."));
    }
  };

  const initialDraft: EventDraft | null =
    modal === null
      ? null
      : modal.mode === "create"
        ? {
            title: "",
            description: "",
            startAt: new Date(
              modal.date.getFullYear(),
              modal.date.getMonth(),
              modal.date.getDate(),
              DEFAULT_START_HOUR
            ).getTime(),
            endAt: null,
            allDay: false,
            color: "blue",
          }
        : {
            title: modal.event.title,
            description: modal.event.description,
            startAt: modal.event.startAt,
            endAt: modal.event.endAt,
            allDay: modal.event.allDay,
            color: modal.event.color,
          };

  return (
    <div className="calendar-page">
      <div className="calendar-head">
        <h1 className="calendar-head__title">
          {cursor.getFullYear()}년 {cursor.getMonth() + 1}월
        </h1>
        <div className="calendar-head__spacer" />
        <Button variant="secondary" onClick={goToday}>
          오늘
        </Button>
        <IconButton
          icon={ChevronLeft}
          title="이전 달"
          onClick={() => moveMonth(-1)}
        />
        <IconButton
          icon={ChevronRight}
          title="다음 달"
          onClick={() => moveMonth(1)}
        />
      </div>

      {/* 요일 행은 시각 보조 장식 — 각 셀이 날짜를 이름으로 노출한다. */}
      <div className="calendar-weekdays" aria-hidden="true">
        {WEEKDAYS.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>

      <div className="calendar-grid">
        {cells.map(({ date, inMonth }) => {
          const key = dateKey(date);
          const dayEvents = byDay.get(key) ?? [];
          const overflow = dayEvents.length - MAX_CHIPS;
          return (
            <div
              key={key}
              role="button"
              tabIndex={0}
              className={`calendar-cell${inMonth ? "" : " is-outside"}${
                key === todayKey ? " is-today" : ""
              }`}
              aria-label={`${date.getMonth() + 1}월 ${date.getDate()}일 일정 추가`}
              onClick={() => setModal({ mode: "create", date })}
              onKeyDown={(e) => {
                if (e.key === "Enter") setModal({ mode: "create", date });
              }}
            >
              <span className="calendar-cell__date">{date.getDate()}</span>
              {dayEvents.slice(0, MAX_CHIPS).map((ev) => (
                <button
                  key={ev.id}
                  type="button"
                  className={`calendar-chip calendar-chip--${ev.color}`}
                  title={ev.title}
                  onClick={(e) => {
                    // 셀 클릭(추가 모달)으로 전파되면 수정 대신 추가가 열린다.
                    e.stopPropagation();
                    setModal({ mode: "edit", event: ev });
                  }}
                >
                  <span className="calendar-chip__dot" />
                  <span className="calendar-chip__title">{ev.title}</span>
                </button>
              ))}
              {overflow > 0 && (
                <span className="calendar-more">+{overflow}</span>
              )}
            </div>
          );
        })}
      </div>

      {modal && initialDraft && (
        <EventModal
          mode={modal.mode}
          initial={initialDraft}
          onSave={handleSave}
          onDelete={modal.mode === "edit" ? handleDelete : undefined}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
