"use client";

import { useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { PluginKey } from "@tiptap/pm/state";
import Suggestion, {
  exitSuggestion,
  type SuggestionProps,
} from "@tiptap/suggestion";
import {
  ChevronRight,
  Heading1,
  Heading2,
  Heading3,
  Image as ImageIcon,
  List,
  ListChecks,
  ListOrdered,
  Megaphone,
  Minus,
  Paperclip,
  Quote,
  Type,
  type LucideIcon,
} from "lucide-react";
import { BLOCKS, type BlockSpec } from "@/lib/editor/blocks";
import { filterBlocks, insertBlock, isBlockAvailable } from "@/lib/editor/insert";

/**
 * ② 에디터 슬래시 커맨드 메뉴(§2.11, §5.11) — `@tiptap/suggestion` 기반, 트리거 `/`.
 * 기존 컴포저 슬래시 메뉴(§2.7.8 `.slash-menu`)와 **별개 컴포넌트**(.slash2-*) —
 * 그 화면은 불변, 같은 토큰(카드·hover·`__tile`)으로 시각 일관성만 맞춘다.
 *
 * - 항목은 `BLOCKS` 레지스트리만 소비(하드코딩 금지) + 스키마 미등록 타입 자동 숨김.
 * - 삽입은 `insertBlock(editor, spec)` 단일 함수.
 * - PostEditor 결합부는 건드리지 않는다 — EditorContent 형제로 렌더되고,
 *   Suggestion 플러그인은 `editor.registerPlugin` 으로 런타임 등록한다.
 */

const SLASH2_KEY = new PluginKey("slash2");

/** 표시용 아이콘 매핑(레지스트리는 표현을 모른다 — blocks.ts 읽기 전용). */
const BLOCK_ICONS: Record<string, LucideIcon> = {
  paragraph: Type,
  heading1: Heading1,
  heading2: Heading2,
  heading3: Heading3,
  bulletList: List,
  orderedList: ListOrdered,
  taskList: ListChecks,
  blockquote: Quote,
  callout: Megaphone,
  toggle: ChevronRight,
  horizontalRule: Minus,
  image: ImageIcon,
  fileBlock: Paperclip,
};

type MenuState = {
  items: BlockSpec[];
  command: (spec: BlockSpec) => void;
  position: { left: number; top: number };
};

export function SlashMenu({ editor }: { editor: Editor | null }) {
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [index, setIndex] = useState(0);
  // 플러그인 콜백(등록 시점 클로저)이 최신 상태를 읽도록 ref 로 미러링한다.
  const menuRef = useRef<MenuState | null>(null);
  const indexRef = useRef(0);
  menuRef.current = menu;
  indexRef.current = index;

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;

    const readProps = (props: SuggestionProps<BlockSpec, BlockSpec>) => {
      // jsdom 등 레이아웃 없는 환경에서 clientRect 가 실패해도 메뉴는 뜬다.
      let position = { left: 0, top: 0 };
      try {
        const rect = props.clientRect?.();
        if (rect) position = { left: rect.left, top: rect.bottom + 6 };
      } catch {
        /* 위치 폴백 (0,0) */
      }
      setMenu({ items: props.items, command: props.command, position });
    };

    const plugin = Suggestion<BlockSpec, BlockSpec>({
      editor,
      pluginKey: SLASH2_KEY,
      char: "/",
      allowSpaces: false,
      startOfLine: false,
      // 항목은 BLOCKS 만 소비 + 스키마 가드(wt2 미머지 안전장치).
      items: ({ query }) =>
        filterBlocks(
          BLOCKS.filter((b) => isBlockAvailable(editor, b)),
          query
        ),
      // 삽입: 트리거 텍스트(`/질의`) 제거 → 단일 삽입 함수.
      command: ({ editor: e, range, props: spec }) => {
        e.chain().focus().deleteRange(range).run();
        insertBlock(e, spec);
      },
      render: () => ({
        onStart: (props) => {
          setIndex(0);
          readProps(props);
        },
        onUpdate: (props) => {
          setIndex(0); // 질의가 바뀌면 첫 항목부터.
          readProps(props);
        },
        onExit: () => setMenu(null),
        onKeyDown: ({ event }) => {
          const m = menuRef.current;
          if (!m) return false;
          if (event.key === "ArrowDown") {
            if (m.items.length > 0) setIndex((i) => (i + 1) % m.items.length);
            return true;
          }
          if (event.key === "ArrowUp") {
            if (m.items.length > 0)
              setIndex((i) => (i - 1 + m.items.length) % m.items.length);
            return true;
          }
          if (event.key === "Enter") {
            const spec = m.items[indexRef.current];
            if (!spec) return false; // "결과 없음" — 편집기 기본 동작에 맡긴다.
            m.command(spec);
            return true;
          }
          if (event.key === "Escape") {
            exitSuggestion(editor.view, SLASH2_KEY); // onExit → 메뉴 닫힘.
            return true;
          }
          return false;
        },
      }),
    });

    // 맨 앞에 등록해야 한다 — 기본(append)이면 확장 키맵(Enter=splitBlock 등)이
    // 먼저 먹어 메뉴가 열린 채 Enter/방향키가 본문 편집으로 새어 나간다.
    editor.registerPlugin(plugin, (p, plugins) => [p, ...plugins]);
    return () => {
      if (!editor.isDestroyed) editor.unregisterPlugin(SLASH2_KEY);
    };
  }, [editor]);

  if (!menu) return null;

  return (
    <div
      className="slash2-menu"
      style={{ left: menu.position.left, top: menu.position.top }}
      role="listbox"
      aria-label="블록 삽입"
    >
      {menu.items.length === 0 ? (
        <div className="slash2-menu__empty">결과 없음</div>
      ) : (
        menu.items.map((spec, i) => {
          const Icon = BLOCK_ICONS[spec.id] ?? Type;
          return (
            <button
              key={spec.id}
              type="button"
              role="option"
              aria-selected={i === index}
              className={`slash2-menu__item${i === index ? " is-selected" : ""}`}
              // mousedown 기본 동작을 막아 에디터 포커스·선택을 유지한다.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => menu.command(spec)}
              onMouseEnter={() => setIndex(i)}
            >
              <span className="slash2-menu__tile" aria-hidden>
                <Icon size={16} />
              </span>
              <span className="slash2-menu__name">{spec.label}</span>
            </button>
          );
        })
      )}
    </div>
  );
}
