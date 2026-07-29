import { expect, openHarness, test } from "./fixtures";

/**
 * 하니스가 스펙 §4.1.1 원칙("`.detail-page`의 실제 자식 구성을 따른다")을 지키는지 본다.
 * 형제 하나가 조용히 빠지면 레이아웃 컨텍스트가 달라져 나머지 스모크가 거짓 안심을 준다 —
 * 그래서 하니스 자신을 먼저 지킨다.
 */
test("하니스가 뜨고 .detail-page 자식 7종이 모두 있다", async ({ page }) => {
  await openHarness(page);

  const root = page.locator(".detail-page[data-harness]");
  await expect(root).toBeVisible();

  await expect(root.locator(".detail-breadcrumb")).toBeVisible();
  await expect(root.locator(".detail-cover")).toBeAttached();
  await expect(root.locator(".detail-title")).toBeVisible();
  await expect(root.locator(".detail-meta")).toBeVisible();
  await expect(root.locator(".detail-content")).toBeVisible();
  await expect(root.locator(".top-toolbar")).toBeVisible();
});

test("에디터에 입력이 들어간다", async ({ page }) => {
  await openHarness(page);
  await page.locator(".detail-content").click();
  await page.keyboard.type("하니스 입력 확인");
  await expect(page.locator(".detail-content")).toContainText("하니스 입력 확인");
});
