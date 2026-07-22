"use client";

import { ChevronRight } from "lucide-react";
import {
  NodeViewContent,
  NodeViewWrapper,
  type NodeViewProps,
} from "@tiptap/react";

/**
 * toggle 노드 뷰(wt2 ④, DESIGN.md §4.3.1) — 제목행 왼쪽의 펼침 삼각형 버튼 +
 * 접히는 본문 영역. 접힘 상태는 노드 attrs(`open`)로 문서에 저장되어
 * 저장·재열람 후에도 유지된다. 접혀도 본문은 문서에 남아 docToText projection
 * (검색·글자 수)이 텍스트를 잃지 않는다.
 *
 * 접힘 표현은 CSS(§4.3.1 `.blk-toggle`)가 담당한다 — `.is-open`이 없으면
 * 첫 문단(제목행)만 보이고 나머지 자식은 숨긴다.
 */
export function ToggleView({ node, updateAttributes }: NodeViewProps) {
  const open = node.attrs.open !== false;
  return (
    <NodeViewWrapper
      className={`blk-toggle${open ? " is-open" : ""}`}
      data-open={open ? "true" : "false"}
    >
      <button
        type="button"
        className="blk-toggle__btn"
        contentEditable={false}
        aria-expanded={open}
        aria-label={open ? "토글 접기" : "토글 펼치기"}
        // mousedown 기본 동작을 막아 에디터 포커스·선택이 흐트러지지 않게 한다.
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => updateAttributes({ open: !open })}
      >
        <ChevronRight size={16} />
      </button>
      <NodeViewContent className="blk-toggle__content" />
    </NodeViewWrapper>
  );
}
