import { afterEach, expect, test, vi } from "vitest";

// Vercel 전환(2026-07-21) 후의 설정 계약을 지킨다.
//
// 이전(GitHub Pages)에는 프로덕션에서만 `output: "export"` + basePath를 켰지만,
// Vercel은 일반 Next 빌드를 그대로 서빙하므로 둘 다 제거됐다. export가 되살아나면
// 동적 라우트(/posts/[id])의 딥링크가 다시 generateStaticParams 열거 제약에 걸리고,
// basePath가 되살아나면 Vercel 루트 도메인에서 모든 경로가 어긋난다.
//
// next.config.ts는 모듈 로드 시점에 NODE_ENV를 읽을 수 있으므로 매번 다시 import 한다.
async function loadConfig(nodeEnv: string) {
  vi.stubEnv("NODE_ENV", nodeEnv);
  vi.resetModules();
  return (await import("../next.config")).default;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

test("정적 export를 켜지 않는다(Vercel 일반 빌드 — 딥링크·동적 라우트 유지)", async () => {
  expect((await loadConfig("development")).output).toBeUndefined();
  expect((await loadConfig("production")).output).toBeUndefined();
});

test("basePath를 두지 않는다(Vercel 루트 도메인 서빙)", async () => {
  expect((await loadConfig("development")).basePath).toBeUndefined();
  expect((await loadConfig("production")).basePath).toBeUndefined();
});
