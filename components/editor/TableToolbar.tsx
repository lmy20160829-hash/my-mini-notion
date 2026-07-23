"use client";

import type { EditorState } from "@tiptap/pm/state";
import { BubbleMenu } from "@tiptap/react/menus";
import type { Editor } from "@tiptap/react";
import {
  ArrowUpToLine,
  ArrowDownToLine,
  ArrowLeftToLine,
  ArrowRightToLine,
  Rows3,
  Columns3,
  Heading,
  type LucideIcon,
} from "lucide-react";

/**
 * ④ 표 셀 플로팅 툴바 — 커서가 표 안에 있을 때만 뜨는 말풍선(FormatToolbar와
 * 동일한 BubbleMenu 패턴). PostEditor 의 EditorContent 형제로 렌더된다
 * (결합부 수정 없음).
 */

type TableAction = { title: string; icon: LucideIcon; run: (e: Editor) => void };

const ACTIONS: TableAction[] = [
  { title: "행 위 삽입", icon: ArrowUpToLine, run: (e) => e.chain().focus().addRowBefore().run() },
  { title: "행 아래 삽입", icon: ArrowDownToLine, run: (e) => e.chain().focus().addRowAfter().run() },
  { title: "열 왼쪽 삽입", icon: ArrowLeftToLine, run: (e) => e.chain().focus().addColumnBefore().run() },
  { title: "열 오른쪽 삽입", icon: ArrowRightToLine, run: (e) => e.chain().focus().addColumnAfter().run() },
  { title: "행 삭제", icon: Rows3, run: (e) => e.chain().focus().deleteRow().run() },
  { title: "열 삭제", icon: Columns3, run: (e) => e.chain().focus().deleteColumn().run() },
  { title: "헤더 행 토글", icon: Heading, run: (e) => e.chain().focus().toggleHeaderRow().run() },
];

/**
 * 툴바 내용(버튼 줄). BubbleMenu 래퍼와 분리해 jsdom 에서도 내용을 단독
 * 검증한다(FormatToolbarContent와 같은 이유).
 */
export function TableToolbarContent({ editor }: { editor: Editor }) {
  return (
    <div className="tbl-toolbar" role="toolbar" aria-label="표 편집">
      {ACTIONS.map(({ title, icon: Icon, run }) => (
        <button
          key={title}
          type="button"
          className="icon-btn"
          title={title}
          aria-label={title}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => run(editor)}
        >
          <Icon size={16} />
        </button>
      ))}
    </div>
  );
}

/** 표 셀에 커서가 있을 때만 뜨는 플로팅 툴바. */
export function TableToolbar({ editor }: { editor: Editor | null }) {
  if (!editor) return null;
  const shouldShow = ({ editor: e }: { editor: Editor; state: EditorState }) =>
    e.isEditable && e.isActive("table");
  return (
    <BubbleMenu
      editor={editor}
      pluginKey="tblBar"
      shouldShow={shouldShow}
      options={{ placement: "top", offset: 8 }}
    >
      <TableToolbarContent editor={editor} />
    </BubbleMenu>
  );
}
