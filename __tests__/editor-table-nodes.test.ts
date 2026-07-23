import { describe, expect, test } from "vitest";
import { TABLE_NODES } from "@/lib/editor/table-nodes";

describe("TABLE_NODES", () => {
  test("배열을 export한다 (Phase 0: 빈 상태)", () => {
    expect(Array.isArray(TABLE_NODES)).toBe(true);
  });
});
