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
  const children = node.content ?? [];
  // 표 특례: 행은 셀을 공백으로, 표는 행을 줄바꿈으로 잇는다(검색·미리보기 품질).
  if (node.type === "tableRow") return children.map(nodeText).join(" ");
  if (node.type === "table") return children.map(nodeText).join("\n");
  return children.map(nodeText).join("");
}

/**
 * 문서 → 플레인 텍스트 projection. 최상위 블록 하나당 한 줄, `\n`으로 잇는다.
 * `page.content`에 항상 함께 저장되어 사이드바 검색(filterPosts)과 폴백 렌더를 지킨다.
 */
export function docToText(doc: EditorDoc): string {
  return (doc.content ?? []).map(nodeText).join("\n");
}

/**
 * 미리보기 상한. CSS(.post-card__preview)가 카드 폭에 맞춰 훨씬 앞에서 말줄임하므로
 * 눈에 보이는 값이 아니라, 아주 긴 문단이 카드마다 통째로 DOM에 실리는 것만 막는다.
 */
const PREVIEW_MAX = 200;

/**
 * 문서 → 목록 카드 미리보기 문자열(§4.2). docToText와 달리 **내용 있는 첫 블록**
 * 하나만 뽑는다 — 전체를 이으면 카드 한 줄에 블록들이 뭉쳐 보이기 때문이다.
 * 빈 문단·이미지·구분선처럼 텍스트가 없는 블록은 건너뛰고, 그런 블록뿐이면 빈
 * 문자열을 돌려준다(표시 문구 "내용 없음"은 호출부가 정한다).
 * 말줄임(...)은 CSS가 담당하므로 여기서 붙이지 않는다.
 */
export function docToPreview(doc: EditorDoc): string {
  for (const block of doc.content ?? []) {
    // 블록 안 hardBreak·연속 공백은 한 칸으로 — 카드는 한 줄짜리다.
    const line = nodeText(block).replace(/\s+/g, " ").trim();
    if (line) return line.slice(0, PREVIEW_MAX);
  }
  return "";
}
