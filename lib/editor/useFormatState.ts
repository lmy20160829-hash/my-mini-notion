"use client";
import { useEditorState, type Editor } from "@tiptap/react";
import { Bold, Code, Italic, Strikethrough, Underline, type LucideIcon } from "lucide-react";

/**
 * 서식 액션·활성상태 공용 파일 — 상단 툴바(⑤)와 플로팅 툴바(①)가 함께 쓴다
 * (오버뷰 스펙 §파일 소유권). align/isInTable은 TextAlign/Table 확장이 아직
 * 결합부에 없어도 `editor.isActive(...)`가 에러 없이 false를 반환하므로 안전하다.
 */

export type MarkAction = {
  name: string;
  title: string;
  icon: LucideIcon;
  run: (editor: Editor) => void;
};

/** 마크 5종 토글(링크는 미니 입력이라 별도 처리). 단축키는 확장 기본값. */
export const MARK_ACTIONS: MarkAction[] = [
  { name: "bold", title: "굵게", icon: Bold, run: (e) => e.chain().focus().toggleBold().run() },
  { name: "italic", title: "기울임", icon: Italic, run: (e) => e.chain().focus().toggleItalic().run() },
  { name: "underline", title: "밑줄", icon: Underline, run: (e) => e.chain().focus().toggleUnderline().run() },
  { name: "strike", title: "취소선", icon: Strikethrough, run: (e) => e.chain().focus().toggleStrike().run() },
  { name: "code", title: "코드", icon: Code, run: (e) => e.chain().focus().toggleCode().run() },
];

/** 상단 툴바·플로팅 툴바가 공유하는 활성상태 selector. */
export function useFormatState(editor: Editor) {
  return useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      strike: e.isActive("strike"),
      code: e.isActive("code"),
      link: e.isActive("link"),
      align:
        (["left", "center", "right"] as const).find((a) => e.isActive({ textAlign: a })) ??
        "left",
      isInTable: e.isActive("table"),
    }),
  });
}
