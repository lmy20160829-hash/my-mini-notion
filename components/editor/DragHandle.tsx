"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DragHandle } from "@tiptap/extension-drag-handle-react";
import type { Editor } from "@tiptap/react";
import { GripVertical } from "lucide-react";
import { BLOCKS, type BlockSpec } from "@/lib/editor/blocks";
import type { EditorNode } from "@/lib/editor/doc";

/**
 * 드래그 핸들(wt2 ③, DESIGN.md §2.12·§5.10) — 블록 hover 시 왼쪽 여백에
 * `⋮⋮`(GripVertical) 핸들을 띄운다. 드래그 = 블록 이동(ProseMirror 기본),
 * 클릭 = `.handle-menu`(타입 변환 · 복제 · 삭제).
 *
 * PostEditor 결합부(extensions 배열)는 만지지 않는다 — EditorContent의
 * 형제 컴포넌트로 부착되고, 확장 플러그인은 @tiptap/extension-drag-handle-react가
 * 스스로 등록·해제한다(오버뷰 스펙 §파일 소유권).
 */

export const HANDLE_ARIA_LABEL = "블록 옮기기";
export const HANDLE_MENU_LABEL = "블록 메뉴";

/**
 * 클릭 메뉴의 "전환" 대상 — BLOCKS 계약 중 현재 스키마에 존재하는 텍스트 블록.
 * 구분선(atom)과 스키마에 없는 이미지·파일(wt3)은 자연히 제외된다.
 */
export function handleMenuBlocks(editor: Editor): BlockSpec[] {
  return BLOCKS.filter((b) => {
    const type = editor.schema.nodes[b.type];
    return Boolean(type) && !type.isAtom;
  });
}

/** 블록 내부의 문단(textblock) inline 내용을 순서대로 모은다 — 변환 시 마크 보존. */
function collectInlineContents(node: EditorNode): Array<EditorNode[] | undefined> {
  const collected: Array<EditorNode[] | undefined> = [];
  const visit = (n: EditorNode) => {
    if (n.type === "paragraph" || n.type === "heading") {
      collected.push(n.content);
      return;
    }
    (n.content ?? []).forEach(visit);
  };
  visit(node);
  return collected.length > 0 ? collected : [undefined];
}

const paragraphOf = (inline?: EditorNode[]): EditorNode =>
  inline && inline.length > 0 ? { type: "paragraph", content: inline } : { type: "paragraph" };

/** 변환 결과 JSON — 문단 나열형(문단·제목)과 래퍼형(목록·인용·콜아웃·토글)을 만든다. */
function buildConverted(spec: BlockSpec, inlines: Array<EditorNode[] | undefined>): EditorNode | EditorNode[] {
  switch (spec.type) {
    case "paragraph":
      return inlines.map(paragraphOf);
    case "heading":
      return inlines.map((inline) => ({
        type: "heading",
        attrs: { ...spec.attrs },
        content: inline && inline.length > 0 ? inline : undefined,
      }));
    case "bulletList":
    case "orderedList":
      return {
        type: spec.type,
        content: inlines.map((inline) => ({
          type: "listItem",
          content: [paragraphOf(inline)],
        })),
      };
    case "taskList":
      return {
        type: "taskList",
        content: inlines.map((inline) => ({
          type: "taskItem",
          attrs: { checked: false },
          content: [paragraphOf(inline)],
        })),
      };
    case "blockquote":
    case "callout":
      return { type: spec.type, content: inlines.map(paragraphOf) };
    case "toggle":
      return {
        type: "toggle",
        attrs: { open: true },
        content: inlines.map(paragraphOf),
      };
    default:
      return inlines.map(paragraphOf);
  }
}

/** 타입 변환 — pos의 최상위 블록을 spec 타입으로 교체한다(텍스트·마크 보존). */
export function convertBlockAt(editor: Editor, pos: number, spec: BlockSpec): boolean {
  const node = editor.state.doc.nodeAt(pos);
  if (!node) return false;
  const inlines = collectInlineContents(node.toJSON() as EditorNode);
  const converted = buildConverted(spec, inlines);
  return editor
    .chain()
    .focus()
    .insertContentAt({ from: pos, to: pos + node.nodeSize }, converted)
    .run();
}

/** 복제 — 같은 블록을 바로 아래에 삽입한다. */
export function duplicateBlockAt(editor: Editor, pos: number): boolean {
  const node = editor.state.doc.nodeAt(pos);
  if (!node) return false;
  return editor
    .chain()
    .focus()
    .insertContentAt(pos + node.nodeSize, node.toJSON())
    .run();
}

/** 삭제 — 블록을 문서에서 제거한다. */
export function deleteBlockAt(editor: Editor, pos: number): boolean {
  const node = editor.state.doc.nodeAt(pos);
  if (!node) return false;
  return editor
    .chain()
    .focus()
    .deleteRange({ from: pos, to: pos + node.nodeSize })
    .run();
}

/**
 * 핸들 클릭 메뉴 — §2.7.8 슬래시 메뉴와 같은 카드 토큰(.handle-menu, §2.12).
 * 키보드: 위/아래 화살표(순환)·Home/End·Enter(항목 실행)·Esc(닫기).
 */
export function HandleMenu({
  editor,
  pos,
  onClose,
}: {
  editor: Editor;
  pos: number;
  onClose: () => void;
}) {
  const blocks = handleMenuBlocks(editor);
  const items: Array<{ key: string; label: string; danger?: boolean; run: () => void }> = [
    ...blocks.map((b) => ({
      key: `convert:${b.id}`,
      label: b.label,
      run: () => convertBlockAt(editor, pos, b),
    })),
    { key: "duplicate", label: "복제", run: () => duplicateBlockAt(editor, pos) },
    { key: "delete", label: "삭제", danger: true, run: () => deleteBlockAt(editor, pos) },
  ];
  const [active, setActive] = useState(0);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    itemRefs.current[active]?.focus();
  }, [active]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % items.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i - 1 + items.length) % items.length);
    } else if (e.key === "Home") {
      e.preventDefault();
      setActive(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActive(items.length - 1);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  const renderItem = (item: (typeof items)[number], index: number) => (
    <button
      key={item.key}
      ref={(el) => {
        itemRefs.current[index] = el;
      }}
      type="button"
      role="menuitem"
      className={`handle-menu__item${item.danger ? " handle-menu__item--danger" : ""}`}
      tabIndex={index === active ? 0 : -1}
      onClick={() => {
        item.run();
        onClose();
      }}
    >
      {item.label}
    </button>
  );

  return (
    <div className="handle-menu" role="menu" aria-label={HANDLE_MENU_LABEL} onKeyDown={onKeyDown}>
      <div className="handle-menu__group">전환</div>
      {items.slice(0, blocks.length).map((item, i) => renderItem(item, i))}
      <div className="handle-menu__group">동작</div>
      {items.slice(blocks.length).map((item, i) => renderItem(item, blocks.length + i))}
    </div>
  );
}

/**
 * EditorContent 형제로 부착하는 드래그 핸들 본체. hover 대상 블록은
 * 플러그인의 onNodeChange로 추적하고, 메뉴가 열린 동안에는 핸들을 잠가
 * (lockDragHandle) 위치·표시를 고정한다.
 */
export function EditorDragHandle({ editor }: { editor: Editor | null }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [targetPos, setTargetPos] = useState<number | null>(null);
  const menuOpenRef = useRef(menuOpen);
  menuOpenRef.current = menuOpen;

  const onNodeChange = useCallback(
    ({ node, pos }: { node: unknown | null; pos: number }) => {
      if (menuOpenRef.current) return; // 메뉴가 열린 동안 대상 고정
      setTargetPos(node && pos >= 0 ? pos : null);
    },
    []
  );

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    if (editor && !editor.isDestroyed) {
      // lock/unlockDragHandle 커맨드는 @tiptap/extension-drag-handle(base)이 제공하는데,
      // react <DragHandle>는 plugin만 등록하고 이 커맨드는 안 만든다(base 미등록).
      // 커맨드가 없으면 스킵해 크래시를 막는다(핸들 고정은 base 등록이 선행 — BACKLOG).
      editor.commands.unlockDragHandle?.();
      editor.commands.focus();
    }
  }, [editor]);

  // 메뉴 밖 클릭으로 닫기.
  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest(".handle-wrap")) return;
      closeMenu();
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [menuOpen, closeMenu]);

  if (!editor || editor.isDestroyed) return null;

  return (
    <DragHandle editor={editor} className="handle-wrap" onNodeChange={onNodeChange}>
      <button
        type="button"
        className="handle-btn"
        aria-label={HANDLE_ARIA_LABEL}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onClick={() => {
          if (targetPos === null) return;
          if (menuOpen) {
            closeMenu();
          } else {
            setMenuOpen(true);
            editor.commands.lockDragHandle?.();
          }
        }}
      >
        <GripVertical size={16} />
      </button>
      {menuOpen && targetPos !== null ? (
        <HandleMenu editor={editor} pos={targetPos} onClose={closeMenu} />
      ) : null}
    </DragHandle>
  );
}
