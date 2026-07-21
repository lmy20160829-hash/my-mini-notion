"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { fromDatetimeLocal, toDatetimeLocal } from "@/lib/calendar";
import { EVENT_COLORS, type EventColor, type EventDraft } from "@/lib/events";
import { Button } from "@/components/ui/Button";

/** 색상 스와치의 접근성 이름(DESIGN.md §2.9). 값은 §1.1 토큰에 매핑된다. */
const COLOR_LABELS: Record<EventColor, string> = {
  blue: "파랑",
  green: "초록",
  amber: "주황",
  red: "빨강",
  gray: "회색",
};

type EventModalProps = {
  /** 추가/수정 겸용. 수정 모드에만 삭제 버튼이 나온다. */
  mode: "create" | "edit";
  initial: EventDraft;
  onSave: (draft: EventDraft) => void;
  onDelete?: () => void;
  onClose: () => void;
};

/**
 * 일정 추가/수정 모달. dim 오버레이 + 카드(DESIGN.md §2.9).
 * 닫기: ESC 또는 오버레이 클릭(spec). 저장 전 검증은 클라이언트에서 선반영한다 —
 * DB check(제목 1~200자, end_at >= start_at) 오류가 사용자에게 날것으로 새지 않게.
 */
export function EventModal({
  mode,
  initial,
  onSave,
  onDelete,
  onClose,
}: EventModalProps) {
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [start, setStart] = useState(toDatetimeLocal(initial.startAt));
  const [end, setEnd] = useState(
    initial.endAt === null ? "" : toDatetimeLocal(initial.endAt)
  );
  const [allDay, setAllDay] = useState(initial.allDay);
  const [color, setColor] = useState<EventColor>(initial.color);

  // ESC로 닫기. 모달이 떠 있는 동안만 리스너를 건다.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const heading = mode === "create" ? "일정 추가" : "일정 수정";

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      window.alert("제목을 입력해 주세요.");
      return;
    }
    const startAt = fromDatetimeLocal(start);
    if (startAt === null) {
      window.alert("시작 시각을 입력해 주세요.");
      return;
    }
    const endAt = fromDatetimeLocal(end);
    if (endAt !== null && endAt < startAt) {
      window.alert("종료 시각은 시작 시각보다 빠를 수 없습니다.");
      return;
    }
    onSave({ title, description, startAt, endAt, allDay, color });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-label={heading}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="modal-card__title">{heading}</h2>
        <form onSubmit={submit}>
          <div className="modal-field">
            <label htmlFor="event-title">제목</label>
            <input
              id="event-title"
              className="field-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="일정 제목"
              maxLength={200}
            />
          </div>
          <div className="modal-field-row">
            <div className="modal-field">
              <label htmlFor="event-start">시작</label>
              <input
                id="event-start"
                type="datetime-local"
                className="field-input"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </div>
            <div className="modal-field">
              <label htmlFor="event-end">종료</label>
              <input
                id="event-end"
                type="datetime-local"
                className="field-input"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </div>
          </div>
          <label className="modal-check">
            <input
              type="checkbox"
              checked={allDay}
              onChange={(e) => setAllDay(e.target.checked)}
            />
            하루 종일
          </label>
          <div className="modal-field">
            <span className="modal-field__legend">색상</span>
            <div className="modal-colors" role="group" aria-label="색상">
              {EVENT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`modal-color modal-color--${c}${
                    c === color ? " is-selected" : ""
                  }`}
                  title={COLOR_LABELS[c]}
                  aria-label={COLOR_LABELS[c]}
                  aria-pressed={c === color}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>
          <div className="modal-field">
            <label htmlFor="event-desc">설명</label>
            <textarea
              id="event-desc"
              className="field-textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="메모를 남겨보세요"
            />
          </div>
          <div className="modal-footer">
            {mode === "edit" && onDelete && (
              <button
                type="button"
                className="detail-delete-btn"
                onClick={onDelete}
              >
                <Trash2 size={16} />
                삭제
              </button>
            )}
            <div className="modal-footer__spacer" />
            <Button type="submit" variant="primary">
              저장
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
