import type { Editor } from "@tiptap/core";
import type { BlockSpec } from "@/lib/editor/blocks";

/**
 * 블록 삽입 — **wt1 전용 파일** (스펙 wt1 §②).
 * 슬래시 메뉴·템플릿의 유일한 삽입 경로다. BLOCKS 레지스트리의 spec 만 받아
 * `spec.type`/`attrs`를 노드 생성 커맨드로 매핑한다.
 */

/**
 * 스키마 가드 — wt2 노드가 아직 없는 타입은 자동 숨김(머지 순서 무관 안전장치).
 * `editor.schema.nodes[type]` 존재 검사(스펙 wt1 §②).
 */
export function isBlockAvailable(editor: Editor, spec: BlockSpec): boolean {
  return Boolean(editor.schema.nodes[spec.type]);
}

/** 슬래시 메뉴 실시간 필터 — label + keywords, 대소문자 무시. 빈 질의 = 전체. */
export function filterBlocks(specs: BlockSpec[], query: string): BlockSpec[] {
  const q = query.trim().toLowerCase();
  if (!q) return specs;
  return specs.filter(
    (s) =>
      s.label.toLowerCase().includes(q) ||
      s.keywords.some((k) => k.toLowerCase().includes(q))
  );
}

/**
 * 단일 삽입 함수(스펙 wt1 §②) — 성공 여부를 돌려준다.
 * 스키마 미등록 타입은 false(문서 불변). 타입군별 매핑:
 * - 텍스트 블록(paragraph·heading): setNode
 * - 목록(bulletList·orderedList·taskList): toggleList
 * - 래퍼(blockquote·callout·toggle): wrapIn → 실패 시 insertContent 폴백
 * - 리프/원자(horizontalRule·image·fileBlock 등): insertContent
 */
export function insertBlock(editor: Editor, spec: BlockSpec): boolean {
  if (!isBlockAvailable(editor, spec)) return false;

  const chain = () => editor.chain().focus();

  switch (spec.type) {
    case "paragraph":
      return chain().setNode("paragraph").run();
    case "heading":
      return chain().setNode("heading", spec.attrs).run();
    case "bulletList":
      return chain().toggleList("bulletList", "listItem").run();
    case "orderedList":
      return chain().toggleList("orderedList", "listItem").run();
    case "taskList":
      return chain().toggleList("taskList", "taskItem").run();
    case "blockquote":
    case "callout":
    case "toggle": {
      // wt2 커스텀 래퍼 포함 — 스키마 제약으로 wrapIn 이 안 되는 구조면
      // 빈 문단을 품은 노드 삽입으로 폴백한다.
      if (chain().wrapIn(spec.type, spec.attrs).run()) return true;
      return chain()
        .insertContent({ type: spec.type, attrs: spec.attrs, content: [{ type: "paragraph" }] })
        .run();
    }
    default:
      return chain().insertContent({ type: spec.type, attrs: spec.attrs }).run();
  }
}
