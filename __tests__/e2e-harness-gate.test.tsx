import { afterEach, expect, test, vi } from "vitest";

/**
 * 하니스 라우트의 런타임 차단 겹 검증.
 *
 * 차단은 2겹이다 — 빌드 타임(next.config.ts의 pageExtensions가 page.e2e.tsx를 아예
 * 제외)과 런타임(여기서 보는 notFound()). 빌드 타임 겹은 유닛 테스트로 볼 수 없으므로
 * scripts/verify-harness-excluded.mjs가 담당한다.
 */
const notFoundMock = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ notFound: notFoundMock }));

// 페이지가 process.env를 함수 본문에서 읽으므로 모듈 재import 없이 stub만으로 충분하다.
import Page from "@/app/e2e-harness/editor/page.e2e";

afterEach(() => {
  notFoundMock.mockClear();
  vi.unstubAllEnvs();
});

test("NEXT_PUBLIC_E2E가 없으면 notFound()로 차단한다", () => {
  vi.stubEnv("NEXT_PUBLIC_E2E", "");
  Page();
  expect(notFoundMock).toHaveBeenCalledTimes(1);
});

test("NEXT_PUBLIC_E2E가 '1'이 아닌 값이어도 차단한다", () => {
  vi.stubEnv("NEXT_PUBLIC_E2E", "true");
  Page();
  expect(notFoundMock).toHaveBeenCalledTimes(1);
});

test("NEXT_PUBLIC_E2E가 '1'이면 통과한다", () => {
  vi.stubEnv("NEXT_PUBLIC_E2E", "1");
  Page();
  expect(notFoundMock).not.toHaveBeenCalled();
});
