"use client";
import type { Editor } from "@tiptap/react";
import { TEXT_COLORS, HIGHLIGHT_COLORS, type Swatch } from "@/lib/editor/palette";

/**
 * C3 색 팝오버 — 상단 툴바(Phase B, 미구현)가 여는 스와치 그리드.
 * `kind="text"` → 글자색(`TEXT_COLORS`, `setColor`/`unsetColor`).
 * `kind="highlight"` → 배경색(`HIGHLIGHT_COLORS`, `toggleHighlight`/`unsetHighlight`).
 * 각 배열의 첫 항목(`value: null`)이 "기본"/"없음" — 해제(unset) 액션이다.
 * DESIGN.md §2.16.
 */
export function ColorPopover({ editor, kind }: { editor: Editor; kind: "text" | "highlight" }) {
  const swatches = kind === "text" ? TEXT_COLORS : HIGHLIGHT_COLORS;
  const apply = (s: Swatch) => {
    const c = editor.chain().focus();
    if (kind === "text") {
      s.value ? c.setColor(s.value).run() : c.unsetColor().run();
    } else {
      s.value ? c.toggleHighlight({ color: s.value }).run() : c.unsetHighlight().run();
    }
  };
  return (
    <div className="clr-pop" role="listbox" aria-label={kind === "text" ? "글자색" : "배경색"}>
      {swatches.map((s) => (
        <button
          key={s.id}
          type="button"
          className="clr-swatch"
          title={s.label}
          aria-label={s.label}
          style={s.value ? { background: s.value } : undefined}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => apply(s)}
        >
          {!s.value && <span className="clr-swatch__none">✕</span>}
        </button>
      ))}
    </div>
  );
}
