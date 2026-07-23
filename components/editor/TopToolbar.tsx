"use client";

import { useEffect, useRef, useState } from "react";
import { useEditorState, type Editor } from "@tiptap/react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Baseline,
  Highlighter,
  Image as ImageIcon,
  Link2,
  List,
  ListChecks,
  ListOrdered,
  Redo2,
  Table as TableIcon,
  Undo2,
  type LucideIcon,
} from "lucide-react";
import { MARK_ACTIONS, useFormatState } from "@/lib/editor/useFormatState";
import { applyLink } from "@/lib/editor/marks";
import { openAttachmentPicker } from "@/lib/editor/media-nodes";
import { ColorPopover } from "@/components/editor/ColorPopover";

/**
 * ⑤ 상단 고정 툴바 — Phase B(태스크 B1). 표(Phase T)·색/정렬(Phase F)을 모두
 * 결선하는 결승점 컴포넌트. PostEditor 통합·CSS·DESIGN.md 반영은 B2 범위(이
 * 컴포넌트는 미결합 상태로도 단독 렌더·동작 검증이 끝나 있다).
 *
 * 텍스트 스타일 드롭다운 범위는 사용자 승인 한정: 일반/제목1·2·3/인용뿐이다
 * (콜아웃·토글은 슬래시 메뉴 전용 — 여기서 다루지 않는다).
 * 마크 버튼은 MARK_ACTIONS 5종 중 코드(`code`)를 뺀 4종(B·I·U·S)만 노출한다
 * (인라인 코드는 플로팅 서식 툴바 §2.10 전용으로 남긴다 — 브리프 지침).
 */

type StyleValue = "paragraph" | "h1" | "h2" | "h3" | "blockquote";

const STYLE_OPTIONS: { value: StyleValue; label: string }[] = [
  { value: "paragraph", label: "일반" },
  { value: "h1", label: "제목 1" },
  { value: "h2", label: "제목 2" },
  { value: "h3", label: "제목 3" },
  { value: "blockquote", label: "인용" },
];

/** 드롭다운 선택 → 노드 변환. 각 케이스는 사용자 승인 범위의 커맨드 그대로. */
function applyStyle(editor: Editor, value: StyleValue): void {
  const chain = () => editor.chain().focus();
  switch (value) {
    case "paragraph":
      chain().setParagraph().run();
      break;
    case "h1":
      chain().setNode("heading", { level: 1 }).run();
      break;
    case "h2":
      chain().setNode("heading", { level: 2 }).run();
      break;
    case "h3":
      chain().setNode("heading", { level: 3 }).run();
      break;
    case "blockquote":
      chain().toggleBlockquote().run();
      break;
  }
}

/** 글자 크기 — FontSize(TextStyle 전제, marks.ts). 빈 값은 기본(unset). */
const SIZE_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "기본" },
  { value: "13px", label: "작게" },
  { value: "20px", label: "크게" },
  { value: "28px", label: "제목" },
];

function applyFontSize(editor: Editor, value: string): void {
  const chain = editor.chain().focus();
  if (value) chain.setFontSize(value).run();
  else chain.unsetFontSize().run();
}

const ALIGN_ACTIONS: { value: "left" | "center" | "right"; title: string; icon: LucideIcon }[] = [
  { value: "left", title: "왼쪽 정렬", icon: AlignLeft },
  { value: "center", title: "가운데 정렬", icon: AlignCenter },
  { value: "right", title: "오른쪽 정렬", icon: AlignRight },
];

const LIST_ACTIONS: {
  type: "bulletList" | "orderedList" | "taskList";
  itemType: "listItem" | "taskItem";
  title: string;
  icon: LucideIcon;
}[] = [
  { type: "bulletList", itemType: "listItem", title: "불릿 목록", icon: List },
  { type: "orderedList", itemType: "listItem", title: "번호 목록", icon: ListOrdered },
  { type: "taskList", itemType: "taskItem", title: "체크박스 목록", icon: ListChecks },
];

/** 이미지 accept 화이트리스트 — `lib/editor/insert.ts`의 IMAGE_ACCEPT와 동일 값(§5.13 정책). */
const IMAGE_ACCEPT = "image/png,image/jpeg,image/gif,image/webp";

/**
 * 툴바 내용(버튼 줄). sticky 래퍼(`TopToolbar`)와 분리해 jsdom에서도 단독
 * 검증한다(FormatToolbarContent·TableToolbarContent와 같은 이유).
 */
export function TopToolbarContent({ editor }: { editor: Editor }) {
  // 마크·정렬·표 안 여부 — 플로팅 툴바와 공유하는 selector(useFormatState.ts).
  const active = useFormatState(editor);

  // 텍스트 스타일(문단/제목/인용) — useFormatState 밖의 로컬 selector.
  const style = useEditorState({
    editor,
    selector: ({ editor: e }): StyleValue => {
      if (e.isActive("heading", { level: 1 })) return "h1";
      if (e.isActive("heading", { level: 2 })) return "h2";
      if (e.isActive("heading", { level: 3 })) return "h3";
      if (e.isActive("blockquote")) return "blockquote";
      return "paragraph";
    },
  });

  // 글자 크기 — 현재 선택의 textStyle.fontSize(없으면 기본 ""). SIZE_OPTIONS 매칭.
  const fontSize = useEditorState({
    editor,
    selector: ({ editor: e }) => (e.getAttributes("textStyle").fontSize as string) ?? "",
  });

  // 목록 활성 상태 — 마크·정렬과 같은 방식으로 버튼에 is-active를 반영.
  const listActive = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bulletList: e.isActive("bulletList"),
      orderedList: e.isActive("orderedList"),
      taskList: e.isActive("taskList"),
    }),
  });

  const [colorOpen, setColorOpen] = useState<"text" | "highlight" | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkValue, setLinkValue] = useState("");
  const linkInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (linkOpen) linkInputRef.current?.focus();
  }, [linkOpen]);

  const preventFocusLoss = (e: React.MouseEvent) => e.preventDefault();

  const openLinkInput = () => {
    setColorOpen(null);
    setLinkValue((editor.getAttributes("link").href as string) ?? "");
    setLinkOpen(true);
  };

  const submitLink = () => {
    applyLink(editor, linkValue);
    setLinkOpen(false);
  };

  const toggleColor = (kind: "text" | "highlight") => {
    setLinkOpen(false);
    setColorOpen((cur) => (cur === kind ? null : kind));
  };

  return (
    <div className="top-toolbar" role="toolbar" aria-label="상단 툴바">
      <select
        className="top-toolbar__select"
        aria-label="텍스트 스타일"
        value={style}
        onChange={(e) => applyStyle(editor, e.target.value as StyleValue)}
      >
        {STYLE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      <select
        className="top-toolbar__select"
        aria-label="글자 크기"
        value={SIZE_OPTIONS.some((o) => o.value === fontSize) ? fontSize : ""}
        onChange={(e) => applyFontSize(editor, e.target.value)}
      >
        {SIZE_OPTIONS.map((o) => (
          <option key={o.value || "default"} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      <div className="top-toolbar__divider" />

      {MARK_ACTIONS.filter((a) => a.name !== "code").map(({ name, title, icon: Icon, run }) => (
        <button
          key={name}
          type="button"
          className={`icon-btn${active?.[name as keyof typeof active] ? " is-active" : ""}`}
          title={title}
          aria-label={title}
          aria-pressed={!!active?.[name as keyof typeof active]}
          onMouseDown={preventFocusLoss}
          onClick={() => run(editor)}
        >
          <Icon size={16} />
        </button>
      ))}

      <div className="top-toolbar__divider" />

      <div className="top-toolbar__popover-anchor">
        <button
          type="button"
          className="icon-btn"
          title="글자색"
          aria-label="글자색"
          aria-haspopup="true"
          aria-expanded={colorOpen === "text"}
          onMouseDown={preventFocusLoss}
          onClick={() => toggleColor("text")}
        >
          <Baseline size={16} />
        </button>
        {colorOpen === "text" && (
          <div
            className="top-toolbar__popover"
            onClick={() => setColorOpen(null)}
            onKeyDown={(e) => e.key === "Escape" && setColorOpen(null)}
          >
            <ColorPopover editor={editor} kind="text" />
          </div>
        )}
      </div>

      <div className="top-toolbar__popover-anchor">
        <button
          type="button"
          className="icon-btn"
          title="배경색"
          aria-label="배경색"
          aria-haspopup="true"
          aria-expanded={colorOpen === "highlight"}
          onMouseDown={preventFocusLoss}
          onClick={() => toggleColor("highlight")}
        >
          <Highlighter size={16} />
        </button>
        {colorOpen === "highlight" && (
          <div
            className="top-toolbar__popover"
            onClick={() => setColorOpen(null)}
            onKeyDown={(e) => e.key === "Escape" && setColorOpen(null)}
          >
            <ColorPopover editor={editor} kind="highlight" />
          </div>
        )}
      </div>

      <div className="top-toolbar__divider" />

      {ALIGN_ACTIONS.map(({ value, title, icon: Icon }) => (
        <button
          key={value}
          type="button"
          className={`icon-btn${active?.align === value ? " is-active" : ""}`}
          title={title}
          aria-label={title}
          aria-pressed={active?.align === value}
          onMouseDown={preventFocusLoss}
          onClick={() => editor.chain().focus().setTextAlign(value).run()}
        >
          <Icon size={16} />
        </button>
      ))}

      <div className="top-toolbar__divider" />

      {LIST_ACTIONS.map(({ type, itemType, title, icon: Icon }) => (
        <button
          key={type}
          type="button"
          className={`icon-btn${listActive?.[type] ? " is-active" : ""}`}
          title={title}
          aria-label={title}
          aria-pressed={!!listActive?.[type]}
          onMouseDown={preventFocusLoss}
          onClick={() => editor.chain().focus().toggleList(type, itemType).run()}
        >
          <Icon size={16} />
        </button>
      ))}

      <div className="top-toolbar__divider" />

      <button
        type="button"
        className={`icon-btn${active?.link ? " is-active" : ""}`}
        title="링크"
        aria-label="링크"
        aria-pressed={!!active?.link}
        onMouseDown={preventFocusLoss}
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

      <button
        type="button"
        className="icon-btn"
        title="이미지 삽입"
        aria-label="이미지 삽입"
        onMouseDown={preventFocusLoss}
        onClick={() => openAttachmentPicker(editor.view, IMAGE_ACCEPT)}
      >
        <ImageIcon size={16} />
      </button>

      <button
        type="button"
        className="icon-btn"
        title="표 삽입"
        aria-label="표 삽입"
        onMouseDown={preventFocusLoss}
        onClick={() =>
          editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
        }
      >
        <TableIcon size={16} />
      </button>

      <div className="top-toolbar__divider" />

      <button
        type="button"
        className="icon-btn"
        title="실행취소"
        aria-label="실행취소"
        onMouseDown={preventFocusLoss}
        onClick={() => editor.chain().focus().undo().run()}
      >
        <Undo2 size={16} />
      </button>
      <button
        type="button"
        className="icon-btn"
        title="다시 실행"
        aria-label="다시 실행"
        onMouseDown={preventFocusLoss}
        onClick={() => editor.chain().focus().redo().run()}
      >
        <Redo2 size={16} />
      </button>
    </div>
  );
}

/**
 * sticky 래퍼 — PostEditor 결합(B2)이 EditorContent 위에 고정 배치한다.
 * FormatToolbar/TableToolbar와 달리 BubbleMenu가 아니라 상시 노출 바이므로
 * editor가 없을 때만 숨긴다(표시 조건 없음 — 항상 위에 고정).
 */
export function TopToolbar({ editor }: { editor: Editor | null }) {
  if (!editor) return null;
  return (
    <div className="top-toolbar-sticky">
      <TopToolbarContent editor={editor} />
    </div>
  );
}
