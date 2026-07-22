"use client";

import { useEffect, useRef, useState } from "react";
import { Smile } from "lucide-react";

/**
 * 페이지 이모지 아이콘 버튼 + 선택 팝오버(⑦, §4.3 확장).
 * - 아이콘 있음: 40px 이모지 버튼("아이콘 변경") / 없음: hover 시 보이는 유령 버튼("아이콘 추가").
 * - 클릭 → `.icon-pick` 팝오버: 고정 24종 그리드 + (아이콘이 있을 때만) "제거".
 *   외부 이모지 라이브러리 금지(스펙 ⑦). 저장은 부모가 onChange로 받아 단발 UPDATE.
 * - 닫기: 선택·ESC·바깥 클릭.
 */
export const PAGE_ICONS: readonly string[] = [
  "📄", "📝", "✅", "📌", "⭐", "💡", "🔥", "🚀",
  "🎯", "📚", "🗂️", "📊", "🧠", "💼", "🏠", "☕",
  "🌱", "🎨", "🎵", "❤️", "⚡", "🔖", "🗓️", "✈️",
];

export function PageIconButton({
  icon,
  onChange,
}: {
  icon: string | null;
  onChange: (icon: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onPointerDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("mousedown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("mousedown", onPointerDown);
    };
  }, [open]);

  const pick = (next: string | null) => {
    onChange(next);
    setOpen(false);
  };

  return (
    <div className="icon-pick-row" ref={wrapRef}>
      {icon ? (
        <button
          type="button"
          className="icon-pick-btn"
          title="아이콘 변경"
          aria-label="아이콘 변경"
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {icon}
        </button>
      ) : (
        <button
          type="button"
          className="icon-pick-ghost"
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <Smile size={14} />
          아이콘 추가
        </button>
      )}
      {open && (
        <div className="icon-pick" role="dialog" aria-label="아이콘 선택">
          <div className="icon-pick__grid">
            {PAGE_ICONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                className="icon-pick__item"
                title={emoji}
                aria-label={emoji}
                onClick={() => pick(emoji)}
              >
                {emoji}
              </button>
            ))}
          </div>
          {icon && (
            <div className="icon-pick__footer">
              <button
                type="button"
                className="icon-pick__remove"
                onClick={() => pick(null)}
              >
                제거
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
