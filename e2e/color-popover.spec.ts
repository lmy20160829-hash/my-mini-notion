import { expect, openHarness, test } from "./fixtures";

/**
 * 색 팝오버 — 열기 → 스와치 클릭 → 적용 → 닫기까지 실제로 조작한다(검증 규칙 1).
 * floating-ui의 실좌표는 jsdom에서 계산되지 않으므로 뷰포트 안에 있는지도 함께 본다.
 */
test("색 팝오버를 열고 스와치를 눌러 글자색이 적용되고 닫힌다", async ({ page }) => {
  await openHarness(page);

  await page.locator(".detail-content").click();
  await page.keyboard.type("색 대상 텍스트");
  await page.keyboard.press("ControlOrMeta+a");

  // 선택 시 뜨는 .fmt-bar와 라벨이 겹칠 수 있어 상단 툴바로 스코프한다.
  const colorButton = page.locator(".top-toolbar").getByRole("button", { name: "글자색" });
  await colorButton.click();

  const popover = page.locator(".clr-pop");
  await expect(popover).toBeVisible();
  await expect(colorButton).toHaveAttribute("aria-expanded", "true");

  // 뷰포트 안에 있는가(floating-ui 실좌표).
  const box = await popover.boundingBox();
  const viewport = page.viewportSize();
  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport!.height);

  await popover.getByRole("button", { name: "빨강" }).click();

  // 적용 — Color 확장은 인라인 style로 직렬화된다(palette.ts:14, #e5484d).
  const colored = page.locator('.detail-content span[style*="color"]').first();
  await expect(colored).toHaveCSS("color", "rgb(229, 72, 77)");

  // 닫힘
  await expect(popover).toBeHidden();
  await expect(colorButton).toHaveAttribute("aria-expanded", "false");
});
