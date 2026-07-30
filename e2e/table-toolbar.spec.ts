import { expect, openHarness, test } from "./fixtures";

/**
 * 표 셀에 커서가 있을 때 뜨는 플로팅 툴바. FormatToolbar의 BubbleMenu 패턴을 재사용하므로
 * 실좌표 배치가 jsdom에서 검증되지 않는다 — 뷰포트 안에 뜨는지와 실제 동작을 함께 본다.
 */
test("셀을 클릭하면 표 툴바가 뜨고 행 삽입이 동작한다", async ({ page }) => {
  await openHarness(page);

  await page.locator(".detail-content").click();
  await page.locator(".top-toolbar").getByRole("button", { name: "표 삽입" }).click();

  const table = page.locator(".detail-content table");
  await expect(table).toBeVisible();
  await expect(table.locator("tr")).toHaveCount(3); // 헤더 1 + 본문 2

  await table.locator("td").first().click();

  const toolbar = page.locator(".tbl-toolbar");
  await expect(toolbar).toBeVisible();

  const box = await toolbar.boundingBox();
  const viewport = page.viewportSize();
  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport!.height);

  await toolbar.getByRole("button", { name: "행 아래 삽입" }).click();
  await expect(table.locator("tr")).toHaveCount(4);
});
