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
  // line은 스트리밍 로그를 CI 콘솔에 남기려고 고른 것(그대로 유지). 다만 line 단독으로는
  // playwright-report/ 를 만들지 않아, 실패 시 ci.yml의 업로드 스텝이 아무것도 못 올린다.
  // html을 병행해 실제로 디렉터리가 생기게 하고, open: "never"로 러너에서 브라우저를
  // 띄우려는 시도를 막는다. html 리포트는 트레이스(retain-on-failure)까지 품으므로
  // 아티팩트 하나로 진단이 끝난다.
  reporter: process.env.CI ? [["line"], ["html", { open: "never" }]] : "list",
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
