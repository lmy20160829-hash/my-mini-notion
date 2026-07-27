import { afterEach, describe, expect, test } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { Editor } from "@tiptap/core";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import BulletList from "@tiptap/extension-bullet-list";
import ListItem from "@tiptap/extension-list-item";
import OrderedList from "@tiptap/extension-ordered-list";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { TABLE_NODES } from "@/lib/editor/table-nodes";

/**
 * 이 파일이 존재하는 이유 — 2026-07-27 재발 버그.
 *
 * 기존 표 테스트(`editor-table-nodes.test.ts`)는 전부 `editor.getHTML()`,
 * 즉 **직렬화 경로**만 단언했다. 그런데 `resizable: true`인 표는 화면에
 * 그려질 때 renderHTML이 아니라 **nodeView(TableView)** 를 타고,
 * prosemirror-tables의 columnResizing이 nodeView를 만들 때 HTMLAttributes를
 * 넘기지 않아 라이브 `<table>`에서 `class="tbl"`이 통째로 사라졌다.
 * 그 결과 `.tbl td, .tbl th`에 걸린 격자 border가 에디터에서 죽고,
 * 직렬화 HTML만 보는 테스트는 515개 전부 초록이었다.
 *
 * 그래서 여기서는 **화면에 실제로 붙는 DOM(editor.view.dom)** 만 본다.
 * 나아가 globals.css의 실제 표 규칙을 주입해 `getComputedStyle`로
 * "border가 계산되는가"까지 확인한다 — 선택자와 DOM이 어긋나면 실패한다.
 */

/** globals.css에서 표 관련 규칙만 뽑고 `var(--x)`를 :root 토큰 값으로 치환한다.
 *  (jsdom의 getComputedStyle은 캐스케이드는 계산하지만 var()는 해석하지 못한다.) */
function tableCssWithResolvedVars(): string {
  const css = fs.readFileSync(path.join(process.cwd(), "app/globals.css"), "utf8");

  const vars = new Map<string, string>();
  const rootBlock = css.match(/:root\s*\{([\s\S]*?)\n\}/);
  if (rootBlock) {
    for (const m of rootBlock[1].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
      vars.set(m[1], m[2].trim());
    }
  }

  // 최상위 규칙 중 선택자가 표를 가리키는 것만 수집(@media 등 at-rule 제외).
  const rules = [...css.matchAll(/(^|\n)\s*([^@{}\n][^{}]*)\{([^{}]*)\}/g)]
    .filter((m) => /\.tbl\b|tableWrapper/.test(m[2]) && !/\.tbl-toolbar/.test(m[2]))
    .map((m) => `${m[2].trim()} { ${m[3].trim()} }`)
    .join("\n");

  let out = rules;
  for (let i = 0; i < 5 && out.includes("var("); i++) {
    out = out.replace(/var\((--[\w-]+)\)/g, (whole, name: string) => vars.get(name) ?? whole);
  }
  return out;
}

let editor: Editor | null = null;

function mountEditorWithTable() {
  const style = document.createElement("style");
  style.textContent = tableCssWithResolvedVars();
  document.head.appendChild(style);

  const element = document.createElement("div");
  document.body.appendChild(element);

  editor = new Editor({
    element,
    extensions: [Document, Paragraph, Text, BulletList, ListItem, OrderedList, TaskList, TaskItem, ...TABLE_NODES],
  });
  editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  return editor.view.dom as HTMLElement;
}

afterEach(() => {
  editor?.destroy();
  editor = null;
  document.body.innerHTML = "";
  document.head.innerHTML = "";
});

describe("표 — 화면에 실제로 그려지는 DOM", () => {
  test("라이브 <table>에 class='tbl'이 붙는다 (nodeView 경로에서도)", () => {
    const dom = mountEditorWithTable();
    const table = dom.querySelector("table");
    expect(table).not.toBeNull();
    expect(table!.classList.contains("tbl")).toBe(true);
  });

  test("CSS 선택자 '.tbl td'/'.tbl th'가 라이브 DOM과 매칭된다", () => {
    const dom = mountEditorWithTable();
    expect(dom.querySelectorAll(".tbl td").length).toBeGreaterThan(0);
    expect(dom.querySelectorAll(".tbl th").length).toBeGreaterThan(0);
  });

  test("셀에 격자 border가 계산된다 — 1px solid --border-default", () => {
    const dom = mountEditorWithTable();
    const td = dom.querySelector("td")!;
    const cs = getComputedStyle(td);
    // --border-default → --gray-200 → #e2e3e5
    expect(cs.borderTopStyle).toBe("solid");
    expect(cs.borderTopWidth).toBe("1px");
    expect(cs.borderTopColor).toBe("rgb(226, 227, 229)");
    for (const side of ["borderRightStyle", "borderBottomStyle", "borderLeftStyle"] as const) {
      expect(cs[side]).toBe("solid");
    }
  });

  test("헤더 셀도 격자 + 옅은 배경(--surface-subtle)이 계산된다", () => {
    const dom = mountEditorWithTable();
    const cs = getComputedStyle(dom.querySelector("th")!);
    expect(cs.borderTopStyle).toBe("solid");
    // --surface-subtle → --gray-50 → #f7f8f9
    expect(cs.backgroundColor).toBe("rgb(247, 248, 249)");
  });

  test("빈 셀도 클릭 가능한 최소 크기를 유지한다 (height 34px / min-width 48px)", () => {
    const dom = mountEditorWithTable();
    const cs = getComputedStyle(dom.querySelector("td")!);
    expect(cs.height).toBe("34px");
    expect(cs.minWidth).toBe("48px");
  });
});
