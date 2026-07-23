import { describe, expect, test } from "vitest";
import { MARK_ACTIONS } from "@/lib/editor/useFormatState";

describe("MARK_ACTIONS", () => {
  test("마크 5종(bold/italic/underline/strike/code)을 순서대로 담는다", () => {
    expect(MARK_ACTIONS.map((a) => a.name)).toEqual([
      "bold", "italic", "underline", "strike", "code",
    ]);
  });
});
