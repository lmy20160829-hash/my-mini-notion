import { expect, openHarness, test } from "./fixtures";

/**
 * 2026-07-23 회귀 직격 — 상단 툴바 세로 붕괴(`e109c2f`, reduced-motion `@media` 닫는 `}`
 * 누락으로 `display:flex`가 통째로 미디어쿼리 안에 갇혀, 버튼 17개가 각자 줄을 차지했다).
 *
 * flex 레이아웃 계산은 jsdom에 없다. 여기서는 진짜 브라우저가 배치한 좌표를 본다.
 *
 * **오늘의 healthy 기준선은 "한 줄"이 아니라 "두 줄"이다.** `.top-toolbar`는
 * `flex-wrap: wrap`이고(globals.css:1099-1101), 담긴 컨테이너 `.detail-page`는
 * `max-width: 760px`(padding 좌우 28px → 내부 704px, globals.css:472) — 프로덕션
 * 글 상세도 동일 클래스를 쓴다(PostDetailClient.tsx). 버튼 17개 + select 2개 +
 * 구분선 5개가 704px에 다 안 들어가 실행취소·다시 실행 2개가 둘째 줄로 내려간다
 * (실측: 버튼 15개 y=467.5, 나머지 2개 y=502.5 — §5.3 역기입 참고).
 *
 * 이 테스트가 막는 것은 **그 부분 줄바꿈이 아니라 전면 붕괴**다 — display:flex가
 * 다시 유실되면 17개 버튼이 거의 전부 자기 줄을 차지해 y 스프레드·툴바 높이가
 * 오늘 값의 몇 배로 뛴다. 두 줄(오늘)과 세 줄 이상(악화)을 가르는 지점에 상한을 둔다.
 * 부분 줄바꿈 자체(실행취소·다시실행이 둘째 줄인 것)는 제품 이슈로 별도
 * `docs/BACKLOG.md`에 남겼다 — 이번 스모크의 범위는 아니다.
 *
 * 임계값 근거는 스펙 §5.3에 역기입돼 있다(실측값 + 여유).
 */
const MAX_Y_SPREAD = 45; // 오늘 2줄(35px)은 통과, 3줄(65px+)이면 막는다 — §5.3 역기입 참고
const MAX_TOOLBAR_HEIGHT = 110; // 오늘 2줄(79px)은 통과, 3줄(109px+)이면 막는다 — §5.3 역기입 참고

test("상단 툴바가 두 줄을 넘지 않는다", async ({ page }) => {
  await openHarness(page);

  const toolbar = page.locator(".top-toolbar");
  await expect(toolbar).toBeVisible();

  const buttons = toolbar.locator("button");
  const count = await buttons.count();
  expect(count).toBeGreaterThan(5); // 툴바가 비어 있으면 아래 단언이 무의미해진다

  const ys: number[] = [];
  for (let i = 0; i < count; i++) {
    const box = await buttons.nth(i).boundingBox();
    expect(box, `버튼 ${i}가 보이지 않는다`).not.toBeNull();
    ys.push(box!.y);
  }

  const spread = Math.max(...ys) - Math.min(...ys);
  expect(spread, "툴바 버튼이 세 줄 이상으로 흩어졌다(전면 붕괴 의심)").toBeLessThanOrEqual(
    MAX_Y_SPREAD
  );

  const bar = await toolbar.boundingBox();
  expect(bar).not.toBeNull();
  expect(bar!.height, "툴바 높이가 세 줄 이상 분량으로 늘었다(전면 붕괴 의심)").toBeLessThanOrEqual(
    MAX_TOOLBAR_HEIGHT
  );
});
