import { mergeAttributes, Node } from "@tiptap/core";
import { ReactNodeViewRenderer, type AnyExtension } from "@tiptap/react";
import Heading from "@tiptap/extension-heading";
import BulletList from "@tiptap/extension-bullet-list";
import OrderedList from "@tiptap/extension-ordered-list";
import ListItem from "@tiptap/extension-list-item";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Blockquote from "@tiptap/extension-blockquote";
import HorizontalRule from "@tiptap/extension-horizontal-rule";
import { ToggleView } from "@/components/editor/nodes/ToggleView";

/**
 * 블록 노드 확장 등록 — **wt2 전용 파일** (오버뷰 스펙 §파일 소유권).
 * lib/editor/blocks.ts 계약에 선언된 노드 중 이미지·파일(wt3 소유)을 뺀 11종을
 * 등록한다. P1 기본 확장(Document/Paragraph/Text/HardBreak/UndoRedo)은
 * PostEditor 결합부가 이미 갖고 있으므로 여기서 중복 등록하지 않는다.
 *
 * 마크다운 단축 입력(§5.10)은 각 확장의 기본 inputRules를 그대로 쓴다:
 * `# `/`## `/`### `(제목 1–3), `- `(불릿), `1. `(번호), `[] `(체크박스),
 * `> `(인용), `---`(구분선).
 *
 * 시각 스타일은 전부 globals.css 파일 끝 `.blk-*` 조각(§4.3.1)이 담당한다 —
 * HTMLAttributes로 클래스만 부여하고 여기서는 스타일 값을 만들지 않는다.
 */

/**
 * callout — 배경 `--accent-soft` + radius-lg 카드에 아이콘(💡 고정, P1 범위)과
 * 내부 문단을 담는 커스텀 노드(§4.3.1). 아이콘은 CSS `::before` 장식이라
 * 문서 내용(docToText projection)에 포함되지 않는다.
 */
export const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "paragraph+",
  defining: true,
  parseHTML() {
    return [{ tag: 'div[data-type="callout"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "callout",
        class: "blk-callout",
      }),
      0,
    ];
  },
});

/**
 * toggle — 제목행(첫 문단) + 접히는 본문 영역(§4.3.1). 접힘 상태는 노드
 * attrs(`open`)로 문서에 저장한다(기본 true=펼침). 첫 자식은 항상 문단(제목행),
 * 이후는 임의 블록. 편집 UI는 ToggleView(React NodeView)가 렌더한다.
 */
export const Toggle = Node.create({
  name: "toggle",
  group: "block",
  content: "paragraph block*",
  defining: true,
  addAttributes() {
    return {
      open: {
        default: true,
        parseHTML: (element) => element.getAttribute("data-open") !== "false",
        renderHTML: (attributes) => ({
          "data-open": attributes.open ? "true" : "false",
        }),
      },
    };
  },
  parseHTML() {
    return [{ tag: 'div[data-type="toggle"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "toggle",
        class: "blk-toggle",
      }),
      0,
    ];
  },
  addNodeView() {
    return ReactNodeViewRenderer(ToggleView);
  },
});

export const NODES: AnyExtension[] = [
  // blocks.ts 계약: heading level 1–3 제한.
  Heading.configure({ levels: [1, 2, 3], HTMLAttributes: { class: "blk-heading" } }),
  BulletList.configure({ HTMLAttributes: { class: "blk-ul" } }),
  OrderedList.configure({ HTMLAttributes: { class: "blk-ol" } }),
  ListItem.configure({ HTMLAttributes: { class: "blk-li" } }),
  TaskList.configure({ HTMLAttributes: { class: "blk-task" } }),
  // 체크박스 목록은 중첩 허용(스펙 ④).
  TaskItem.configure({ nested: true, HTMLAttributes: { class: "blk-task-item" } }),
  Blockquote.configure({ HTMLAttributes: { class: "blk-quote" } }),
  HorizontalRule.configure({ HTMLAttributes: { class: "blk-hr" } }),
  Callout,
  Toggle,
];
