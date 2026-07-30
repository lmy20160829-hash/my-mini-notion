import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "vitest";

/**
 * E2E 스펙이 `e2e/fixtures.ts`를 거쳐 `test`를 가져오는지 강제한다.
 *
 * `fixtures.ts`의 `pageErrors` 픽스처는 `auto: true`라 스펙이 요청하지 않아도 켜지고,
 * 테스트 본문이 끝난 뒤 미처리 예외가 1건이라도 있으면 실패시킨다. 그런데 스펙이
 * `@playwright/test`에서 `test`를 직접 가져오면 **그 그물이 조용히 해제된다** —
 * 스펙은 그대로 초록이고 크래시만 안 보이게 된다. 2026-07-23 lockDragHandle 회귀가
 * 정확히 "화면은 그려졌는데 콘솔에서 죽는" 유형이었다.
 *
 * 이 저장소엔 ESLint가 없어 `no-restricted-imports`를 쓸 수 없다. vitest는 CI의 첫
 * 게이트라 여기서 막는 게 가장 이르고 의존성도 늘지 않는다.
 *
 * 타입 전용 임포트(`import type { Page } from "@playwright/test"`)는 런타임에 지워져
 * 그물과 무관하므로 허용한다.
 */
const E2E_DIR = resolve(__dirname, "../e2e");

/** 값 임포트만 잡는다 — `import type ...`은 제외. */
const VALUE_IMPORT_FROM_PLAYWRIGHT =
  /^\s*import\s+(?!type\b)[^;]*?from\s+["']@playwright\/test["']/m;

const specs = readdirSync(E2E_DIR).filter((f) => f.endsWith(".spec.ts"));

/**
 * 목록이 비면 아래 단언들이 하나도 안 돌아 "통과"한다. 디렉터리 이름이나 확장자
 * 관례가 바뀌면 이 가드가 조용히 무력해지므로, 스펙을 실제로 찾았는지 먼저 못박는다.
 */
test("가드가 검사할 E2E 스펙을 실제로 찾는다", () => {
  expect(specs.length, `${E2E_DIR}에서 *.spec.ts를 찾지 못했다`).toBeGreaterThan(0);
});

test.each(specs)("%s는 @playwright/test가 아니라 ./fixtures에서 test를 가져온다", (file) => {
  const src = readFileSync(resolve(E2E_DIR, file), "utf8");

  expect(
    VALUE_IMPORT_FROM_PLAYWRIGHT.test(src),
    `${file}이 @playwright/test에서 값을 직접 가져온다. ` +
      `./fixtures를 거치지 않으면 pageerror 전역 그물이 해제된다.`
  ).toBe(false);

  expect(
    /from\s+["']\.\/fixtures["']/.test(src),
    `${file}이 ./fixtures에서 아무것도 가져오지 않는다. test/expect는 거기서 가져와야 한다.`
  ).toBe(true);
});
