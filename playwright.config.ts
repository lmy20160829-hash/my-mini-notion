import { defineConfig, devices } from "@playwright/test";

/**
 * E2E 스모크 설정. chromium 단일 — 다중 브라우저·모바일 뷰포트는 비목표(스펙 §7).
 *
 * retries는 0이다. 재시도는 flaky를 초록으로 덮어 "CI 빨간불 = 진짜 신호"를 다시
 * 망가뜨린다. 이 저장소는 그 병(main push 5회 연속 실패 방치)을 09624d6에서 막 고쳤다.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "line" : "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    // 하니스 라우트는 이 플래그가 "1"일 때만 존재한다(빌드/런타임 2겹 게이트).
    env: { NEXT_PUBLIC_E2E: "1" },
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
