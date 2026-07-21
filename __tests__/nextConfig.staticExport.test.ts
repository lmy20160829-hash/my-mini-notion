import { afterEach, expect, test, vi } from "vitest";

// 커밋 390cb82에서 Vercel 배포로 전환하며 GitHub Pages용
// `output: "export"`와 `basePath`를 next.config.ts에서 제거했다.
// Vercel은 동적 라우트(/posts/<실제id>)를 자체 런타임으로 서빙하므로
// 정적 export·basePath가 되살아나면 배포 형태가 어긋난다 — 이 테스트가 퇴행을 잠근다.
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

test("어떤 환경에서도 정적 export를 켜지 않는다(Vercel 배포)", async () => {
  expect((await loadConfig("development")).output).toBeUndefined();
  expect((await loadConfig("production")).output).toBeUndefined();
});

test("어떤 환경에서도 basePath를 붙이지 않는다(Vercel 루트 도메인 배포)", async () => {
  expect((await loadConfig("development")).basePath).toBeUndefined();
  expect((await loadConfig("production")).basePath).toBeUndefined();
});
