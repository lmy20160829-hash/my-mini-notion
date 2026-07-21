/**
 * 플레인 텍스트 ↔ 에디터 문서(JSON) 변환 — 마이그레이션 손실 제로의 축.
 *
 * 계약(스펙 2026-07-21-editor-sprint-overview.md §3):
 * - `content_doc`이 저장된 글은 항상 `docToText(content_doc) === content`.
 * - `content_doc`이 없는 기존 글은 `textToDoc(content)`로 즉석 변환한다 —
 *   결정적이고, 문단 전용 문서에서는 완전한 왕복(가역)이 성립한다.
 *
 * Tiptap(ProseMirror) JSON과 구조 호환이지만 의존성은 두지 않는다 —
 * 순수 함수로 유지해 jsdom 없이 단위 테스트한다.
 */

export type EditorNode = {
  type: string;
  text?: string;
  content?: EditorNode[];
  attrs?: Record<string, unknown>;
};

export type EditorDoc = { type: "doc"; content?: EditorNode[] };

/** 플레인 텍스트 → 문단 전용 문서. 줄마다 문단, 빈 줄은 빈 문단. */
export function textToDoc(text: string): EditorDoc {
  const paragraphs = (text ?? "").split("\n").map<EditorNode>((line) =>
    line === ""
      ? { type: "paragraph" }
      : { type: "paragraph", content: [{ type: "text", text: line }] }
  );
  return { type: "doc", content: paragraphs };
}

/** 노드 내부의 텍스트를 재귀로 모은다(미래의 중첩 블록도 텍스트는 보존). */
function nodeText(node: EditorNode): string {
  if (node.type === "text") return node.text ?? "";
  return (node.content ?? []).map(nodeText).join("");
}

/**
 * 문서 → 플레인 텍스트 projection. 최상위 블록 하나당 한 줄, `\n`으로 잇는다.
 * `page.content`에 항상 함께 저장되어 사이드바 검색(filterPosts)과 폴백 렌더를 지킨다.
 */
export function docToText(doc: EditorDoc): string {
  return (doc.content ?? []).map(nodeText).join("\n");
}
