import { expect, openHarness, test } from "./fixtures";

/**
 * 2026-07-27 회귀 직격 — 표 격자 실종.
 *
 * resizable:true인 표는 renderHTML이 아니라 nodeView(TableView)를 타는데,
 * prosemirror-tables의 columnResizing이 nodeView를 만들 때 HTMLAttributes를 넘기지 않아
 * 라이브 <table>에서 class="tbl"이 통째로 사라졌다. 직렬화(getHTML())에는 붙어 있어서
 * 기존 테스트 515개가 전부 초록인 채 화면만 깨져 있었다.
 *
 * jsdom은 var()를 해석하지 못해 실제 색까지는 볼 수 없다. 여기서는 진짜 브라우저가
 * 계산한 값을 본다.
 */
test("표를 삽입하면 격자 border가 실제로 계산된다", async ({ page }) => {
  await openHarness(page);
  await page.locator(".detail-content").click();
  await page.locator(".top-toolbar").getByRole("button", { name: "표 삽입" }).click();

  const table = page.locator(".detail-content table");
  await expect(table).toBeVisible();

  // 회귀 지점 그 자체 — 라이브 DOM에 클래스가 붙는가.
  await expect(table).toHaveClass(/\btbl\b/);

  // 3x3 + 헤더 행(TopToolbar.tsx:347)
  await expect(table.locator("th")).toHaveCount(3);
  await expect(table.locator("td")).toHaveCount(6);

  const td = table.locator("td").first();
  await expect(td).toHaveCSS("border-top-width", "1px");
  await expect(td).toHaveCSS("border-top-style", "solid");
  await expect(td).toHaveCSS("border-top-color", "rgb(226, 227, 229)");

  // globals.css:1058 의 height: 34px. 내용이 늘면 커질 수 있으므로 하한으로 본다.
  const box = await td.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.height).toBeGreaterThanOrEqual(34);

  // 헤더 배경(--surface-subtle → --gray-50 → #f7f8f9)
  await expect(table.locator("th").first()).toHaveCSS(
    "background-color",
    "rgb(247, 248, 249)"
  );
});
