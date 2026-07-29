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

  // 자식 1·2·3·4·5·7 — EditorHarness.tsx JSX 순서상 .detail-page의 실제 직계 자식(형제)이다.
  // "> ." 직계 셀렉터로 매칭해, 형제 하나가 조용히 사라지는 회귀를 실제로 잡는다.
  await expect(root.locator("> .detail-breadcrumb")).toBeVisible(); // 1. 브레드크럼
  // 2. 커버 — app/globals.css: width:100%; height:200px; background 실박스.
  // aria-hidden="true"는 Playwright의 toBeVisible() 판정(표시 스타일·크기)과 무관하다.
  await expect(root.locator("> .detail-cover")).toBeVisible();
  // 3. PageIconButton 루트(components/icon/PageIconButton.tsx). icon=null이라
  // 내부의 .icon-pick-ghost가 그려지지만, 감싸는 .icon-pick-row 자체가 직계 자식이다.
  await expect(root.locator("> .icon-pick-row")).toBeVisible();
  await expect(root.locator("> .detail-title")).toBeVisible(); // 4. 제목
  await expect(root.locator("> .detail-meta")).toBeVisible(); // 5. 메타
  // 7. CharCount 루트(components/CharCount.tsx) — props 전용 컴포넌트가 그대로 그리는 div.
  await expect(root.locator("> .detail-charcount")).toBeVisible();

  // 6. PostEditor(components/editor/PostEditor.tsx)는 Fragment를 반환하므로 직계 자식이
  // 아니라, 그 안의 TopToolbar(.top-toolbar-sticky > .top-toolbar)와 EditorContent
  // 래퍼(무클래스 div > .detail-content) 아래 "후손"으로 들어간다. 그래서 이 둘만은
  // "> " 직계 셀렉터가 아니라 후손 단언이다 — PostEditor 자체가 그려졌는지 확인하는 용도.
  await expect(root.locator(".detail-content")).toBeVisible();
  await expect(root.locator(".top-toolbar")).toBeVisible();
});

test("에디터에 입력이 들어간다", async ({ page }) => {
  await openHarness(page);
  await page.locator(".detail-content").click();
  await page.keyboard.type("하니스 입력 확인");
  await expect(page.locator(".detail-content")).toContainText("하니스 입력 확인");
});
