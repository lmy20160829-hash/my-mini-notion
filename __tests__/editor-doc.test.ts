import { describe, expect, test } from "vitest";
import { textToDoc, docToText, type EditorDoc } from "@/lib/editor/doc";

// 마이그레이션 손실 제로 계약(스펙 2026-07-21-editor-sprint-overview.md §3):
// content_doc이 있으면 docToText(content_doc) === content 가 항상 성립해야 한다.
// textToDoc은 결정적·가역적이어야 기존 플레인 텍스트 글을 즉석 변환해도 안전하다.

describe("textToDoc", () => {
  test("한 줄 텍스트를 문단 하나로 감싼다", () => {
    expect(textToDoc("안녕하세요")).toEqual({
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "안녕하세요" }] },
      ],
    });
  });

  test("줄바꿈은 줄마다 문단으로 나눈다 (빈 줄 = 빈 문단)", () => {
    expect(textToDoc("첫 줄\n\n셋째 줄")).toEqual({
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "첫 줄" }] },
        { type: "paragraph" },
        { type: "paragraph", content: [{ type: "text", text: "셋째 줄" }] },
      ],
    });
  });

  test("빈 문자열은 빈 문단 하나짜리 문서다", () => {
    expect(textToDoc("")).toEqual({
      type: "doc",
      content: [{ type: "paragraph" }],
    });
  });
});

describe("docToText", () => {
  test("문단들을 줄바꿈으로 잇는다", () => {
    const doc: EditorDoc = {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "a" }] },
        { type: "paragraph" },
        { type: "paragraph", content: [{ type: "text", text: "b" }] },
      ],
    };
    expect(docToText(doc)).toBe("a\n\nb");
  });

  test("중첩 노드의 텍스트도 재귀로 모은다 (미래 블록 대비)", () => {
    const doc: EditorDoc = {
      type: "doc",
      content: [
        {
          type: "blockquote",
          content: [
            { type: "paragraph", content: [{ type: "text", text: "인용" }] },
          ],
        },
      ],
    };
    expect(docToText(doc)).toBe("인용");
  });

  test("content가 없는 문서는 빈 문자열", () => {
    expect(docToText({ type: "doc" })).toBe("");
  });
});

describe("왕복 불변식 (손실 제로 계약)", () => {
  const samples = [
    "",
    "한 줄",
    "여러\n줄의\n텍스트",
    "끝에 줄바꿈\n",
    "\n앞에 줄바꿈",
    "빈\n\n\n줄 연속",
    "  공백 보존  \n\t탭도 보존",
  ];

  test.each(samples)("docToText(textToDoc(t)) === t : %j", (t) => {
    expect(docToText(textToDoc(t))).toBe(t);
  });

  test("문단 전용 문서는 textToDoc(docToText(doc)) === doc", () => {
    const doc = textToDoc("가\n\n나다\n라");
    expect(textToDoc(docToText(doc))).toEqual(doc);
  });
});
