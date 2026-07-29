import { expect, openHarness, test } from "./fixtures";

/**
 * 2026-07-23 회귀 직격 — 핸들 메뉴 클릭 시 크래시.
 *
 * 검증 규칙 1(누적): "모든 팝오버·메뉴·드롭다운은 열기 → 항목 클릭 → 닫기까지 실제로
 * 조작해 확인한다. 렌더 확인 ≠ 동작 확인." 그때 메뉴를 열어보지 않아 크래시를 배포까지
 * 통과시켰다.
 *
 * pageerror 그물(fixtures.ts)이 자동으로 걸려 있어, 조작 중 미처리 예외가 하나라도
 * 나면 이 테스트가 실패한다 — 그것이 이 테스트의 핵심 방어선이다.
 */
test("핸들 메뉴를 열고 항목을 클릭해도 크래시하지 않는다", async ({ page }) => {
  await openHarness(page);

  await page.locator(".detail-content").click();
  await page.keyboard.type("핸들 대상 블록");

  const paragraph = page.locator(".detail-content p").first();
  await expect(paragraph).toContainText("핸들 대상 블록");

  // 핸들은 블록 hover 시에만 나타난다.
  await paragraph.hover();
  const handle = page.locator(".handle-btn");
  await expect(handle).toBeVisible();

  await handle.click();
  const menu = page.locator(".handle-menu");
  await expect(menu).toBeVisible();

  // 열기 → 항목 클릭 → 결과까지 본다.
  await menu.getByText("복제", { exact: true }).click();
  await expect(menu).toBeHidden();
  await expect(page.locator(".detail-content p")).toHaveCount(2);
});
