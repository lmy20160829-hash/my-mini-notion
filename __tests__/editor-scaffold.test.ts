import { describe, expect, test } from "vitest";
import { MARKS } from "@/lib/editor/marks";
import { NODES } from "@/lib/editor/nodes";
import { MEDIA_NODES, mediaEditorProps } from "@/lib/editor/media-nodes";

// P2 사전 스캐폴드 계약 — 워크트리 충돌 원천 차단(오버뷰 스펙 §파일 소유권):
// wt1은 MARKS, wt2는 NODES, wt3은 MEDIA_NODES/mediaEditorProps 에만 확장을 추가하고
// PostEditor 결합부는 아무도 만지지 않는다. 이 테스트는 결합점의 형태를 잠근다.

describe("에디터 확장 스캐폴드", () => {
  test("워크트리별 확장 배열이 존재한다 (분기 시점에는 비어 있음)", () => {
    expect(Array.isArray(MARKS)).toBe(true);
    expect(Array.isArray(NODES)).toBe(true);
    expect(Array.isArray(MEDIA_NODES)).toBe(true);
  });

  test("mediaEditorProps는 객체다 (wt3의 handleDrop/handlePaste 연결점)", () => {
    expect(typeof mediaEditorProps).toBe("object");
    expect(mediaEditorProps).not.toBeNull();
  });
});
