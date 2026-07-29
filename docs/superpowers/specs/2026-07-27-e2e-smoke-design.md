# E2E 스모크 — 설계 스펙 (설계 승인 2026-07-27 / 문서화 2026-07-29)

## 0. 이 문서의 지위

2026-07-27에 **승인된 설계**(`docs/HANDOVER.md` §승인된 E2E 설계)를 구현 가능한 스펙으로
옮긴 것이다. **설계 재논의는 없다.** 다만 승인 이후 실측에서 드러난 **차단성 사실 1건**이
있어 §2에 근거와 함께 최소 변경으로 반영했다 — 설계 의도(하니스 라우트 + 2겹 프로덕션
차단)는 그대로다.

작업 단위 ①(CI 테스트 게이트)·②(deploy.yml 정리)는 `09624d6`으로 완료됐다. 이 스펙은
남은 **③ 하니스 라우트**와 **④ Playwright 스모크**를 다룬다.

## 1. 목적

**jsdom이 구조적으로 못 잡는 렌더 회귀를 자동으로 잡는다.** 가정이 아니라 실제로 두 번
당했다:

- **2026-07-27 표 격자 실종** — `resizable: true` 경로에서 prosemirror-tables가 nodeView를
  등록하며 `HTMLAttributes`를 넘기지 않아 라이브 `<table>`에 `class="tbl"`이 안 붙었다.
  직렬화(`getHTML()`)에는 정상적으로 붙어 **515개 테스트가 초록인 채 화면만 깨져 있었다.**
- **2026-07-23 상단 툴바 세로 붕괴 / 핸들 메뉴 크래시** — flex 레이아웃 계산과 실제 이벤트
  상호작용은 jsdom에 없다.

두 사건의 공통점은 **"저장본은 멀쩡한데 화면이 깨졌다"**이다. 이 스모크는 그 틈만 노린다.

## 2. 승인 설계 대비 변경 1건 — 하니스 라우트 경로 (실측 근거)

**승인 설계의 `app/__harness/editor/page.tsx`는 라우트를 만들지 않는다.**

Next.js는 밑줄로 시작하는 폴더를 **private folder**로 보고 라우팅에서 제외한다:

> Private folders can be created by prefixing a folder with an underscore: `_folderName`
> This indicates the folder is a private implementation detail and should not be considered
> by the routing system, thereby **opting the folder and all its subfolders** out of routing.
>
> — `node_modules/next/dist/docs/01-app/01-getting-started/02-project-structure.md:257-261`

즉 플래그를 켜도 `/__harness/editor`는 404고, 5개 테스트 전부 "하니스 없음"으로 실패한다.

**변경:** 경로를 `app/e2e-harness/editor/page.e2e.tsx`로 한다(밑줄 없음 → 정상 라우팅).
마커 상수 이름 `__MN_E2E_HARNESS__`는 그대로 둔다 — 상수 이름의 밑줄은 라우팅과 무관하다.

### 2.1 부수 효과 — 승인 설계의 "번들 유출 부재" 요구가 실제로 만족된다

승인 설계는 차단을 2겹으로 요구했다: (a) 런타임 `notFound()`, (b) **플래그 없는 프로덕션
빌드 산출물에 마커 부재**. 그런데 **런타임 `notFound()`만으로는 (b)를 만족할 수 없다** —
`page.tsx`가 클라이언트 컴포넌트를 정적 import 하는 한 청크는 빌드 그래프에 남는다.

그래서 확장자 게이트(`pageExtensions`)를 **빌드 타임 차단**으로 쓴다. 2026-07-29 실측:

| 조건 | 라우트 | `.next/static`의 마커 |
|---|---|---|
| `NEXT_PUBLIC_E2E=1 npm run build` | `○ /e2e-harness/editor` **생성됨** | `chunks/…js`에 **존재** |
| `npm run build` (플래그 없음) | **없음**(라우트 목록에서 부재) | **부재** |

`next.config.ts`:

```ts
const e2e = process.env.NEXT_PUBLIC_E2E === "1";
// pageExtensions: 다중 세그먼트 확장자("e2e.tsx")가 실제로 인식됨을 위 표로 실측 확인.
pageExtensions: ["tsx", "ts", "jsx", "js", ...(e2e ? ["e2e.tsx"] : [])],
```

**주의(실측에서 걸린 것):** 하니스 페이지는 반드시 `"use client"`여야 한다. 서버 컴포넌트로
두면 `onDocChange` 함수 prop 때문에 빌드가 실패한다
(`Error: Event handlers cannot be passed to Client Component props`).

## 3. 전제 실측 (2026-07-29, 전부 코드 확인)

| 항목 | 실측 | 위치 |
|---|---|---|
| `PostEditor` props | `{ initialDoc, placeholder, onDocChange }` **뿐** — Supabase·auth·라우터 의존 0 | `components/editor/PostEditor.tsx` |
| 에디터 DOM 클래스 | `class="detail-content"`, `aria-label="본문"` (Tiptap `editorProps.attributes`) | `PostEditor.tsx:64` |
| 실제 글 상세 래퍼 | **`.detail-page`** — 승인 설계 문구의 `.detail-content`는 에디터 자신의 클래스이지 래퍼가 아니다 | `PostDetailClient.tsx:51`, `globals.css:472` |
| 인증 가드 | `AppShell`이 `(app)` 그룹 레이아웃에서만 적용 → 그룹 **바깥**이면 안 탐 | `app/(app)/layout.tsx`, `AppShell.tsx:42-49` |
| 루트 레이아웃 | `globals.css` import + Theme/Auth/App Provider — 하니스도 **동일 CSS 컨텍스트**를 얻는다 | `app/layout.tsx` |
| Supabase 미설정 내성 | `isSupabaseConfigured` 플래그로 지연 생성 → env 없어도 모듈 평가 시 크래시 없음 | `lib/supabase.ts` |
| 표 삽입 기본값 | `insertTable({ rows: 3, cols: 3, withHeaderRow: true })` → `th`×3 + `td`×6 | `TopToolbar.tsx:347`, `insert.ts:78` |
| 표 격자 CSS | `.tbl td, .tbl th { border: 1px solid var(--border-default); height: 34px; }` | `globals.css:1057-1059` |
| 토큰 해석 | `--border-default` → `--gray-200` → `#e2e3e5` = `rgb(226, 227, 229)` / `--surface-subtle` → `--gray-50` → `#f7f8f9` = `rgb(247, 248, 249)` | `globals.css:11,14,53,60` |
| 색 팝오버 닫힘 | 스와치 클릭 시 래퍼 `onClick`이 `setColorOpen(null)` → 닫힘. 버튼에 `aria-expanded` 반영 | `TopToolbar.tsx:219,228-230` |
| 팔레트 빨강(글자) | `#e5484d` = `rgb(229, 72, 77)` | `lib/editor/palette.ts:14` |

**결론: 별도 목킹 레이어 불필요.** 하니스는 `PostEditor`를 그대로 마운트하면 된다.

## 4. 작업 단위 ③ — 하니스 라우트 + 프로덕션 차단(2겹)

### 4.1 파일

`app/e2e-harness/editor/page.e2e.tsx`

```tsx
"use client";
// 2겹 차단 중 런타임 겹. 빌드 타임 겹은 next.config.ts의 pageExtensions.
```

- 마커: 래퍼에 `data-harness="__MN_E2E_HARNESS__"`. 번들 grep 대상이므로 **클라이언트
  컴포넌트 안의 문자열 리터럴**이어야 한다.
- 초기 문서: 빈 문서(`{ type: "doc", content: [] }`) + placeholder. `onDocChange`는 no-op.

### 4.1.1 원칙 — 하니스는 `.detail-page`의 실제 자식 구성을 따른다

**형제 요소를 생략하지 않는다.** 에디터만 `.detail-page`에 담는 것으로는 부족하다 —
2026-07-23 툴바 세로 붕괴가 **레이아웃 컨텍스트 버그**였고, 형제 생략은 정확히 그 유형의
사각지대를 만든다. 구체적으로 `.top-toolbar-sticky`는 `position: sticky; top: 0`
(`globals.css:1095-1096`)이라 **앞선 형제들의 높이가 스티키 동작에 직접 관여한다.**
`.detail-cover` 하나만 해도 `height: 200px`(`globals.css:493`)이다.

따라서 하니스는 `.detail-page`의 **자식 목록과 순서를 그대로 재현**한다. 다만 스토어·라우터·
네트워크에 의존하는 자식은 **같은 클래스·같은 박스 구조의 정적 대역**으로 둔다 — 레이아웃에
기여하는 것은 박스이지 동작이 아니고, 하니스의 "의존 0" 성질(§3)을 잃으면 안 되기 때문이다.

| 순서 | 자식 | 실제 구현의 의존 | 하니스 처리 |
|---|---|---|---|
| 1 | `.detail-breadcrumb` | `router` + `app.posts`(조상 체인) | **정적 대역** — 같은 클래스로 마크업만(`__root`·`__sep`·`__current`·`__spacer`·`.detail-delete-btn`), 핸들러 없음 |
| 2 | `<PostCover>` (`.detail-cover`) | 없음. 단 **외부 이미지 fetch** | **정적 대역** — `<div className="detail-cover" aria-hidden="true" />`. 실컴포넌트를 쓰면 랜덤 고양이 이미지 네트워크가 flaky 요인이 된다. 박스(200px)는 CSS에서 동일하게 나온다 |
| 3 | `<PageIconButton>` | **props 전용**(`icon`, `onChange`) | **실컴포넌트** — `icon={null}`, `onChange` no-op |
| 4 | `.detail-title` (`<input>`) | `app.updatePost` | **실마크업** — 같은 클래스, 고정 문자열 `value` + no-op `onChange` |
| 5 | `.detail-meta` | `formatDate(post.createdAt)` | **실마크업** — 같은 클래스·같은 자식 구조(`Calendar` 아이콘 · 날짜 · `__dot` · "자동 저장됨"). 날짜는 **고정 문자열**(실시간 값은 비결정성) |
| 6 | `<PostEditor>` | **props 전용** | **실컴포넌트** — 스모크의 주 대상 |
| 7 | `<CharCount>` | **props 전용**(`text`) | **실컴포넌트** — 고정 `text` |

정적 대역을 쓴 곳(1·2)은 **마크업이 원본에서 갈라질 수 있다**는 한계를 남긴다. §8 리스크에
명시한다.

### 4.2 차단 2겹

| 겹 | 메커니즘 | 막는 상황 |
|---|---|---|
| 빌드 타임 | `pageExtensions`에서 `e2e.tsx` 제외 | 플래그 없는 빌드(= Vercel 프로덕션·CI)에 **파일 자체가 안 들어감** |
| 런타임 | `process.env.NEXT_PUBLIC_E2E !== "1"`이면 `notFound()` | 플래그를 켠 채 만든 빌드가 어쩌다 배포되는 경우 |

### 4.3 검증 2겹

- **(a) 유닛** — 플래그 없을 때 `notFound()`가 호출되는지. `next/navigation`의 `notFound`를
  목킹해 호출 여부를 단언한다. 기존 vitest 스위트에 추가(64파일 → 65파일).
- **(b) 번들 유출** — `scripts/verify-harness-excluded.mjs`:
  1. 플래그 **없이** `next build`
  2. `.next/static` 전체에서 `__MN_E2E_HARNESS__` grep → **0건**이어야 통과
  3. 빌드 라우트 목록에 `/e2e-harness/editor` **부재** 확인
  - 로컬에서 그대로 재현 가능해야 한다(`node scripts/verify-harness-excluded.mjs`).
  - §2.1 표가 이 스크립트가 통과할 것임을 이미 실증한다.

## 5. 작업 단위 ④ — Playwright 스모크

### 5.1 구성

- `@playwright/test`, **chromium 단일**.
- `playwright.config.ts`: `webServer`로 `NEXT_PUBLIC_E2E=1 npm run dev`,
  `reuseExistingServer: !process.env.CI`.
- `package.json`: `"test:e2e": "playwright test"`.
- `.gitignore`: `test-results/`, `playwright-report/`.
- 스펙 위치: `e2e/` (vitest의 `__tests__/`와 분리 — `npm test`가 Playwright 스펙을 집어삼키지
  않게 한다. vitest include 패턴 확인 필요).

### 5.2 전역 그물 — `pageerror`

**모든 테스트에 공통 적용.** 픽스처에서 `page.on("pageerror", …)`로 수집하고, 테스트 종료
시 **1건이라도 있으면 실패**시킨다. 2026-07-23 `lockDragHandle` 크래시를 잡는 장치다.

### 5.3 테스트 5종

모든 테스트는 `/e2e-harness/editor` 진입 → `.detail-content` 마운트 대기로 시작한다.

| # | 테스트 | 조작 | 단언 | jsdom이 못 잡는 이유 |
|---|---|---|---|---|
| 1 | **표 격자** | 상단 툴바 `[aria-label="표 삽입"]` 클릭 | ① `.detail-content table`에 **`tbl` 클래스 존재**(회귀 지점 직격) ② 첫 `td` computed: `border-top` = `1px` / `solid` / `rgb(226, 227, 229)` ③ `td` 높이 ≥ 34px ④ `th` `background-color` = `rgb(247, 248, 249)` | `var()` 실해석 불가 |
| 2 | **툴바 두 줄 이하** | 없음(초기 렌더) | `.top-toolbar` 내 모든 `button`의 `boundingBox().y` 최대−최소 ≤ 임계, 툴바 자체 높이 ≤ 임계 | flex 레이아웃 계산 불가 |
| 3 | **핸들 메뉴** | 본문에 텍스트 입력 → 블록 hover → `.handle-btn` 클릭 → `.handle-menu[role="menu"]` 등장 → "복제" 클릭 | 메뉴 등장, 블록 수 +1, **pageerror 0** | 실제 이벤트·플러그인 상호작용 |
| 4 | **색 팝오버** | 텍스트 입력·전체 선택 → `[aria-label="글자색"]` 클릭 → `.clr-pop` 등장 → `[aria-label="빨강"]` 클릭 | ① 팝오버 boundingBox가 뷰포트 안 ② 적용 후 해당 텍스트 computed `color` = `rgb(229, 72, 77)` ③ 닫힘(`.clr-pop` 부재 + 버튼 `aria-expanded="false"`) | 정적 CSS 배치(`top: calc(100% + 6px)`, globals.css:1123) 실좌표 — jsdom은 레이아웃을 계산하지 않는다(floating-ui는 이 팝오버와 무관 — 수동 div, BubbleMenu 아님) |
| 5 | **표 플로팅 툴바** | 표 삽입 → 셀 클릭 → `.tbl-toolbar[role="toolbar"]` 등장 → `[aria-label="행 아래 삽입"]` 클릭 | ① 툴바 boundingBox가 뷰포트 안 ② `tr` 수 +1 | floating-ui(`@tiptap/extension-bubble-menu`의 `computePosition`) 실좌표 — 마찬가지로 jsdom이 계산하지 않는다(4행과 달리 이쪽은 실제로 floating-ui를 쓴다) |

**임계값(#2)에 대한 정직한 메모 (리뷰에서 공란 유지 승인):** 현재 상한 숫자를 확정하지
않는다. 추측 임계는 상시 flaky이거나 아무것도 안 잡는다. 구현 시 정상 상태를 먼저 실측하고
"실측값 + 여유"로 고정한다.

> **역기입 의무:** 확정한 즉시 **이 절에 측정치와 근거를 되적는다** — 측정한 값(버튼 y좌표
> 분포·툴바 높이), 채택한 상한, 여유를 그 폭으로 정한 이유. DoD 항목(§9-3)이다. 되적지
> 않으면 다음 사람에게는 근거 없는 매직 넘버로 남는다.

> **확정(구현 시 실측, 2026-07-29):** `/e2e-harness/editor`, 뷰포트 1280×720(Desktop
> Chrome 기본값)에서 버튼 17개, y 최소 467.5 / 최대 502.5 / 차이 35px, 버튼 높이
> 30px(전 버튼 동일), 툴바 높이 79px.
>
> **오늘의 기준선은 "한 줄"이 아니라 "두 줄"이다 — 브리프의 "정상 상태는 spread ~0"
> 가정은 실측과 어긋난다.** `.top-toolbar`는 `flex-wrap: wrap`이고(globals.css:1099),
> 담긴 `.detail-page`는 `max-width: 760px` + 좌우 padding 28px → 내부 704px
> (globals.css:472) — 프로덕션 글 상세(`PostDetailClient.tsx`)도 같은 클래스를 쓰므로
> 하니스만의 인공물이 아니라 **현재 프로덕션 레이아웃 그대로**다. 버튼 17개 + select 2개
> + 구분선 5개가 704px에 다 안 들어가, 실행취소·다시 실행 2개가 항상 둘째 줄로
> 내려간다(버튼 15개는 y=467.5, 나머지 2개는 y=502.5). jsdom은 flex를 계산하지 않아
> 기존 65파일/523 테스트로는 이 상태를 볼 수 없었다 — 이번 E2E 스모크 #2 실측이 첫
> 발견 경로다.
>
> **결정(사용자 승인):** 제품 레이아웃(`TopToolbar.tsx`/`globals.css`)은 이번 범위에서
> 건드리지 않는다. 대신 **오늘의 2줄 상태를 기준선으로 삼아** 테스트를 정직하게
> 개명했다 — "한 줄" 대신 `"상단 툴바가 두 줄을 넘지 않는다"`(`e2e/toolbar-layout.spec.ts`).
> 이 테스트가 막는 것은 오늘 존재하는 부분 줄바꿈이 아니라 **2026-07-23식 전면
> 붕괴**(`display:flex` 유실 → 버튼 대부분이 각자 줄을 차지)다. 부분 줄바꿈 자체는
> 별도 제품 UX 개선 후보로 `docs/BACKLOG.md`에 기록했다.
>
> 채택: `MAX_Y_SPREAD = 45`(오늘 2줄 실측 35px는 통과시키고, 3줄이 되면 버튼 한 줄이
> 통째로 더 내려가 65px+가 되므로 그 사이에 상한을 둔다 — 전면 붕괴 시 스프레드는
> 버튼 17개가 대부분 개별 줄을 차지해 ~480px까지 뛰므로 45와는 여유가 크다),
> `MAX_TOOLBAR_HEIGHT = 110`(오늘 2줄 실측 79px는 통과시키고, 3줄이면 대략
> 79 + 30(버튼 높이) = 109px+이므로 그 바로 위에 상한을 둔다 — 전면 붕괴 시 높이는
> ~500px까지 뛴다). 두 상수 모두 "오늘 통과 / 한 줄 더 늘면 차단 / 전면 붕괴는
> 확실히 차단"을 동시에 만족하도록 실측값 사이에 잡았다 — 근거는
> `.superpowers/sdd/2026-07-29-e2e-smoke/task-5-report.md`에 원시 출력과 함께 남아 있다.

## 6. CI 통합

승인 설계의 리스크 항목("Playwright 브라우저 다운로드로 CI +1~2분,
`actions/cache` 완화")이 CI 편입을 전제한다. `.github/workflows/ci.yml`의 `verify` 잡에
스텝 추가:

- `npx playwright install --with-deps chromium` (+ `~/.cache/ms-playwright` 캐시)
- `npm run test:e2e` — **빌드 스텝 뒤**에 둔다(빠른 게이트 먼저).
- `NEXT_PUBLIC_E2E: "1"`. Supabase env는 `lib/supabase.ts`가 미설정에 내성이 있으므로
  하니스에 필수는 아니지만, 기존 빌드 스텝과 동일하게 `vars.*`를 넘겨 실환경과 맞춘다.
- **(b) 번들 유출 검증**도 CI 스텝으로 넣는다 — 로컬에서만 도는 검증은 결국 안 돈다.

## 7. 명시적 비목표 (YAGNI — 승인 설계 그대로)

- **픽셀 스크린샷 베이스라인 미도입.** macOS 로컬 ↔ Linux CI 렌더 차이로 상시 flaky →
  CI를 다시 무시하게 되어 방금 고친 병(상시 빨간불)을 재발시킨다.
- **데이터 흐름 검증 범위 밖** — 저장·새로고침 유지 등은 BACKLOG.
- **다중 브라우저·모바일 뷰포트 미도입.**

## 8. 리스크

| 리스크 | 완화 | 잔여 |
|---|---|---|
| 하니스 마크업이 실제 화면과 어긋나 **거짓 안심** | `.detail-page` 자식 구성 전체 재현(§4.1.1) + 동일 루트 레이아웃/CSS 재사용 | 남는다. 특히 **정적 대역인 `.detail-breadcrumb`·`.detail-cover`는 원본이 바뀌어도 따라가지 않는다** — 실제 경로 검증은 Supabase 목킹 도입 시 가능(BACKLOG) |
| CI 시간 +1~2분 | `actions/cache`로 브라우저 캐시, chromium 단일 | 소폭 증가 |
| Playwright 스펙을 vitest가 수집 | `e2e/` 분리 + vitest include 확인 | — |
| #2 임계값 flaky | 실측 기반 확정(§5.3 메모) | — |

## 9. 완료 정의 (DoD)

1. `npm test` — 기존 520 + 하니스 유닛(§4.3a) 전부 통과.
2. `node scripts/verify-harness-excluded.mjs` — 마커 0건 + 라우트 부재.
3. `npm run test:e2e` — 5/5 통과, pageerror 0. **테스트 #2의 임계값을 실측으로 확정하고,
   측정치·채택값·여유 근거를 §5.3에 역기입 완료.**
4. 위 3종이 **CI에서도** 초록.
5. 프로덕션(`ium.ai.kr`)에서 `/e2e-harness/editor` **404** 실측.

## 10. 이 스펙의 다음 단계

리뷰 통과 시 → 구현 계획(`superpowers:writing-plans`) → 구현.

---

## 부록 — 미해결 이월 1건

`0c61008` 직후 전체 실행에서 **원인 미상 1건 실패**가 있었고 이름을 확보하지 못했다. 이후
13회 연속 재현되지 않았다(2026-07-29 오늘 실행도 520/520 통과). **다시 보이면 이름부터
확보한다.**
