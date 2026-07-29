import { test as base, expect, type Page } from "@playwright/test";

/**
 * 전역 그물 — 모든 테스트에 자동 적용되는 pageerror 수집기.
 *
 * `auto: true`라 테스트가 이 픽스처를 요청하지 않아도 켜진다. 테스트 본문이 끝난 뒤
 * 미처리 예외가 1건이라도 있으면 실패시킨다. 2026-07-23 lockDragHandle 크래시처럼
 * "화면은 그려졌는데 콘솔에서 죽는" 회귀를 잡는 장치다.
 */
export const test = base.extend<{ pageErrors: Error[] }>({
  pageErrors: [
    async ({ page }, use) => {
      const errors: Error[] = [];
      page.on("pageerror", (err) => errors.push(err));
      await use(errors);
      expect(
        errors.map((e) => e.message),
        "페이지에서 미처리 예외가 발생했다"
      ).toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

/** 하니스를 열고 에디터가 마운트될 때까지 기다린다. 모든 스모크의 시작점. */
export async function openHarness(page: Page): Promise<void> {
  await page.goto("/e2e-harness/editor");
  await page.locator(".detail-content").waitFor({ state: "visible" });
}
