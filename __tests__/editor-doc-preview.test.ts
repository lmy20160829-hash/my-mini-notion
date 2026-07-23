import { describe, expect, test } from "vitest";
import { docToPreview, textToDoc, type EditorDoc } from "@/lib/editor/doc";

// 목록 카드 미리보기 projection(§4.2).
// docToText는 문서 전체를 줄바꿈으로 이어붙이므로 카드에 넣으면 블록들이 한 줄로
// 이어져 지저분해진다. docToPreview는 "내용 있는 첫 블록" 하나만 뽑아 노션처럼
// 첫 줄만 보이게 한다. 말줄임(...) 자체는 CSS(.post-card__preview)가 담당한다.

describe("docToPreview", () => {
  test("블록이 여러 개면 첫 블록의 텍스트만 반환한다", () => {
    const doc: EditorDoc = {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "첫 줄" }] },
        { type: "paragraph", content: [{ type: "text", text: "둘째 줄" }] },
        { type: "paragraph", content: [{ type: "text", text: "셋째 줄" }] },
      ],
    };
    expect(docToPreview(doc)).toBe("첫 줄");
  });

  test("빈 문단으로 시작하면 내용 있는 다음 블록까지 훑는다", () => {
    const doc: EditorDoc = {
      type: "doc",
      content: [
        { type: "paragraph" },
        { type: "paragraph", content: [{ type: "text", text: "회의 준비하기" }] },
        { type: "paragraph", content: [{ type: "text", text: "안건 정리" }] },
      ],
    };
    expect(docToPreview(doc)).toBe("회의 준비하기");
  });

  test("공백만 있는 블록은 내용 없는 것으로 보고 건너뛴다", () => {
    const doc: EditorDoc = {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "   " }] },
        { type: "paragraph", content: [{ type: "text", text: "실제 내용" }] },
      ],
    };
    expect(docToPreview(doc)).toBe("실제 내용");
  });

  test("이미지·구분선이 먼저 오면 건너뛰고 첫 텍스트 블록을 쓴다", () => {
    const doc: EditorDoc = {
      type: "doc",
      content: [
        { type: "image", attrs: { src: "https://example.com/a.png" } },
        { type: "horizontalRule" },
        { type: "paragraph", content: [{ type: "text", text: "사진 설명" }] },
      ],
    };
    expect(docToPreview(doc)).toBe("사진 설명");
  });

  test("중첩 블록(목록·인용)도 첫 블록이면 안쪽 텍스트를 뽑는다", () => {
    const doc: EditorDoc = {
      type: "doc",
      content: [
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "장보기" }],
                },
              ],
            },
          ],
        },
        { type: "paragraph", content: [{ type: "text", text: "뒷 블록" }] },
      ],
    };
    expect(docToPreview(doc)).toBe("장보기");
  });

  test("블록 안의 줄바꿈·연속 공백은 한 칸으로 정규화한다", () => {
    const doc: EditorDoc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "앞" },
            { type: "hardBreak" },
            { type: "text", text: "  뒤  " },
          ],
        },
      ],
    };
    expect(docToPreview(doc)).toBe("앞 뒤");
  });

  test("텍스트 있는 블록이 하나도 없으면 빈 문자열 (표시 문구는 호출부가 정한다)", () => {
    expect(docToPreview({ type: "doc" })).toBe("");
    expect(docToPreview({ type: "doc", content: [{ type: "paragraph" }] })).toBe(
      ""
    );
    expect(
      docToPreview({ type: "doc", content: [{ type: "horizontalRule" }] })
    ).toBe("");
  });

  test("레거시 플레인 텍스트도 textToDoc 경유로 첫 줄만 나온다", () => {
    expect(docToPreview(textToDoc("첫 줄\n둘째 줄"))).toBe("첫 줄");
    expect(docToPreview(textToDoc(""))).toBe("");
  });

  test("아주 긴 첫 블록은 상한(200자)까지만 담는다 — 말줄임은 CSS 담당", () => {
    const long = "가".repeat(500);
    const doc: EditorDoc = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: long }] }],
    };
    expect(docToPreview(doc)).toHaveLength(200);
  });
});
