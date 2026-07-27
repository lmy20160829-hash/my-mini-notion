# 세션 인수인계 (2026-07-27 마감 — 스프린트 머지·배포 완료, E2E 스펙 착수 직전)

## 한 줄 요약

문서 작업 스프린트(표·상단 툴바·색/정렬)가 **육안 전 항목 통과 → main 머지 → ium.ai.kr 배포
완료**됐다. CI에 테스트 게이트를 신설했다. 다음 작업은 **④ E2E 스모크 스펙 작성**이며 설계는
이미 승인됐다(아래 §승인된 E2E 설계).

## 오늘 한 일

### 1. 표 격자 실종 버그 — 근본 수정 (`0c61008`)

표를 삽입해도 셀 경계선이 전혀 보이지 않던 문제. **어제의 `@media` 건과 다른 버그**였다.

- CSS(`globals.css:1057-1061`)는 처음부터 정상 — 최상위 depth, 중괄호 345/345 균형,
  `--border-default` 정의됨, `td`/`th`를 건드리는 경쟁 규칙 0건. 그래서 "CSS 파일이 올바른가"
  방향으로는 원인이 안 보였다.
- 진짜 원인은 **렌더 경로**다. `resizable: true`면 Tiptap의 `addNodeView()`가 null을 반환하고
  (`if (isResizable || !View) return null`), prosemirror-tables의 `columnResizing`이 nodeView를
  대신 등록하는데 — `new View(node, defaultCellMinWidth, view)`로 **HTMLAttributes(4번째 인자)를
  넘기지 않는다**. 그래서 라이브 `<table>`에 `class="tbl"`이 붙지 못하고 `.tbl td, .tbl th`의
  격자 border·헤더 배경·셀 최소 크기가 전부 죽었다(선택자 매칭 0건).
- 직렬화(`renderHTML`)에는 정상적으로 붙어 **저장본은 멀쩡**했다. 기존 표 테스트가 전부
  `getHTML()`만 단언한 탓에 **515개가 초록인 채 화면만 깨져 있었다.**
- 수정: `TableView`를 상속한 `TableViewWithAttributes`로 `{ class: "tbl" }` 주입
  (`lib/editor/table-nodes.ts`). 4번째 인자를 받아 병합하므로 비resizable 경로 속성도 안 잃는다.

### 2. 회귀 방어 테스트 신설 — `__tests__/editor-table-render.test.ts` (5건)

**`getHTML()`이 아니라 `editor.view.dom`(실제 렌더 DOM)을 본다.** 나아가 실제 `globals.css`를
읽어 `var()`를 `:root` 토큰으로 치환해 주입하고, `getComputedStyle`로 border가 **계산되는지**까지
단언한다(jsdom은 리터럴 값 캐스케이드는 계산하지만 `var()`는 해석하지 못한다 — 탐침으로 확인).
수정 전 5건 전부 실패(`borderTopStyle: 'none'`, `height: 'auto'`)를 확인한 뒤 통과시켰다.

### 3. 머지 · 배포 (`0f9d409` → main)

- 육안 체크리스트 **전 항목 통과**(핸들 메뉴 클릭·열 리사이즈·표 조작·색/정렬/툴바 포함).
- `004 → main` **fast-forward** 25커밋, 머지 후 게이트 재실행(520/520 + 빌드) 후 푸시.
- **배포는 Vercel Git 통합**(프로젝트 `my-mini-notion`이 main에 연결, push 시 자동).
- 배포 확인은 추측이 아니라 실측: 배포본 지문 변경(연속 fetch 동일 → 유효 신호) + 청크 교체 +
  **배포 번들에서 수정 코드 직접 확인** —
  `uP.configure({resizable:!0,View:class extends uI{constructor(e,t,n,r={}){super(e,t,n,{class:"tbl",...r})}},…})`
- 배포본 육안도 통과(표·색·정렬·툴바 정상).

### 4. CI 게이트 신설 (`09624d6`)

- `deploy.yml` **삭제** — GH Pages 잔재. `next.config.ts`에서 static export가 제거된 뒤
  `cp out/index.html`에서 상시 실패했다(main push 5회 연속). 배포는 Vercel이 하므로 죽은 경로.
- `ci.yml` 신설 — `npm ci` → `npm test`(520) → `npm run build`.
  **그동안 CI에서 테스트가 한 번도 돌지 않았다**(빌드만 검증).
- 트리거: **모든 브랜치 push** + main PR. 이 저장소는 feature 브랜치에서 작업하고 main으로 FF
  머지하므로 main에만 걸면 이미 머지된 뒤에야 신호가 온다.
- Node **24 LTS**(로컬 v24.18.0과 일치) + `actions/checkout@v7`·`setup-node@v7`.
  deprecation 경고 2겹(실행 Node 20 / 액션 런타임 Node 20) 모두 해소 — 실행 로그·주석 0건 확인.
- `package.json`의 `engines.node`는 **의도적으로 건드리지 않았다** — Vercel이 빌드 Node 선택에
  그 값을 쓰므로, 동작 중인 프로덕션 배포를 흔들 이유가 없다.
- 결과: 실행 이력이 **failure 3연속 → success 2연속**. 이제 CI 빨간불이 진짜 신호다.

### 5. BACKLOG — 포털화 장기 비전 (`0f9d409`)

`ium.ai.kr` 개인 플랫폼 포털화, 미니노션은 `notion.ium.ai.kr` 서브도메인 모듈로 이전(방법 A).
**우선순위는 현 스프린트·상단바 건 이후 논의.** 근거 추가: `lib/supabase.ts`가 persistSession +
PKCE라 세션이 localStorage에 저장되고 localStorage는 오리진 단위 → 지금 설정 그대로 서브도메인을
나누면 각 서브도메인에서 따로 로그인해야 한다. 공유하려면 부모 도메인 쿠키 기반 커스텀 storage
어댑터 + OAuth 리다이렉트·CSRF 재검토가 필요하다.

## 브랜치 상태 (전부 origin과 동기, 워킹트리 clean)

| 브랜치 | 커밋 | 비고 |
|---|---|---|
| `main` = `origin/main` | **`09624d6`** | 스프린트 전체 + CI 게이트. **배포본** |
| `004-supabase-google-login` | `0f9d409` | 스프린트 머지 지점(= main의 조상) |
| `005-ci-test-gate` | `09624d6` | CI 재편 브랜치(= main과 동일) |

검증 기준선: **64파일 / 520 테스트 + 빌드** 통과. 로컬·CI 양쪽에서 동일하게 초록.

## 다음 작업 순서

1. **④ E2E 스모크 스펙 작성** — `docs/superpowers/specs/2026-07-27-e2e-smoke-design.md`.
   설계는 아래 §승인된 E2E 설계 그대로. **설계 재논의 불필요 — 스펙 문서화부터 시작.**
2. **스펙 리뷰**(사용자) → 통과 시 **구현 계획**(writing-plans) → 구현.
3. 그다음 후보: 상단바 건, 그 이후 포털화 논의(BACKLOG).

## 승인된 E2E 설계 (2026-07-27 승인 — 재논의 불필요)

**목적:** jsdom이 못 잡는 렌더 회귀를 자동으로 잡는다. 오늘의 격자 실종과 어제의 툴바 세로
붕괴가 바로 그 범주였다.

**실현성 핵심:** `PostEditor`의 props는 `{ initialDoc, placeholder, onDocChange }` **뿐**이다 —
Supabase·auth·라우터 의존 0. 하니스는 그대로 마운트하면 되고, `(app)` 그룹 **바깥**에 두면
`AppShell`의 인증 가드(`AppShell.tsx:44`)도 안 탄다. 별도 목킹 레이어 불필요.

**작업 단위 (①②는 완료됨):**
- ~~① CI 테스트 게이트~~ ✅ `09624d6`
- ~~② deploy.yml 정리~~ ✅ `09624d6`
- **③ 하니스 라우트 + 프로덕션 차단(2겹)** — `app/__harness/editor/page.tsx`,
  `NEXT_PUBLIC_E2E !== "1"`이면 `notFound()`. 실제 글 상세와 **같은 래퍼 마크업·클래스**
  (`.detail-content` 등) 재사용(CSS 컨텍스트가 다르면 엉뚱한 이유로 통과/실패한다).
  검증 2겹: (a) 유닛 — 플래그 없을 때 `notFound()` 호출, (b) **번들 유출** — 플래그 없이
  프로덕션 빌드 후 마커 상수(`__MN_E2E_HARNESS__`)가 `.next/` 클라이언트 산출물에 부재 +
  `/__harness/editor` 404. `scripts/verify-harness-excluded.mjs`로 묶어 로컬 재현 가능하게.
- **④ Playwright 스모크** — chromium 단일, `webServer`로 `NEXT_PUBLIC_E2E=1 npm run dev`,
  명령 `npm run test:e2e`. **전역 그물: 모든 테스트에 `page.on("pageerror")` 수집 → 1건이라도
  있으면 실패**(어제의 `lockDragHandle` 크래시를 잡는 장치).

| # | 테스트 | jsdom이 왜 못 잡나 | 대응 버그 |
|---|---|---|---|
| 1 | 표 삽입 → `td` computed `1px solid rgb(226,227,229)`, `th` 배경, height 34px | `var()` 실해석 | 오늘 격자 실종 |
| 2 | 상단 툴바 버튼들의 `boundingBox().y`가 한 줄 + 높이 임계 이하 | flex 레이아웃 계산 불가 | 어제 세로 붕괴 |
| 3 | 핸들 hover → 클릭 → 메뉴 항목 클릭 (pageerror 0) | 실제 이벤트·플러그인 상호작용 | 어제 핸들 크래시 |
| 4 | 색 팝오버 열기→스와치 클릭→적용→닫기, 뷰포트 안 위치 | floating-ui 실좌표 | — |
| 5 | 셀 클릭 → 표 플로팅 툴바 등장, 뷰포트 안 | 동일 | — |

**명시적 비목표(YAGNI):** 픽셀 스크린샷 베이스라인 미도입(macOS 로컬 ↔ Linux CI 렌더 차이로
상시 flaky → CI를 다시 무시하게 되어 방금 고친 병을 재발시킨다). 저장·새로고침 유지 등 데이터
흐름 검증은 범위 밖(BACKLOG). 다중 브라우저·모바일 뷰포트 미도입.

**리스크:** Playwright 브라우저 다운로드로 CI +1~2분(`actions/cache` 완화). 하니스 마크업이
실제 화면과 어긋나면 거짓 안심을 줄 수 있음 — 래퍼 클래스 재사용으로 방어하되 한계는 남는다
(실제 경로 검증은 Supabase 목킹 도입 시 가능, BACKLOG).

## 검증 규칙 (누적 — 오늘 1건 추가)

> **1. 모든 팝오버·메뉴·드롭다운은 "열기 → 항목 클릭 → 닫기"까지 실제로 조작해 확인한다.**
> 렌더 확인 ≠ 동작 확인. (2026-07-23 교훈 — 핸들 메뉴를 열지 않아 크래시를 배포까지 통과시킴)

> **2. 에디터 시각 회귀는 직렬화(`getHTML()`)가 아니라 렌더된 DOM(`editor.view.dom`)으로
> 검증한다.** nodeView를 타는 노드는 두 경로의 출력이 다르다 — 오늘 표 격자가 정확히 그 틈으로
> 빠졌고, 515개 테스트가 초록인 채 화면만 깨져 있었다. 새 노드에 nodeView·`HTMLAttributes`를
> 쓴다면 라이브 DOM 단언을 함께 넣는다. (DESIGN.md §2.15 "렌더 경로가 둘"에도 명문화)

## 이월 / BACKLOG (`docs/BACKLOG.md`)

- **DragHandle base 확장 등록 근본 수정** — 이번에도 옵셔널 방어만(`deb2279`).
- **globals.css 중괄호 균형 검증 관행** — CSS 추가 태스크 검증에 `{`/`}` 대조 포함.
- **에디터 후속 개선 4건** — 표 셀 BubbleMenu 겹침 · 링크 미니입력 중복 · 색 팝오버 ESC/외부클릭 ·
  슬래시 셀 컨텍스트(전부 무해, 최종 리뷰 Minor).
- **ium.ai.kr 포털화**(신규, 장기 비전) · 셀 병합·@멘션·레이아웃·버전이력 · Security Advisor 경고 3건.
- ~~`deploy.yml` GH Pages 잔재~~ ✅ 해소(`09624d6`).

## 미해결 — 재현 안 된 이상 1건 (정직한 기록)

`0c61008` 수정 직후 **첫 전체 실행에서 원인 미상 1건이 실패**했다. 이후 동일 실행 9회 + 순서
셔플(`--sequence.shuffle`) 4회, 총 13회 연속 520/520으로 재현되지 않았고, 실패한 테스트 이름은
출력 꼬리만 남겨 놓쳤다. 내 변경과 무관한 간헐 실패일 가능성이 높지만 **확인되지 않았다.**
다시 보이면 이름부터 확보할 것.
