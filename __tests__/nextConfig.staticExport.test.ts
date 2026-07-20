import { afterEach, expect, test, vi } from "vitest";

// `output: "export"`는 동적 라우트로 들어오는 모든 param이 generateStaticParams()에
// 열거돼 있을 것을 요구한다. 이 앱의 글 ID는 런타임 데이터(Supabase page 행)라
// 빌드 시점에 알 수 없어 placeholder 하나만 열거한다.
// 그 결과 `next dev`에서 /posts/<실제id> 문서 요청이 500으로 거부됐다
// (문서: node_modules/next/dist/docs/01-app/02-guides/static-exports.md §Unsupported Features —
//  "Attempting to use any of these features with `next dev` will result in an error").
//
// 그래서 export는 프로덕션 빌드에서만 켠다. dev는 일반 서버로 동작해 딥링크·새로고침이 살아 있고,
// 정적 배포 산출물은 그대로 유지된다. export 비호환 코드는 CI의 `next build`가 계속 잡는다.
//
// next.config.ts는 모듈 로드 시점에 NODE_ENV를 읽으므로 매번 모듈을 다시 import 한다.
async function loadConfig(nodeEnv: string) {
  vi.stubEnv("NODE_ENV", nodeEnv);
  vi.resetModules();
  return (await import("../next.config")).default;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

test("개발 모드에서는 정적 export를 끈다(딥링크·새로고침 유지)", async () => {
  const config = await loadConfig("development");

  expect(config.output).toBeUndefined();
});

test("프로덕션 빌드에서는 정적 export를 켠다(GitHub Pages 배포용)", async () => {
  const config = await loadConfig("production");

  expect(config.output).toBe("export");
});

test("basePath는 프로덕션에서만 리포지토리 이름을 붙인다", async () => {
  expect((await loadConfig("development")).basePath).toBeUndefined();
  expect((await loadConfig("production")).basePath).toBe("/mini-notion-next");
});
