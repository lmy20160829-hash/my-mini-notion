import type { AnyExtension, Editor } from "@tiptap/react";
import Bold from "@tiptap/extension-bold";
import Italic from "@tiptap/extension-italic";
import Underline from "@tiptap/extension-underline";
import Strike from "@tiptap/extension-strike";
import Code from "@tiptap/extension-code";
import Link from "@tiptap/extension-link";
import { TextStyle, FontSize } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";

/**
 * 서식 마크 확장 등록 — **wt1 전용 파일** (오버뷰 스펙 §파일 소유권).
 * 굵게·기울임·밑줄·취소선·인라인 코드·링크 6종(스펙 wt1 §①)
 * + 글자색·배경색(Phase F 태스크 C1) 3종.
 * PostEditor가 [...MARKS] 로 결합하므로 결합부 수정 없이 확장된다.
 *
 * - 단축키는 확장 기본값 그대로: Cmd/Ctrl+B·I·U·Shift+S·E(코드).
 * - Link 는 rel="noopener noreferrer nofollow" 기본값 유지.
 *   openOnClick 만 끈다 — 편집 중 클릭이 페이지 이동이 되면 본문 편집이 막힌다
 *   (노션 관행: 편집 화면에서는 클릭으로 이동하지 않음).
 * - Color(글자색)는 TextStyle(중립 span) 전제 — TextStyle 없이는 setColor가
 *   적용할 마크 자체가 없다. 반드시 둘 다 등록.
 *   확인: editor.getAttributes("textStyle").color.
 * - Highlight(배경색/형광펜)는 multicolor:true — toggleHighlight({ color })로
 *   임의 hex 색을 적용한다. 확인: editor.isActive("highlight", { color }).
 * - FontSize(글자 크기)도 TextStyle 전제 — setFontSize("20px")/unsetFontSize().
 *   확인: editor.getAttributes("textStyle").fontSize.
 */
export const MARKS: AnyExtension[] = [
  Bold,
  Italic,
  Underline,
  Strike,
  Code,
  Link.configure({ openOnClick: false }),
  TextStyle,
  Color,
  Highlight.configure({ multicolor: true }),
  FontSize,
];

/**
 * 플로팅 툴바의 링크 미니 입력 계약(스펙 wt1 §①):
 * Enter 로 적용, 빈 값(공백 포함)은 링크 해제.
 * extendMarkRange 로 커서가 링크 위에만 있어도 마크 전체 범위에 적용/해제한다.
 */
export function applyLink(editor: Editor, url: string): void {
  const href = url.trim();
  if (!href) {
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    return;
  }
  editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
}
