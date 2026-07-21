/**
 * 블록 레지스트리 — wt1(슬래시 메뉴·템플릿)과 wt2(블록 구현)의 접점 계약.
 * (스펙 docs/superpowers/specs/2026-07-21-editor-sprint-overview.md)
 *
 * - wt1은 이 배열만 소비한다: 슬래시 메뉴 항목 = BLOCKS를 keywords로 필터,
 *   삽입 = `type`/`attrs`로 Tiptap 노드 생성.
 * - wt2는 여기 선언된 `type` 이름을 그대로 가진 Tiptap 노드를 구현한다.
 * - 항목 추가·이름 변경은 반드시 이 파일 + __tests__/editor-blocks.test.ts 를
 *   같은 커밋에서 갱신한다(계약 파일).
 */

export type BlockSpec = {
  /** 슬래시 메뉴·템플릿에서 쓰는 고유 id. */
  id: string;
  /** Tiptap 노드 타입 이름 — wt2 구현과 문자 그대로 일치해야 한다. */
  type: string;
  /** 노드 생성 시 attrs (예: heading level). */
  attrs?: Record<string, unknown>;
  /** 메뉴에 보이는 한국어 이름. */
  label: string;
  /** 슬래시 메뉴 검색어(한국어·영어 혼용). */
  keywords: string[];
};

export const BLOCKS: BlockSpec[] = [
  { id: "paragraph", type: "paragraph", label: "텍스트", keywords: ["텍스트", "본문", "text", "p"] },
  { id: "heading1", type: "heading", attrs: { level: 1 }, label: "제목 1", keywords: ["제목", "h1", "heading"] },
  { id: "heading2", type: "heading", attrs: { level: 2 }, label: "제목 2", keywords: ["제목", "h2", "heading"] },
  { id: "heading3", type: "heading", attrs: { level: 3 }, label: "제목 3", keywords: ["제목", "h3", "heading"] },
  { id: "bulletList", type: "bulletList", label: "불릿 목록", keywords: ["불릿", "목록", "bullet", "list", "ul"] },
  { id: "orderedList", type: "orderedList", label: "번호 목록", keywords: ["번호", "목록", "ordered", "ol"] },
  { id: "taskList", type: "taskList", label: "체크박스 목록", keywords: ["체크", "할일", "todo", "task", "checkbox"] },
  { id: "blockquote", type: "blockquote", label: "인용", keywords: ["인용", "quote"] },
  { id: "callout", type: "callout", label: "콜아웃", keywords: ["콜아웃", "강조", "callout"] },
  { id: "toggle", type: "toggle", label: "토글", keywords: ["토글", "접기", "toggle"] },
  { id: "horizontalRule", type: "horizontalRule", label: "구분선", keywords: ["구분선", "divider", "hr"] },
  { id: "image", type: "image", label: "이미지", keywords: ["이미지", "사진", "image", "img"] },
  { id: "fileBlock", type: "fileBlock", label: "파일", keywords: ["파일", "첨부", "file", "attachment"] },
];
