import { describe, expect, test } from "vitest";
import { docToText, docToPreview, type EditorDoc } from "@/lib/editor/doc";

// wt2 ④ — docToText projection이 새 블록 타입에서도 텍스트를 보존하는지 잠근다.
// 사이드바 검색(filterPosts)·글자 수 칩·`docToText(content_doc) === content` 불변식이
// 이 projection에 의존한다(오버뷰 스펙 §3). 순수 JSON 검증 — 에디터 불필요.

const p = (text: string) =>
  text === ""
    ? { type: "paragraph" }
    : { type: "paragraph", content: [{ type: "text", text }] };

describe("docToText — 새 블록 타입 텍스트 보존", () => {
  test("heading 텍스트는 한 줄로 보존된다", () => {
    const doc: EditorDoc = {
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "큰 제목" }] },
        p("본문"),
      ],
    };
    expect(docToText(doc)).toBe("큰 제목\n본문");
  });

  test("불릿/번호 목록 — 중첩된 항목의 텍스트가 전부 남는다", () => {
    const doc: EditorDoc = {
      type: "doc",
      content: [
        {
          type: "bulletList",
          content: [
            { type: "listItem", content: [p("하나")] },
            {
              type: "listItem",
              content: [
                p("둘"),
                {
                  type: "orderedList",
                  content: [{ type: "listItem", content: [p("둘-하나")] }],
                },
              ],
            },
          ],
        },
      ],
    };
    expect(docToText(doc)).toBe("하나둘둘-하나");
  });

  test("체크박스 목록(taskList) 텍스트가 보존된다", () => {
    const doc: EditorDoc = {
      type: "doc",
      content: [
        {
          type: "taskList",
          content: [
            { type: "taskItem", attrs: { checked: true }, content: [p("끝낸 일")] },
            { type: "taskItem", attrs: { checked: false }, content: [p("남은 일")] },
          ],
        },
      ],
    };
    expect(docToText(doc)).toBe("끝낸 일남은 일");
  });

  test("인용(blockquote)·콜아웃(callout) 내부 문단이 보존된다", () => {
    const doc: EditorDoc = {
      type: "doc",
      content: [
        { type: "blockquote", content: [p("인용 한 줄")] },
        { type: "callout", content: [p("강조 메모")] },
      ],
    };
    expect(docToText(doc)).toBe("인용 한 줄\n강조 메모");
  });

  test("toggle — 접힌 상태(open=false)여도 제목·본문 텍스트가 남는다", () => {
    const doc: EditorDoc = {
      type: "doc",
      content: [
        {
          type: "toggle",
          attrs: { open: false },
          content: [p("토글 제목"), p("숨은 본문")],
        },
      ],
    };
    expect(docToText(doc)).toBe("토글 제목숨은 본문");
  });

  test("구분선(horizontalRule)은 빈 줄 하나로 취급되고 깨지지 않는다", () => {
    const doc: EditorDoc = {
      type: "doc",
      content: [p("위"), { type: "horizontalRule" }, p("아래")],
    };
    expect(docToText(doc)).toBe("위\n\n아래");
  });

  test("깊은 중첩(토글>불릿>항목>문단)도 재귀로 전부 수집한다", () => {
    const doc: EditorDoc = {
      type: "doc",
      content: [
        {
          type: "toggle",
          attrs: { open: true },
          content: [
            p("제목"),
            {
              type: "bulletList",
              content: [{ type: "listItem", content: [p("깊은 텍스트")] }],
            },
          ],
        },
      ],
    };
    expect(docToText(doc)).toBe("제목깊은 텍스트");
  });
});

// T3 — 표(table) 특례: tableRow는 셀을 공백으로, table은 행을 줄바꿈으로 잇는다.
// 특례가 없으면 셀 텍스트가 구분자 없이 뭉개진다("이름역할감PM") — 검색·미리보기 품질 저하.

const tableDoc: EditorDoc = {
  type: "doc",
  content: [
    {
      type: "table",
      content: [
        {
          type: "tableRow",
          content: [
            {
              type: "tableHeader",
              content: [{ type: "paragraph", content: [{ type: "text", text: "이름" }] }],
            },
            {
              type: "tableHeader",
              content: [{ type: "paragraph", content: [{ type: "text", text: "역할" }] }],
            },
          ],
        },
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              content: [{ type: "paragraph", content: [{ type: "text", text: "감" }] }],
            },
            {
              type: "tableCell",
              content: [{ type: "paragraph", content: [{ type: "text", text: "PM" }] }],
            },
          ],
        },
      ],
    },
  ],
};

test("표는 셀=공백·행=줄바꿈으로 투영된다", () => {
  expect(docToText(tableDoc)).toBe("이름 역할\n감 PM");
});

// docToPreview는 top-level 블록 하나(표 전체)에서 whitespace(개행 포함)를 전부
// 한 칸으로 접는다 — toggle·blockquote 등 다른 다중 문단 블록과 동일한 기존 규칙
// (§ docToPreview 주석 "블록 안 hardBreak·연속 공백은 한 칸으로"). 표도 예외가
// 아니므로 모든 행이 한 줄로 이어져 보인다(첫 행만 자르지 않는다).
test("미리보기는 표 전체를 한 줄로 접어 보여준다(행 구분 없이)", () => {
  expect(docToPreview(tableDoc)).toBe("이름 역할 감 PM");
});
