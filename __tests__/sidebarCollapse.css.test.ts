import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "vitest";

// 레일 폭·전환 모션은 CSS가 유일한 근거라 jsdom 렌더로는 검증할 수 없다(스타일시트 미로딩).
// 따라서 DESIGN.md와 코드가 어긋나지 않도록 globals.css의 계약을 직접 검증한다.
const css = readFileSync(resolve(__dirname, "../app/globals.css"), "utf8");

function tokenPx(name: string): number {
  const m = css.match(new RegExp(`--${name}\\s*:\\s*(\\d+)px`));
  expect(m, `--${name} 토큰이 정의되어야 한다`).not.toBeNull();
  return Number(m![1]);
}

function ruleBody(selector: string): string {
  const m = css.match(
    new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`)
  );
  expect(m, `${selector} 규칙이 있어야 한다`).not.toBeNull();
  return m![1];
}

// FR-006 / SC-002: 접으면 본문 콘텐츠 영역이 최소 200px 이상 넓어진다.
test("펼침 폭과 레일 폭의 차이가 200px 이상이다 (FR-006/SC-002)", () => {
  const expanded = tokenPx("sidebar-w");
  const rail = tokenPx("sidebar-w-rail");

  expect(expanded).toBe(264); // 기존 사이드바 폭 유지(DESIGN.md §1.6)
  expect(expanded - rail).toBeGreaterThanOrEqual(200);
});

// 사이드바 폭은 토큰으로 구동되며, 접힘 상태에서 레일 폭으로 바뀐다.
test("사이드바가 폭 토큰을 쓰고 is-collapsed에서 레일 폭이 된다 (FR-002)", () => {
  expect(ruleBody(".sidebar")).toMatch(/width:\s*var\(--sidebar-w\)/);
  expect(ruleBody(".sidebar.is-collapsed")).toMatch(
    /width:\s*var\(--sidebar-w-rail\)/
  );
});

// FR-011 / SC-003: 전환은 부드럽고 0.3초 이내에 완료된다. 기존 모션 토큰을 재사용한다.
test("사이드바 폭 전환이 기존 모션 토큰을 쓰고 300ms 이내다 (FR-011/SC-003)", () => {
  const body = ruleBody(".sidebar");
  expect(body).toMatch(/transition:\s*width\s+var\(--dur-normal\)\s+var\(--ease-standard\)/);

  // 토큰 실제 값이 SC-003(0.3초) 예산 안이어야 한다.
  const dur = css.match(/--dur-normal\s*:\s*(\d+)ms/);
  expect(dur).not.toBeNull();
  expect(Number(dur![1])).toBeLessThanOrEqual(300);
});

// DESIGN.md §7 접근성: 모션 축소 설정에서는 폭 전환 애니메이션을 끈다.
test("prefers-reduced-motion에서 사이드바 전환이 꺼진다 (A11y)", () => {
  const block = css.match(
    /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{([\s\S]*?)\n\}/
  );
  expect(block, "reduced-motion 미디어 쿼리가 있어야 한다").not.toBeNull();
  expect(block![1]).toMatch(/\.sidebar\s*\{[^}]*transition:\s*none/);
});
