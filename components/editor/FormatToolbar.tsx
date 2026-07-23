"use client";

import { useEffect, useRef, useState } from "react";
import type { EditorState } from "@tiptap/pm/state";
import { BubbleMenu } from "@tiptap/react/menus";
import type { Editor } from "@tiptap/react";
import { Link2 } from "lucide-react";
import { applyLink } from "@/lib/editor/marks";
import { MARK_ACTIONS, useFormatState } from "@/lib/editor/useFormatState";

/**
 * ① 플로팅 서식 툴바 — 텍스트 선택 시에만 뜨는 말풍선(§2.10, §6.8).
 * PostEditor 의 EditorContent 형제로 렌더된다(결합부 수정 없음 — 오버뷰 스펙).
 * 버튼은 기존 `.icon-btn` 재사용, 활성 마크는 `.is-active`(bg --surface-active).
 */

/** 표시 조건: 텍스트 범위 선택일 때만(빈 선택·노드 선택 제외). */
export function fmtShouldShow({
  editor,
  state,
  from,
  to,
}: {
  editor: Editor;
  state: EditorState;
  from: number;
  to: number;
}): boolean {
  if (!editor.isEditable) return false;
  if (from === to) return false;
  // 노드 선택(이미지 등)은 텍스트 서식 대상이 아니다.
  const isNodeSelection = "node" in state.selection;
  if (isNodeSelection) return false;
  // 선택 범위에 실제 텍스트가 없으면(빈 문단 걸침 등) 띄우지 않는다.
  return state.doc.textBetween(from, to).length > 0;
}

/**
 * 툴바 내용(버튼 줄 + 링크 미니 입력).
 * BubbleMenu 래퍼와 분리해 jsdom 에서도 내용을 단독 검증한다.
 */
export function FormatToolbarContent({ editor }: { editor: Editor }) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkValue, setLinkValue] = useState("");
  const linkInputRef = useRef<HTMLInputElement>(null);

  // 활성 마크 상태 — 상단 툴바와 공유하는 useFormatState(트랜잭션마다 재계산).
  const active = useFormatState(editor);

  useEffect(() => {
    if (linkOpen) linkInputRef.current?.focus();
  }, [linkOpen]);

  const openLinkInput = () => {
    // 기존 링크가 있으면 href 를 미리 채운다(수정 흐름).
    setLinkValue((editor.getAttributes("link").href as string) ?? "");
    setLinkOpen(true);
  };

  const submitLink = () => {
    // 빈 값 = 링크 해제(applyLink 계약).
    applyLink(editor, linkValue);
    setLinkOpen(false);
  };

  return (
    <div className="fmt-bar" role="toolbar" aria-label="서식">
      {MARK_ACTIONS.map(({ name, title, icon: Icon, run }) => (
        <button
          key={name}
          type="button"
          className={`icon-btn${active?.[name as keyof typeof active] ? " is-active" : ""}`}
          title={title}
          aria-label={title}
          aria-pressed={!!active?.[name as keyof typeof active]}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => run(editor)}
        >
          <Icon size={16} />
        </button>
      ))}
      <button
        type="button"
        className={`icon-btn${active?.link ? " is-active" : ""}`}
        title="링크"
        aria-label="링크"
        aria-pressed={!!active?.link}
        onMouseDown={(e) => e.preventDefault()}
        onClick={openLinkInput}
      >
        <Link2 size={16} />
      </button>
      {linkOpen && (
        <div className="fmt-link-input">
          <input
            ref={linkInputRef}
            value={linkValue}
            placeholder="링크 주소 입력"
            aria-label="링크 주소 입력"
            onChange={(e) => setLinkValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submitLink();
              } else if (e.key === "Escape") {
                e.preventDefault();
                setLinkOpen(false);
              }
            }}
          />
        </div>
      )}
    </div>
  );
}

/** BubbleMenu 래퍼 — 텍스트 선택 시에만 등장(mnPop, §1.5). */
export function FormatToolbar({ editor }: { editor: Editor | null }) {
  if (!editor) return null;
  return (
    <BubbleMenu
      editor={editor}
      pluginKey="fmtBar"
      shouldShow={fmtShouldShow}
      options={{ placement: "top", offset: 6 }}
    >
      <FormatToolbarContent editor={editor} />
    </BubbleMenu>
  );
}
