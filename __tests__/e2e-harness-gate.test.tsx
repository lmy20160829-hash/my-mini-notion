import { afterEach, expect, test, vi } from "vitest";

/**
 * 하니스 라우트의 런타임 차단 검증.
 *
 * 번들 유출을 막는 건 빌드 타임 겹(next.config.ts의 pageExtensions가 page.e2e.tsx를
 * 아예 제외) 하나다 — 빌드 타임 겹은 유닛 테스트로 볼 수 없으므로
 * scripts/verify-harness-excluded.mjs가 담당한다.
 *
 * 여기서 보는 런타임 notFound()는 원래 NEXT_PUBLIC_E2E만 봤지만, 그 검사는 플래그를
 * 켠 채 만든 빌드에서는 죽은 코드였다(NEXT_PUBLIC_*는 빌드 타임 인라인이라 — 자세한
 * 사실관계는 page.e2e.tsx 주석, 2026-07-30 최종 브랜치 리뷰에서 발견). 그래서 이 검사는
 * 플래그와 무관한 NODE_ENV==="production"도 함께 본다 — 아래 테스트가 그 조합을 잠근다.
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

test("NEXT_PUBLIC_E2E가 '1'이어도 NODE_ENV가 production이면 notFound()로 차단한다", () => {
  // 이게 이번 수정의 핵심 케이스다 — 플래그를 켠 채 만든 빌드가 프로덕션에 배포되는
  // 경우를 원래 코드는 못 막았다(NEXT_PUBLIC_E2E가 빌드 타임에 "1"로 굳어 검사가
  // 죽은 코드가 되므로). NODE_ENV는 그 변수와 무관한 별도 입력이라 여기서는 살아 있다.
  vi.stubEnv("NEXT_PUBLIC_E2E", "1");
  vi.stubEnv("NODE_ENV", "production");
  Page();
  expect(notFoundMock).toHaveBeenCalledTimes(1);
});

test("NEXT_PUBLIC_E2E가 '1'이고 NODE_ENV가 production이 아니면 통과한다(dev 경로 유지)", () => {
  vi.stubEnv("NEXT_PUBLIC_E2E", "1");
  vi.stubEnv("NODE_ENV", "development");
  Page();
  expect(notFoundMock).not.toHaveBeenCalled();
});
