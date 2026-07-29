import { expect, openHarness, test } from "./fixtures";

/**
 * 색 팝오버 — 열기 → 스와치 클릭 → 적용 → 닫기까지 실제로 조작한다(검증 규칙 1).
 * `.top-toolbar__popover`는 floating-ui가 아니라 정적 CSS(top: calc(100% + 6px),
 * globals.css:1123)로 배치된다 — floating-ui는 이 컴포넌트와 무관하다(BubbleMenu가
 * 아닌 수동 div). jsdom은 레이아웃을 아예 계산하지 않으므로, 이 CSS 오프셋이 실제
 * 화면 안에 들어오는지는 진짜 브라우저에서만 확인된다.
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

  // 뷰포트 안에 있는가 — 정적 CSS 배치(top: calc(100% + 6px))의 실좌표는 jsdom이
  // 계산하지 않는다.
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
  // span[style*="color"]는 background-color도 부분 매칭해 모호하므로, 입력한
  // 텍스트 자체를 앵커로 잡는다(실측: 이 텍스트는 <p> 안에 <span> 하나뿐이라
  // getByText가 정확히 그 <span>을 잡는다 — 상위 <p>가 아니다).
  const colored = page.getByText("색 대상 텍스트", { exact: true });
  await expect(colored).toHaveCSS("color", "rgb(229, 72, 77)");

  // 닫힘
  await expect(popover).toBeHidden();
  await expect(colorButton).toHaveAttribute("aria-expanded", "false");
});
