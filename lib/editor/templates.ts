import type { Editor } from "@tiptap/core";
import type { EditorDoc, EditorNode } from "@/lib/editor/doc";

/**
 * 페이지 템플릿 — **wt1 전용 파일** (스펙 wt1 §⑨).
 * 3종(회의록·할 일·메모)을 `EditorDoc` 조각으로 만든다. 최상위 노드 타입은
 * BLOCKS 레지스트리의 type 문자열만 사용한다(목록 자식 listItem·taskItem 은
 * Tiptap 표준 이름 — wt2 구현 계약과 동일).
 * 순수 함수 유지 — 에디터 렌더 없이 JSON 구조를 단위 테스트한다.
 */

export type PageTemplate = {
  id: "meeting" | "todo" | "memo";
  /** 템플릿 행 버튼 라벨(§6.8). */
  label: string;
  /** 삽입할 문서를 만든다. `now`는 회의록 날짜 문단용(기본 오늘). */
  build: (now?: Date) => EditorDoc;
};

// -- 노드 생성 헬퍼 (내부 전용) ------------------------------------------------

const text = (t: string): EditorNode => ({ type: "text", text: t });
const paragraph = (t?: string): EditorNode =>
  t ? { type: "paragraph", content: [text(t)] } : { type: "paragraph" };
const heading = (level: 1 | 2 | 3, t: string): EditorNode => ({
  type: "heading",
  attrs: { level },
  content: [text(t)],
});
const listItem = (): EditorNode => ({ type: "listItem", content: [paragraph()] });
const taskItem = (): EditorNode => ({
  type: "taskItem",
  attrs: { checked: false },
  content: [paragraph()],
});

function formatDocDate(d: Date): string {
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

// -- 템플릿 3종 ---------------------------------------------------------------

export const TEMPLATES: PageTemplate[] = [
  {
    id: "meeting",
    label: "회의록",
    // 제목1 "회의록" + 날짜 문단 + 참석자 불릿 + 안건 번호 목록 + 액션아이템 체크박스.
    // 섹션 라벨은 제목2 — BLOCKS 의 heading 타입만 쓰는 노션식 구획.
    build: (now = new Date()) => ({
      type: "doc",
      content: [
        heading(1, "회의록"),
        paragraph(`날짜: ${formatDocDate(now)}`),
        heading(2, "참석자"),
        { type: "bulletList", content: [listItem()] },
        heading(2, "안건"),
        { type: "orderedList", content: [listItem()] },
        heading(2, "액션 아이템"),
        { type: "taskList", content: [taskItem()] },
      ],
    }),
  },
  {
    id: "todo",
    label: "할 일",
    // 제목1 + 체크박스 목록 3칸.
    build: () => ({
      type: "doc",
      content: [
        heading(1, "할 일"),
        { type: "taskList", content: [taskItem(), taskItem(), taskItem()] },
      ],
    }),
  },
  {
    id: "memo",
    label: "메모",
    // 제목1 + 문단.
    build: () => ({
      type: "doc",
      content: [heading(1, "메모"), paragraph()],
    }),
  },
];

// -- 노출 조건·스키마 가드 ------------------------------------------------------

/**
 * 빈 글 판정(§5.11): 내용이 없거나 "빈 문단 하나"뿐인 문서.
 * 상세 화면의 dual-read(`content_doc ?? textToDoc(content)`)에서
 * "content_doc 없음 && content 빈 문자열"인 글은 정확히 이 모양이 된다.
 * 빈 문단이 두 개 이상이면 이미 편집 흔적으로 본다.
 */
export function isBlankDoc(doc: EditorDoc | null | undefined): boolean {
  const content = doc?.content ?? [];
  if (content.length === 0) return true;
  if (content.length > 1) return false;
  const only = content[0];
  return only.type === "paragraph" && (only.content ?? []).length === 0;
}

/** 문서 조각이 쓰는 노드 타입 전부(재귀, text 제외). */
function collectNodeTypes(nodes: EditorNode[] | undefined, into: Set<string>): Set<string> {
  for (const node of nodes ?? []) {
    if (node.type !== "text") into.add(node.type);
    collectNodeTypes(node.content, into);
  }
  return into;
}

/**
 * 스키마 가드(슬래시 메뉴 §②와 같은 원칙): 템플릿이 쓰는 노드가 하나라도
 * 스키마에 없으면(wt2 미머지) 그 템플릿을 숨긴다 — 단독으로도 깨지지 않는다.
 */
export function isTemplateAvailable(editor: Editor, template: PageTemplate): boolean {
  const types = collectNodeTypes(template.build().content, new Set<string>());
  return [...types].every((type) => Boolean(editor.schema.nodes[type]));
}
