# DESIGN.md — 미니 노션 디자인 시스템 완전 명세

> 이 문서는 프로젝트에 구현된 "미니 노션"의 디자인 시스템 전체를 **유실 없이** 담은 복원용 명세다.
> 이 문서 하나만으로 원본 코드를 보지 않고도 지금과 동일한 화면·컴포넌트·색·간격·모션·상호작용을 재현할 수 있도록 작성했다.
>
> **원칙:** 값은 원문 그대로(hex/px/ms), 토큰은 이름·참조·최종값을 함께, 상태·문구·출처를 모두 표기. 요약보다 보존.
>
> **정답 기준:** 실제 구현된 코드(`app/`, `components/`, `lib/`)가 정답이다. `03-reference-design.png`(레퍼런스)와 어긋나는 지점은 각 섹션에 `> 레퍼런스 메모`로 남겼다.

---

## 목차

0. [개요 (Overview)](#0-개요-overview)
1. [파운데이션 / 디자인 토큰 (Foundations)](#1-파운데이션--디자인-토큰-foundations)
2. [컴포넌트 카탈로그 (Primitives)](#2-컴포넌트-카탈로그-primitives)
3. [앱 셸 / 레이아웃 (App Shell)](#3-앱-셸--레이아웃-app-shell)
4. [화면별 명세 (Screens)](#4-화면별-명세-screens)
5. [상호작용 · 동작 명세 (Behavior)](#5-상호작용--동작-명세-behavior)
6. [콘텐츠 / 카피 인벤토리 (Content)](#6-콘텐츠--카피-인벤토리-content)
7. [접근성 · 상태 디테일 (States & A11y)](#7-접근성--상태-디테일-states--a11y)
8. [부록: 커버리지 체크리스트 (Coverage)](#8-부록-커버리지-체크리스트-coverage)

---

## 0. 개요 (Overview)

- **제품 한 줄 설명:** "미니 노션(Mini Notion)" — 개인 업무를 글(페이지) 단위로 기록·편집·삭제하는 담백한 개인 업무 관리 웹 서비스. (출처: `02-prd.md`, `README.md`)
- **디자인 언어 이름:** `ui:bowl` — `globals.css` 상단 주석 "ui:bowl design tokens — ported from the design-system project"에서 명시. 별도 디자인 시스템 프로젝트에서 이식된 토큰 세트다.
- **지향 톤:** Notion 계열의 담백한 **그래파이트(graphite) 뉴트럴 UI**. 흰 배경, 회색 램프 중심, 파랑(`#4e97f0`) 단일 액센트, 얇은 경계선·미세한 그림자·짧은(120ms) 트랜지션으로 조용하고 정돈된 인상.
- **서체:** Pretendard Variable(로컬 가변 폰트) + 시스템 한글/라틴 폴백.
- **아이콘:** `lucide-react` 단일 세트(로그인 구글 로고만 인라인 SVG 예외).

### 디자인 원칙 (레퍼런스·PRD에서 도출)

1. **필요한 것만, 담백하게.** PRD의 "쓰지 않는 기능이 가득한 복잡한 화면"을 피한다는 페인 회피(가치 곡선: 기능 폭↓, 무료·개인화↑)를 그대로 반영 — 화면 요소가 적고 여백이 넉넉하다. (출처: `02-prd.md` §6)
2. **그래파이트 뉴트럴 + 단일 파랑 액센트.** 색은 회색 램프가 지배하고, 강조는 파랑 하나로 한정(`--accent`). 상태색(성공/경고/위험)만 제한적으로 추가.
3. **노션식 상호작용의 축소 재현.** `/page` 슬래시 커맨드, 자동 저장, 사이드바 페이지 리스트 등 익숙한 노션 패턴을 최소 형태로 구현. (출처: PRD A3, §7.2)
4. **콘텐츠 우선 타이포.** 큰 제목(28–34px/700)과 넉넉한 본문 행간(1.75)으로 글쓰기에 집중. 경계선은 얇게(`--border-subtle`), 그림자는 미세하게.
5. **조용한 모션.** 대부분의 트랜지션은 `120ms`(`--dur-fast`) + `cubic-bezier(0.2,0,0.1,1)`. 등장 애니메이션(`mnPop`)만 살짝 튀어오르는 `--ease-out`.

> 레퍼런스 메모: `03-reference-design.png`는 실제로 **다른 제품**(“유아이볼” AI 채팅/메신저 — 상단 워크스페이스 "유아이볼(2)", AI 컴포저 "AI에게 무엇이든 물어보세요.", 대화방 검색 "Cmd+J", 토픽/채팅/앱 섹션, 대시보드 카드, 도넛 차트)을 보여준다. 구현된 "미니 노션"과 제품 자체가 다르다. **공유되는 것**은 `ui:bowl` 디자인 언어(좌측 상단 `ui:bowl` 브랜드칩, 회색 사이드바 + 섹션 헤더 + 카운트(레퍼런스의 별 아이콘은 미니 노션에 없음 — 즐겨찾기 기능 제거), `홈` 항목, 검색 입력 + kbd 힌트, `앱` 섹션의 `캘린더`)뿐이고, 제품 콘텐츠/화면 구성은 코드가 정답이다.

---

## 1. 파운데이션 / 디자인 토큰 (Foundations)

출처: `app/globals.css` `:root {}`. **정의된 CSS 변수 총 76개** 전부를 아래에 열거한다. (Neutral 13 + Blue 8 + Accent 5 + Text 7 + Surface 7 + Border 4 + Accent-surface 5 + Status 3 + Danger-surface 1 + Avatar 2 + Font 2 + Radius 7 + Shadow 5 + Motion 5 + Layout 2 = 76)
`--font-pretendard`는 `:root`가 아니라 `next/font/local`이 `<html>`에 주입하는 변수(→ [1.2](#12-타이포그래피) 참조).

**테마:** `:root`는 **라이트 테마의 값이자 기본값**이다. 다크 테마는 `[data-theme="dark"]` 스코프에서
**시맨틱 토큰만** 재정의한다(→ [1.1.5](#115-다크-테마-data-themedark)). 프리미티브 램프는 두 테마 공통이다.
`:root { color-scheme: light }` / `[data-theme="dark"] { color-scheme: dark }`로 네이티브 스크롤바·폼
컨트롤도 테마를 따른다.

### 1.1 색상 (Color)

#### 1.1.1 Neutral 램프 — graphite (13색) · `globals.css:9-21`

| 토큰 | 최종값(hex) | 비고 / 주요 사용처 |
|---|---|---|
| `--gray-0` | `#ffffff` | 페이지·사이드바·카드 배경, on-inverse |
| `--gray-25` | `#fbfcfc` | (정의만; 코드 내 직접 사용 없음) |
| `--gray-50` | `#f7f8f9` | `--surface-subtle` |
| `--gray-100` | `#f1f2f3` | `--surface-hover`, badge 배경 |
| `--gray-150` | `#ebeced` | `--surface-active`, `--border-subtle` |
| `--gray-200` | `#e2e3e5` | `--border-default`, 스크롤바 thumb |
| `--gray-300` | `#d3d5d8` | `--border-strong`, 스크롤바 색/hover, meta dot |
| `--gray-400` | `#b0b3b8` | `--text-placeholder` |
| `--gray-500` | `#8a8f98` | `--text-muted` |
| `--gray-600` | `#6b7178` | `--text-secondary` |
| `--gray-700` | `#4a4f56` | (정의만; 코드 내 직접 참조 없음 — 램프 완전성용) |
| `--gray-800` | `#2c2f34` | `--text-body` |
| `--gray-900` | `#191919` | `--text-strong`, `--surface-inverse`, brand-chip 배경, 그림자 rgba 기준색(25,25,25) |

#### 1.1.2 Blue — primary (8색) · `globals.css:24-31`

| 토큰 | 최종값(hex) | 비고 / 주요 사용처 |
|---|---|---|
| `--blue-50` | `#eef4fe` | `--accent-soft` (slash tile·empty tile 배경, ::selection) |
| `--blue-100` | `#dbe9fd` | `.avatar` 배경 |
| `--blue-200` | `#bcd6fb` | (정의만; 직접 사용 없음) |
| `--blue-300` | `#93bdf8` | (정의만; 직접 사용 없음) |
| `--blue-400` | `#66a9ff` | (정의만; 직접 사용 없음) |
| `--blue-500` | `#4e97f0` | `--accent`, `--border-focus`, focus 링 rgba(78,151,240) 기준색 |
| `--blue-600` | `#3b82d6` | `--accent-hover`, `--text-link`, `--accent-soft-fg` |
| `--blue-700` | `#2f6bb5` | `--accent-active`, `.avatar` 이니셜 글자색 |

#### 1.1.3 Accent — gold/green/amber/red (5색) · `globals.css:34-38`

| 토큰 | 최종값(hex) | 비고 / 주요 사용처 |
|---|---|---|
| `--gold-300` | `#ffd45e` | (정의만; 직접 사용 없음) |
| `--gold-500` | `#ffbd18` | (정의만; 직접 사용 없음 — 즐겨찾기 제거로 미사용. 램프 완전성용 보존) |
| `--green-500` | `#2eb872` | `--status-success`; "저장되었습니다" 노트 |
| `--amber-500` | `#f5a623` | `--status-warning` (정의만; 직접 사용 없음) |
| `--red-500` | `#f0483e` | `--status-danger`; 삭제 버튼 텍스트, 상단바 알림 점 |

#### 1.1.4 시맨틱 매핑 — Text / Surface / Border / Accent / Status

색 토큰은 다른 토큰을 참조한다. `토큰명 | 참조 | 최종값 | 용도` 형태로 참조 관계와 해석된 값을 모두 표기한다.

**Text** · `globals.css:41-47`

| 토큰 | 참조 | 최종값 | 용도 |
|---|---|---|---|
| `--text-strong` | `var(--gray-900)` | `#191919` | 제목·강조 텍스트 |
| `--text-body` | `var(--gray-800)` | `#2c2f34` | 본문(body 기본색) |
| `--text-secondary` | `var(--gray-600)` | `#6b7178` | 보조 텍스트·서브타이틀 |
| `--text-muted` | `var(--gray-500)` | `#8a8f98` | 흐린 텍스트·아이콘·힌트 |
| `--text-placeholder` | `var(--gray-400)` | `#b0b3b8` | placeholder, 카운트 |
| `--text-on-accent` | `#ffffff`(직접) | `#ffffff` | 파랑 버튼 위 텍스트 |
| `--text-link` | `var(--blue-600)` | `#3b82d6` | 링크(`a`) |

**Surface** · `globals.css:50-56`

| 토큰 | 참조 | 최종값 | 용도 |
|---|---|---|---|
| `--surface-page` | `var(--gray-0)` | `#ffffff` | 페이지/앱 본문 배경 |
| `--surface-sidebar` | `var(--gray-0)` | `#ffffff` | 사이드바 배경 |
| `--surface-card` | `var(--gray-0)` | `#ffffff` | 카드/입력/버튼 배경 |
| `--surface-subtle` | `var(--gray-50)` | `#f7f8f9` | 은은한 배경(검색 인풋·읽기전용·tile·로그인 페이지 배경) |
| `--surface-hover` | `var(--gray-100)` | `#f1f2f3` | hover 배경 |
| `--surface-active` | `var(--gray-150)` | `#ebeced` | active/선택 배경 |
| `--surface-inverse` | `var(--gray-900)` | `#191919` | (정의만; 직접 사용 없음) |

**Border** · `globals.css:59-62`

| 토큰 | 참조 | 최종값 | 용도 |
|---|---|---|---|
| `--border-subtle` | `var(--gray-150)` | `#ebeced` | 얇은 경계선(상단바·사이드바·카드 기본) |
| `--border-default` | `var(--gray-200)` | `#e2e3e5` | 기본 경계선(버튼·인풋·컴포저) |
| `--border-strong` | `var(--gray-300)` | `#d3d5d8` | hover 시 강조 경계선 |
| `--border-focus` | `var(--blue-500)` | `#4e97f0` | 포커스 경계선 |

**Accent 표면** · `globals.css:65-69`

| 토큰 | 참조 | 최종값 | 용도 |
|---|---|---|---|
| `--accent` | `var(--blue-500)` | `#4e97f0` | 파랑 버튼·강조 아이콘·tile 전경 |
| `--accent-hover` | `var(--blue-600)` | `#3b82d6` | 파랑 버튼 hover, 링크 hover |
| `--accent-active` | `var(--blue-700)` | `#2f6bb5` | 파랑 버튼 active |
| `--accent-soft` | `var(--blue-50)` | `#eef4fe` | 연한 파랑 배경(slash tile·empty tile·::selection) |
| `--accent-soft-fg` | `var(--blue-600)` | `#3b82d6` | (정의만; 직접 사용 없음) |

**Status** · `globals.css:72-80`

| 토큰 | 참조 | 최종값 | 용도 |
|---|---|---|---|
| `--status-success` | `var(--green-500)` | `#2eb872` | 저장 완료 노트 |
| `--status-warning` | `var(--amber-500)` | `#f5a623` | (정의만; 직접 사용 없음) |
| `--status-danger` | `var(--red-500)` | `#f0483e` | 삭제 버튼 텍스트 |
| `--danger-soft` | `#fdeae9`(직접) | `#fdeae9` | 위험 액션의 연한 배경(`.detail-delete-btn:hover`) |

**Avatar** — 아바타는 프리미티브(`--blue-100`/`--blue-700`)를 직접 참조했으나, 다크에서 밝은 파랑 칩이
그대로 남는 문제 때문에 시맨틱 토큰으로 승격했다. **라이트 값은 이전과 동일**하다.

| 토큰 | 참조 | 최종값 | 용도 |
|---|---|---|---|
| `--avatar-bg` | `var(--blue-100)` | `#dbe9fd` | `.avatar` 배경 |
| `--avatar-fg` | `var(--blue-700)` | `#2f6bb5` | `.avatar` 이니셜 글자색 |

**토큰이 아닌 하드코딩 색** (원문 그대로 보존)

| 값 | 위치 | 용도 |
|---|---|---|
| `rgba(25, 25, 25, …)` | 라이트 그림자 4종(`--shadow-xs~lg`) | 그림자 기준색(= `--gray-900`) |
| `rgba(0, 0, 0, …)` | 다크 그림자 4종(§1.1.5) | 다크 그림자 기준색 |
| `rgba(78, 151, 240, 0.25 / 0.4)` | `--shadow-focus`(라이트 / 다크) | 포커스 링(= `--blue-500` 25% / 40%) |
| `#EA4335` / `#4285F4` / `#FBBC05` / `#34A853` | `app/login/page.tsx` `GoogleLogo` SVG | 구글 로고 4색(브랜드 고정 — 테마 무관) |

> **다크 모드 도입 시 토큰화된 항목**(이전에는 하드코딩/프리미티브 직접 참조):
> `.brand-chip` `#fff`→`var(--surface-page)`·`var(--gray-900)`→`var(--surface-inverse)`,
> `.detail-delete-btn:hover` `#fdeae9`→`var(--danger-soft)`,
> `.badge` `var(--gray-100)`→`var(--surface-hover)`,
> `.avatar` `var(--blue-100/700)`→`var(--avatar-bg/fg)`,
> `.detail-meta__dot` `var(--gray-300)`→`var(--border-strong)`,
> `.mn-scroll` `var(--gray-200/300)`→`var(--border-default/strong)`.
> **여섯 항목 모두 라이트 테마에서의 최종 계산값은 이전과 완전히 동일하다**(시각적 변화 없음).

#### 1.1.5 다크 테마 (`[data-theme="dark"]`)

`app/globals.css`의 `[data-theme="dark"]` 스코프. **시맨틱 토큰만** 재정의하고 프리미티브 램프
(`--gray-N`·`--blue-N` 등)는 건드리지 않는다 — 램프의 "graphite 밝기 순서"라는 의미를 보존하기
위해서다. 모든 컴포넌트 규칙이 시맨틱 토큰을 경유하므로 이 블록 하나로 상단바·사이드바·본문·
컨트롤·팝오버가 일관되게 전환된다.

값은 리터럴 hex/rgba로 적는다(램프에 대응값이 없는 중성색이 대부분이라 표기를 통일했다).
대비는 페이지 배경 `#191919` 기준으로 계산한 WCAG 명암비다.

**재정의되는 토큰**

| 토큰 | 라이트 | 다크 | 대비 / 비고 |
|---|---|---|---|
| `--text-strong` | `#191919` | `#ededed` | 15.0:1 — 제목 |
| `--text-body` | `#2c2f34` | `#d4d4d4` | 11.9:1 — 본문 |
| `--text-secondary` | `#6b7178` | `#a6a6a6` | 7.2:1 — 보조 |
| `--text-muted` | `#8a8f98` | `#8a8f98` | 5.4:1 — **라이트와 동일 값 유지** |
| `--text-placeholder` | `#b0b3b8` | `#6b7178` | 3.2:1(카드 위) — 라이트의 2.1:1보다 높음 |
| `--text-link` | `#3b82d6` | `#66a9ff` | 7.3:1 |
| `--surface-page` | `#ffffff` | `#191919` | 페이지/본문 |
| `--surface-sidebar` | `#ffffff` | `#191919` | 사이드바(페이지와 동일) |
| `--surface-card` | `#ffffff` | `#242424` | 카드/입력/버튼(한 단계 밝게) |
| `--surface-subtle` | `#f7f8f9` | `#202020` | 은은한 배경 |
| `--surface-hover` | `#f1f2f3` | `#2a2a2a` | hover |
| `--surface-active` | `#ebeced` | `#333333` | active/선택 |
| `--surface-inverse` | `#191919` | `#ededed` | 반전 표면(`.brand-chip`) |
| `--border-subtle` | `#ebeced` | `#2e2e2e` | 얇은 경계 |
| `--border-default` | `#e2e3e5` | `#3a3a3a` | 기본 경계·스크롤바 thumb |
| `--border-strong` | `#d3d5d8` | `#4d4d4d` | 강조 경계·meta dot·thumb hover |
| `--accent-hover` | `#3b82d6` | `#66a9ff` | 다크에서 밝게 |
| `--accent-soft` | `#eef4fe` | `rgba(78,151,240,0.16)` | 연파랑 배경(다크는 반투명) |
| `--accent-soft-fg` | `#3b82d6` | `#93bdf8` | soft 위 전경 |
| `--danger-soft` | `#fdeae9` | `rgba(240,72,62,0.16)` | 삭제 버튼 hover |
| `--avatar-bg` | `#dbe9fd` | `rgba(78,151,240,0.24)` | 아바타 배경 |
| `--avatar-fg` | `#2f6bb5` | `#93bdf8` | 8.0:1 — 아바타 이니셜 |

**두 테마 공통(재정의하지 않음)**: `--accent`(#4e97f0), `--accent-active`(#2f6bb5),
`--text-on-accent`(#ffffff), `--border-focus`(#4e97f0), `--status-*` 3종, 프리미티브 램프 전체,
타이포·라운드·모션 토큰.
상태색은 다크 배경에서도 대비가 충분해 유지한다 — danger `#f0483e` 4.8:1, success `#2eb872` 6.7:1.
구글 로고 4색은 브랜드 고정색이라 테마 무관.

**다크 그림자** (기하는 라이트와 동일, 기준색만 순수 검정으로 — `rgba(25,25,25,…)`는 어두운 배경에서 보이지 않는다)

| 토큰 | 다크 값 |
|---|---|
| `--shadow-xs` | `0 1px 1px rgba(0, 0, 0, 0.4)` |
| `--shadow-sm` | `0 1px 2px rgba(0, 0, 0, 0.45), 0 1px 3px rgba(0, 0, 0, 0.4)` |
| `--shadow-md` | `0 2px 6px rgba(0, 0, 0, 0.5), 0 4px 12px rgba(0, 0, 0, 0.4)` |
| `--shadow-lg` | `0 8px 24px rgba(0, 0, 0, 0.5), 0 2px 8px rgba(0, 0, 0, 0.4)` |
| `--shadow-focus` | `0 0 0 3px rgba(78, 151, 240, 0.4)` — 어두운 배경에서 25%는 잘 보이지 않아 **40%로 강화** |

**테마 적용·유지 메커니즘** (구현: `lib/theme.tsx`, `app/layout.tsx`)

- 적용 지점: `<html data-theme="light|dark">`. CSS는 이 속성으로만 스코프된다.
- 저장: localStorage 키 `mini-notion-theme`(값 `"light"|"dark"`). 앱 상태 키 `mini-notion-v1`과 분리.
  **사용자가 토글로 명시 선택할 때만 저장**한다(시스템에서 유래한 초기값은 저장하지 않음).
- 초기 해석 `resolveInitialTheme(stored, systemPrefersDark)`: 저장값이 유효하면 그 값(명시 선택
  우선), 아니면 `prefers-color-scheme: dark` → dark, 그 외/판별 불가 → light.
- **FOUC 방지**: `<head>`의 인라인 스크립트가 HTML 파싱 중 동기 실행되어 첫 페인트 전에
  `data-theme`를 확정한다. `<html>`에 `suppressHydrationWarning`을 둔다. `ThemeProvider`의 lazy
  `useState`가 같은 소스를 읽어 초기 상태와 DOM이 항상 일치한다.
  (Next.js 번들 문서 `01-app/02-guides/preventing-flash-before-hydration.md` §Themes 패턴)
- localStorage 접근 실패(시크릿/차단)는 전부 try/catch로 무시 — 저장만 생략되고 세션 내 토글은 동작한다.
- 시스템 설정의 **실시간 변경 추종은 범위 밖**이다(최초 결정 시점에만 참조).

### 1.2 타이포그래피 (Typography)

#### 폰트 패밀리 · `globals.css:83-85`

- `--font-sans`:
  ```
  var(--font-pretendard), -apple-system, BlinkMacSystemFont,
  "Apple SD Gothic Neo", "Malgun Gothic", "Segoe UI", Roboto, sans-serif
  ```
- `--font-mono`:
  ```
  "SFMono-Regular", ui-monospace, "SF Mono", Menlo, Consolas, monospace
  ```
  (사용처: `.slash-menu kbd`)

- `--font-pretendard`: `app/layout.tsx`의 `next/font/local`이 주입.
  - `src: "./fonts/PretendardVariable.woff2"`, `display: "swap"`, `weight: "45 920"`(가변), `variable: "--font-pretendard"`.
  - `<html lang="ko" className={pretendard.variable}>`로 적용. `body { font-family: var(--font-sans) }`.
  - 렌더링: `-webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility;` (`globals.css:180-181`)

#### 타입 스케일 (화면에서 실제 쓰인 값)

`크기 | 굵기 | letter-spacing | line-height | 쓰인 곳`. (line-height 미표기는 상속/기본)

| 크기 | 굵기 | letter-spacing | line-height | 쓰인 곳(클래스) |
|---|---|---|---|---|
| 34px | 700 | -0.02em | 1.25 | `.detail-title` (상세 제목) |
| 28px | 700 | -0.02em | — | `.list-page__title` (내 업무) |
| 26px | 700 | -0.02em | — | `.login-card h1`, `.mypage__title` |
| 16px | 600 | — | — | `.empty-state__title` |
| 15px | 700 | -0.01em | — | `.topbar__title` (미니 노션) |
| 15px | 700 | -0.02em | — | `.login-card .brand-chip`(로그인 변형) |
| 15px | 400 | — | — | `.composer input`(placeholder/입력) |
| 15px | 600 | — | — | `.mypage-avatar-row__name` |
| 15px | 400 | — | 1.75 | `.detail-content` (본문) |
| 14px | 600 | — | — | `.btn`, `.login-google-btn`, `.upload-btn` |
| 14px | 400 | — | 1.6 | `.login-card__desc`, `.field-textarea` |
| 14px | 400 | — | — | `.list-page__subtitle`, `.mypage__subtitle`, `.field-input`, `.field-readonly__value` |
| 14px | 600 | — | — | `.post-card__title`, `.mypage-field label`? (label은 13px, 아래 참조) |
| 14px | 600 | — | — | `.logout-card__title` |
| 13px | 500 | — | — | `.sidebar-item`, `.detail-breadcrumb__current` |
| 13px | 400 | — | — | `.input-sm input`, `.post-card__preview`, `.detail-breadcrumb__root` |
| 13px | 600 | — | — | `.sidebar__profile-name`, `.slash-menu__name`, `.mypage-field label`, `.saved-note`, `.detail-delete-btn` |
| 13px | 400 | — | 1.6 | `.empty-state__desc` |
| 12px | 700 | -0.02em | — | `.brand-chip`(기본, 상단바) |
| 12px | 700 | 0.02em | — | `.sidebar-section__header`, `.list-head__label` |
| 12px | 400 | — | — | `.sidebar-section__empty`(lh 1.5), `.login-card__terms`(lh 1.6), `.composer-hint`, `.post-card__date`, `.detail-meta span`, `.mypage-avatar-row__hint`, `.slash-menu__desc`, `.logout-card__desc` |
| 11px | 600 | — | 1(line-height:1) | `.badge` |
| 11px | 400 | — | — | `.sidebar__profile-sub` |
| 11px | 700 | 0.02em | — | `.slash-menu__group` |
| 11px | 400 | — | — | `.slash-menu kbd`(mono) |

> 주요 값 요약: **본문 색 `--text-body`(#2c2f34)**, **제목 색 `--text-strong`(#191919)**. 큰 제목은 모두 `letter-spacing: -0.02em`, 섹션 라벨류는 `+0.02em`.

### 1.3 라운드 (Radius) · `globals.css:88-94`

| 토큰 | 값 | 주요 사용처 |
|---|---|---|
| `--radius-xs` | `4px` | (정의만; 직접 사용 없음) |
| `--radius-sm` | `6px` | `.icon-btn--sm` |
| `--radius-md` | `8px` | 버튼·아이콘버튼·인풋·사이드바 항목·tile 등 기본 라운드(가장 많이 쓰임) |
| `--radius-lg` | `12px` | 카드·슬래시 메뉴·빈 상태·로그인 카드·마이 카드·로그아웃 카드·post-card |
| `--radius-xl` | `16px` | `.empty-state__tile` |
| `--radius-2xl` | `20px` | `.composer` (입력 바) |
| `--radius-pill` | `999px` | `.badge` |

**하드코딩 라운드:** `.brand-chip 7px`(로그인 변형 9px), `.topbar__bell-dot 50%`, `.avatar 50%`, `.detail-meta__dot 50%`, `.slash-menu kbd 5px`, `.mn-scroll thumb 8px`.

### 1.4 그림자 (Shadow) · `globals.css:97-101` — 원문 그대로

| 토큰 | 값 | 사용처 |
|---|---|---|
| `--shadow-xs` | `0 1px 1px rgba(25, 25, 25, 0.04)` | `.post-card`, `.mypage-card`, `.logout-card` |
| `--shadow-sm` | `0 1px 2px rgba(25, 25, 25, 0.05), 0 1px 3px rgba(25, 25, 25, 0.04)` | `.composer` |
| `--shadow-md` | `0 2px 6px rgba(25, 25, 25, 0.06), 0 4px 12px rgba(25, 25, 25, 0.05)` | `.login-card`, `.post-card:hover` |
| `--shadow-lg` | `0 8px 24px rgba(25, 25, 25, 0.08), 0 2px 8px rgba(25, 25, 25, 0.05)` | `.slash-menu` |
| `--shadow-focus` | `0 0 0 3px rgba(78, 151, 240, 0.25)` | `.input-sm:focus-within`, `.field-input:focus` |

> 다크 테마에서는 5종 모두 재정의된다(기하 동일, 기준색만 순수 검정 / 포커스 링은 40%) → [§1.1.5](#115-다크-테마-data-themedark).

### 1.5 모션 (Motion) · `globals.css:104-108, 506`

| 토큰 | 값 | 비고 |
|---|---|---|
| `--ease-standard` | `cubic-bezier(0.2, 0, 0.1, 1)` | 거의 모든 transition의 easing |
| `--ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | 등장 애니메이션(`mnPop`) easing |
| `--dur-fast` | `120ms` | 대부분의 transition 지속시간 |
| `--dur-normal` | `180ms` | `.detail-cover__img` 로드 페이드인(opacity transition), `.sidebar` 접기/펼치기 폭 전환(§3.3) |
| `--dur-slow` | `260ms` | (정의만; 직접 사용 없음) |

**키프레임** (`globals.css:197`):
```css
@keyframes mnPop {
  from { opacity: 0; transform: translateY(-5px); }
  to   { opacity: 1; transform: none; }
}
```
- 적용: `.slash-menu { animation: mnPop 0.14s var(--ease-out); }`, `.saved-note { animation: mnPop 0.14s var(--ease-out); }` (지속시간 `0.14s` = 140ms, 하드코딩).

**키프레임 2 — `mnShimmer`** (`globals.css:505`): 커버 스켈레톤 로딩 표현(스피너 대체).
```css
@keyframes mnShimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }
```
- 적용: `.detail-cover__skeleton { animation: mnShimmer 1.4s ease-in-out infinite; }`(§2.7.13). `prefers-reduced-motion: reduce`에서는 `animation: none` + 정적 `--surface-hover` 배경(§7).

**transition이 걸린 요소 · 속성:**

| 요소 | transition 속성(모두 `var(--dur-fast) var(--ease-standard)`) |
|---|---|
| `.btn` | background, border-color, **transform** (`:active { transform: scale(0.97) }`) |
| `.icon-btn` | background, color |
| `.input-sm` | border-color, background, box-shadow |
| `.sidebar` | **width** — 예외적으로 `var(--dur-normal) var(--ease-standard)`(180ms). 접기/펼치기 폭 전환(§3.3). reduced-motion에서 `transition: none`(§7) |
| `.sidebar-item` | background, color |
| `.sidebar-section__actions` | opacity |
| `.sidebar__profile` | background |
| `.slash-menu__item` | background |
| `.post-card` | border-color, box-shadow, **transform** (`:hover { transform: translateY(-1px) }`) |
| `.detail-delete-btn` | background |
| `.login-google-btn` | background, border-color |
| `.upload-btn` | background |
| `.field-input` | border-color, box-shadow |

### 1.6 간격 · 레이아웃 (Spacing & Layout)

**주요 컨테이너 폭·높이**

| 영역 | 값 | 출처 |
|---|---|---|
| 사이드바 폭(펼침) | `264px` | 토큰 `--sidebar-w` → `.sidebar { width: var(--sidebar-w) }` |
| 사이드바 폭(접힌 레일) | `56px` | 토큰 `--sidebar-w-rail` → `.sidebar.is-collapsed`(§3.3). 좌우 패딩 8px + 항목 40px |
| 상단바 높이 | `48px` | `.topbar { height: 48px }` |
| 글 목록 컨테이너 | `max-width: 820px` (중앙 정렬) | `.list-page` |
| 글 상세 컨테이너 | `max-width: 760px` | `.detail-page` |
| 마이 페이지 컨테이너 | `max-width: 600px` | `.mypage` |
| 로그인 카드 | `width: 400px; max-width: 100%` | `.login-card` |
| 브레드크럼 현재 항목 | `max-width: 280px` (말줄임) | `.detail-breadcrumb__current` |
| 상세 본문 textarea | `min-height: 340px` | `.detail-content` |
| 자기소개 textarea | `min-height: 96px` (세로 리사이즈 가능) | `.field-textarea` |

**대표 padding / gap**

| 영역 | padding | gap |
|---|---|---|
| `.topbar` | `0 12px 0 14px` | 12px |
| `.sidebar__inner` | `10px 8px` | — |
| `.sidebar__toolbar` | — | 높이 30px(토글 버튼 줄). 펼침 `justify-content: flex-end`, 레일 `center` |
| `.sidebar__scroll` | `padding-right: 4px; margin-right: -4px`(스크롤바 여백 보정) | — |
| `.sidebar__profile` | `10px 12px` | 10px |
| `.list-page` | `36px 28px 72px` | — |
| `.detail-page` | `18px 28px 96px` | — |
| `.mypage` | `40px 28px 80px` | — |
| `.login-card` | `44px 40px 32px` | — |
| `.composer` | `9px 10px 9px 16px` | 10px |
| `.mypage-card` | `28px` | — |
| `.post-card` | `13px 16px` | 14px |
| `.post-list` | — | 8px(카드 간격) |
| `.empty-state` | `56px 24px` | — |
| `.logout-card` | `18px 24px` | 14px |
| `.slash-menu` | `6px` | — |
| `.slash-menu__item` | `8px 10px` | 12px |

**표준 컴포넌트 높이:** 버튼 `34px`, 아이콘버튼 `30px`(sm `24px`), 검색/사이드바 항목 `32px`, 섹션 헤더 `28px`, 배지 `18px`, 로그인 구글 버튼 `46px`, 필드 인풋/읽기전용 `42px`.

### 1.7 아이콘 (Icons)

- **라이브러리:** `lucide-react` (README: "디자인 시스템과 동일한 Lucide 세트"). 예외: 로그인 화면 구글 로고는 인라인 `<svg>`(48×48 viewBox, 표시 18×18).
- **실제 사용된 lucide 아이콘 (27종)** 과 기본 size(px):

| 아이콘 | size | 사용 위치 |
|---|---|---|
| `Bell` | 16 | 상단바 알림(IconButton) |
| `Search` | 16 / 14 | 상단바 검색(16), 사이드바 검색 인풋(14) |
| `CircleHelp` | 16 | 상단바 도움말 |
| `LayoutGrid` | 16 | 상단바 앱 |
| `Menu` | 16 | 상단바 메뉴 |
| `ChevronsUpDown` | 14 | 상단바 워크스페이스 |
| `House` | 16 | 사이드바 "홈" |
| `FileText` | 16 / 18 | 사이드바 글 항목(16), slash tile(18), post-card tile(18) |
| `Plus` | 16 | "새 페이지" 버튼(Button 16), 섹션 액션(IconButton sm 14) |
| `Calendar` | 16 / 14 | 사이드바 "캘린더"(16), 상세 메타(14) |
| `SquareCheck` | 16 | 사이드바 "할 일" |
| `Trash2` | 16 | 사이드바 "휴지통"(16), 상세 삭제(16) |
| `Settings` | 16 | 사이드바 프로필 버튼 |
| `SquarePen` | 18 | 컴포저 아이콘 |
| `ArrowUpDown` | 14 | 목록 정렬(IconButton sm) |
| `ChevronRight` | 16 / 14 | post-card 셰브론(16), 브레드크럼 구분(14) |
| `FilePlus2` | 40 | 빈 상태 tile |
| `ArrowLeft` | 16 | 상세 뒤로(IconButton) |
| `Mail` | 16 | 마이페이지 이메일 필드 |
| `Image`(→`ImageIcon`) | 16 | 마이페이지 "사진 변경" |
| `Check` | 16 | "저장되었습니다" |
| `LogOut` | 16 | 로그아웃 버튼(Button iconLeft) |
| `ImageOff` | 28 | 커버 이미지 실패 폴백(`.detail-cover__fallback`) |
| `Moon` | 16 | 테마 토글 — 라이트 상태(누르면 다크), §2.8 |
| `Sun` | 16 | 테마 토글 — 다크 상태(누르면 라이트), §2.8 |
| `PanelLeftClose` | 16 | 사이드바 토글 — **펼침** 상태(누르면 접힘, IconButton) |
| `PanelLeftOpen` | 16 | 사이드바 토글 — **접힘** 상태(누르면 펼침, IconButton) |

- **기본 size 규칙:** `IconButton` md=16 / sm=14, `Button` iconLeft=16, `SidebarItem` 아이콘=16. 그 외는 각 사용처에서 `size` prop으로 직접 지정(위 표).

---

## 2. 컴포넌트 카탈로그 (Primitives)

`components/ui/*`의 React 프리미티브 7개 + `globals.css`에 정의된 재사용 CSS 조각 전부. 각 항목: 용도 / props / 변형 / 크기 / 해부 / 상태별 스타일 / 예시 마크업.

> 번호 메모: 다크 모드에서 추가된 `ThemeToggle`은 React 프리미티브지만, 기존 `§2.7.x`(CSS 조각)
> 상호 참조를 깨지 않기 위해 [§2.8](#28-themetoggle--componentsuithemetoggletsx)에 둔다.

### 2.1 Button · `components/ui/Button.tsx` + `.btn` (`globals.css:204-212`)

- **용도:** 주요 액션 버튼(파랑/보조).
- **props:** `variant?: "primary" | "secondary"`(기본 `primary`), `iconLeft?: LucideIcon`, `children`, `onClick?`, `type?: "button" | "submit"`(기본 `button`).
- **변형:** `.btn--primary`(파랑), `.btn--secondary`(흰 배경 + 경계선).
- **크기:** 높이 `34px`, padding `0 14px`, font 14/600, gap 7px, radius-md(8px). `iconLeft` 아이콘 size=16. `white-space: nowrap; flex: none`.
- **해부:** `<button class="btn btn--{variant}">` → (옵션)`<IconLeft size={16}/>` + `children`.
- **상태별 스타일:**

| 상태 | primary | secondary |
|---|---|---|
| default | bg `--accent`(#4e97f0), color `--text-on-accent`(#fff) | bg `--surface-card`(#fff), color `--text-body`, border `1px --border-default` |
| hover | bg `--accent-hover`(#3b82d6) | bg `--surface-hover`(#f1f2f3), border-color `--border-strong`(#d3d5d8) |
| active | bg `--accent-active`(#2f6bb5) + `transform: scale(0.97)` | `transform: scale(0.97)` |

- **예시:** `<Button variant="primary" iconLeft={Plus} onClick={...}>새 페이지</Button>` / `<Button variant="secondary" iconLeft={LogOut} onClick={app.logout}>로그아웃</Button>`

### 2.2 IconButton · `components/ui/IconButton.tsx` + `.icon-btn` (`globals.css:220-227`)

- **용도:** 아이콘 전용 정사각 버튼(상단바·정렬·섹션 액션·뒤로).
- **props:** `icon: LucideIcon`, `size?: "sm" | "md"`(기본 `md`), `title?`, `className?`, `ariaExpanded?: boolean`, `ariaControls?: string`, `onClick?`. `title`은 `title` + `aria-label` 둘 다로 매핑.
  - `ariaExpanded`/`ariaControls`: **토글 컨트롤 전용**(접기/펼치기처럼 다른 영역의 펼침 상태를 제어할 때). 각각 `aria-expanded`/`aria-controls`로 그대로 전달되며, 미지정 시 속성이 렌더되지 않는다. 현재 사용처는 사이드바 토글(§3.3) 하나다.
  - `className`: 기본 클래스 뒤에 덧붙는 추가 클래스(선택).
- **변형/크기:** md `30×30`, radius-md, 아이콘 16 / sm `24×24`(`.icon-btn--sm`), radius-sm, 아이콘 14.
- **해부:** `<button type="button" class="icon-btn[ icon-btn--sm][ {className}]" title aria-label [aria-expanded] [aria-controls]><Icon size={16|14}/></button>`
- **상태별 스타일:** default color `--text-muted`(#8a8f98), bg none · hover bg `--surface-hover`, color `--text-secondary`(#6b7178) · active bg `--surface-active`(#ebeced).
- **예시:** `<IconButton icon={Bell} title="알림" />`, `<IconButton icon={ArrowUpDown} size="sm" title="정렬" />`, `<IconButton icon={PanelLeftClose} title="사이드바 접기" ariaExpanded ariaControls="app-sidebar" onClick={app.toggleSidebar} />`

### 2.3 Badge · `components/ui/Badge.tsx` + `.badge` (`globals.css:231-235`)

- **용도:** 개수/라벨 pill.
- **props:** `children`.
- **크기/스타일:** 높이 `18px`, padding `0 7px`, radius-pill(999px), bg `--surface-hover`(라이트 #f1f2f3 = 이전 `--gray-100`과 동일 값), font 11/600, color `--text-secondary`, `line-height: 1`.
  - 다크에서 배경이 `#2a2a2a`로 따라가 `--text-secondary`(#a6a6a6)와 6.4:1 대비를 유지한다(토큰화 이전에는 밝은 회색 배경이 그대로 남아 대비가 무너졌다).
- **상태:** 단일(상태 없음).
- **예시:** `<Badge>{app.posts.length}</Badge>`, `<Badge>Google 계정</Badge>`

### 2.4 Avatar · `components/ui/Avatar.tsx` + `.avatar` (`globals.css:238-243`)

- **용도:** 프로필 아바타(이미지 or 이니셜 폴백).
- **props:** `name: string`, `src?: string | null`, `size?: number`(기본 `28`).
- **동작:** `src`가 있으면 `<img src={src} alt={name}>`, 없으면 `name.charAt(0)`(첫 글자) 표시.
- **크기 계산:** 인라인 style `width/height = size`, `fontSize = Math.round(size * 0.42)`. (예: 28→12px, 72→30px)
- **스타일:** 원형(50%), bg `--avatar-bg`(라이트 #dbe9fd), color `--avatar-fg`(라이트 #2f6bb5), font-weight 600, `overflow: hidden; user-select: none`. `img { width:100%; height:100%; object-fit: cover }`.
  - 다크: bg `rgba(78,151,240,0.24)`, color `#93bdf8`(대비 8.0:1) — 밝은 파랑 칩이 어두운 셸에서 튀지 않게 반투명 처리(§1.1.5). 사진 아바타(`img`)는 원본 그대로 표시된다.
- **예시:** `<Avatar name={profile.displayName} src={profile.avatarUrl} size={28} />`(사이드바), `size={72}`(마이페이지). `profile`은 구글 계정+로컬 오버라이드 병합(`useProfile`).

### 2.5 SidebarItem · `components/ui/SidebarItem.tsx` + `.sidebar-item` (`globals.css:261-271`)

- **용도:** 사이드바 네비 항목(홈·글·앱 메뉴).
- **props:** `icon: LucideIcon`, `label: string`, `active?: boolean`, `onClick?`.
- **해부:** `<button class="sidebar-item[ is-active]" title={label}>` → `.sidebar-item__icon`(Icon 16) + `.sidebar-item__label`(말줄임).
- **툴팁:** `title`은 항상 `label`과 같다. 접힌 레일에서 레이블이 숨겨져도 이름을 확인할 수 있고(§3.3), 펼침 상태에서도 말줄임된 긴 제목을 확인하는 데 쓰인다.
- **크기:** 높이 `32px`, padding `0 10px`, gap 8px, radius-md, font 13/500.
- **레일 변형(`.sidebar.is-collapsed` 하위):** `width: 40px; padding: 0; justify-content: center` — 아이콘만 남고 `__label`은 `display: none`. 높이·radius·상태 스타일은 동일.
- **상태별 스타일:**

| 상태 | 스타일 |
|---|---|
| default | color `--text-secondary`; 아이콘 `--text-muted` |
| hover | bg `--surface-hover` |
| `.is-active` | bg `--surface-active`, color `--text-strong`, font-weight **600**; 아이콘 색 `--text-secondary` |

- **예시:** `<SidebarItem icon={House} label="홈" active={pathname === "/"} onClick={...} />`, `<SidebarItem icon={FileText} label={title||"제목 없음"} active={...} />`

### 2.6 SidebarSection · `components/ui/SidebarSection.tsx` + `.sidebar-section*` (`globals.css:274-283`)

- **용도:** 사이드바 그룹(헤더 + 카운트 + 액션 + 내용/빈 상태).
- **props:** `label: string`, `count?: number`, `actions?: {icon, title, onClick}[]`, `children`.
- **해부:** `.sidebar-section` → `.sidebar-section__header`[ `<span>{label}` + (count 숫자면)`.sidebar-section__count` + (actions 있으면)`.sidebar-section__actions`(IconButton sm 목록) ] + `children`.
- **스타일:**
  - `__header`: 높이 28px, padding `0 10px`, gap 6px, font 12/700, color `--text-muted`, `letter-spacing: 0.02em`, `user-select: none`.
  - `__count`: font-weight 700, color `--text-placeholder`(#b0b3b8).
  - `__actions`: `margin-left: auto`, gap 2px, **기본 `opacity: 0`** → 헤더 hover 또는 `:focus-within` 시 `opacity: 1`.
  - `__empty`: padding `6px 10px`, font 12, color `--text-muted`, line-height 1.5.
- **예시:**
  ```tsx
  <SidebarSection label="내 글" count={app.posts.length}
    actions={[{ icon: Plus, title: "새 페이지", onClick: newPage }]}>
    {navPosts.map(...)}
    {app.posts.length === 0 && <div className="sidebar-section__empty">아직 글이 없어요.</div>}
  </SidebarSection>
  ```

### 2.7 CSS 전용 재사용 조각 (globals.css에 정의)

React 컴포넌트가 없는 인라인 프리미티브. 화면 코드에서 클래스로 직접 사용된다.

#### 2.7.1 검색 인풋 `.input-sm` · `globals.css:246-258`
- 용도: 사이드바 "글 검색". 높이 32px, padding `0 10px`, gap 7px, bg `--surface-subtle`, border `1px --border-subtle`, radius-md, color `--text-muted`.
- 자식 `input`: `flex:1; border:none; outline:none; background:transparent; font 13; color --text-body`.
- 상태: `:focus-within` → bg `--surface-card`, border-color `--border-focus`, box-shadow `--shadow-focus`.
- 마크업: `<div class="input-sm"><Search size={14}/><input placeholder="글 검색"/></div>`

#### 2.7.2 상세 삭제 버튼 `.detail-delete-btn` · `globals.css:475-482`
- 높이 30px, padding `0 12px`, gap 6px, font 13/600, color `--status-danger`(#f0483e), bg none, radius-md. hover bg `--danger-soft`(라이트 #fdeae9 / 다크 `rgba(240,72,62,0.16)`). 아이콘 `Trash2 size={16}` + 텍스트 "삭제".

#### 2.7.3 업로드 버튼 `.upload-btn` · `globals.css:554-561`
- 용도: 마이페이지 "사진 변경"(실제로는 `<label>` + 숨겨진 file input). 높이 34px, padding `0 14px`, gap 7px, bg `--surface-subtle`, radius-md, font 14/600, color `--text-body`. hover bg `--surface-hover`. `svg { color: --text-secondary }`. 아이콘 `ImageIcon size={16}`.

#### 2.7.4 필드 인풋 `.field-input` · `globals.css:566-572`
- 용도: 마이페이지 "별명". 폭 100%, 높이 42px, padding `0 12px`, bg `--surface-card`, border `1px --border-default`, radius-md, font 14, color `--text-body`, `outline:none`.
- 상태: `:focus` → border-color `--border-focus`, box-shadow `--shadow-focus`.

#### 2.7.4b 여러 줄 필드 `.field-textarea` · `globals.css:574-581`
- 용도: 마이페이지 "자기소개"(여러 줄 일반 텍스트). `.field-input`과 같은 토큰을 쓰되 높이·줄바꿈만 다르다.
- 폭 100%, `min-height: 96px`, padding `10px 12px`, bg `--surface-card`, border `1px --border-default`, radius-md, `font-family: inherit`, font 14/1.6, color `--text-body`, `outline:none`, `resize: vertical`, `display:block`.
- 상태: `:focus` → border-color `--border-focus`, box-shadow `--shadow-focus`(`.field-input`과 동일한 포커스 링).
- `font-family: inherit`는 브라우저 기본 textarea 폰트(monospace)를 막아 본문 폰트를 유지하기 위함이다.

#### 2.7.5 읽기전용 필드 `.field-readonly` (+`__value`) · `globals.css:582-587`
- 용도: 마이페이지 "이메일". 높이 42px, padding `0 12px`, gap 8px, bg `--surface-subtle`, border `1px --border-subtle`, radius-md, color `--text-muted`.
- `__value`: `flex:1; font 14; color --text-secondary`. 마크업: `<Mail size={16}/> <span class="field-readonly__value">{email}</span> <Badge>Google 계정</Badge>`.

#### 2.7.6 브랜드칩 `.brand-chip` · `globals.css:298-302` (+ 로그인 변형 360)
- inline-flex, bg `--surface-inverse`, color `--surface-page`, radius `7px`, padding `3px 8px`, font 12/700, `letter-spacing: -0.02em`.
  - 라이트: 어두운 칩 + 흰 글자(#191919 / #ffffff — 토큰화 이전 값과 동일). 다크: 밝은 칩 + 어두운 글자(#ededed / #191919)로 **자동 반전**된다.
- 로그인 변형(`.login-card .brand-chip`): radius `9px`, padding `6px 11px`, font 15, `margin-bottom: 22px`.
- 내용: 텍스트 "mini".

#### 2.7.7 컴포저 `.composer` (+`-wrap`/`__icon`/`-hint`) · `globals.css:383-392`
- `-wrap`: `position: relative; margin: 24px 0 6px`(슬래시 메뉴 앵커).
- `.composer`: flex, gap 10px, bg `--surface-card`, border `1px --border-default`, radius-2xl(20px), shadow-sm, padding `9px 10px 9px 16px`.
- `__icon`: color `--text-muted`(`SquarePen size={18}`). `input`: flex:1, font 15, color `--text-body`.
- `-hint`: margin `0 0 26px`, font 12, color `--text-muted`; `b`는 color `--text-secondary`, weight 600.

#### 2.7.8 슬래시 메뉴 `.slash-menu*` · `globals.css:396-422`
- `.slash-menu`: `position:absolute; top: calc(100% + 6px); left:0; right:0`, bg `--surface-card`, border `1px --border-subtle`, radius-lg, shadow-lg, padding 6px, `z-index: 20`, `animation: mnPop 0.14s var(--ease-out)`.
- `__group`: padding `6px 10px 4px`, font 11/700, color `--text-muted`, `letter-spacing: 0.02em`.
- `__item`: flex, gap 12px, padding `8px 10px`, radius-md, bg none; hover bg `--surface-hover`.
- `__tile`: `34×34`, radius-md, bg `--accent-soft`, color `--accent`.
- `__name`: 13/600 `--text-strong`; `__desc`: 12 `--text-muted`.
- `kbd`: font-mono 11, color `--text-muted`, bg `--surface-subtle`, border `1px --border-subtle`, radius `5px`, padding `2px 7px`.

#### 2.7.9 글 카드 `.post-card*` · `globals.css:429-447`
- `.post-card`: flex, gap 14px, padding `13px 16px`, bg `--surface-card`, border `1px --border-subtle`, radius-lg, shadow-xs, cursor pointer.
  - hover: border-color `--border-default`, box-shadow `--shadow-md`, `transform: translateY(-1px)`.
- `__tile`: `38×38`, radius-md, bg `--surface-subtle`, color `--text-secondary`(`FileText size={18}`).
- `__title`: 14/600 `--text-strong`, 말줄임.
- `__preview`: 13 `--text-muted`, 말줄임, `margin-top: 1px`.
- `__date`: 12 `--text-muted`, `flex:none; white-space:nowrap`.
- `__chevron`: color `--text-muted`(`ChevronRight size={16}`).

#### 2.7.10 빈 상태 `.empty-state*` · `globals.css:449-460`
- `.empty-state`: center, padding `56px 24px`, `border: 1px dashed --border-default`, radius-lg, bg `--surface-subtle`.
- `__tile`: `64×64`, radius-xl, bg `--accent-soft`, color `--accent`, `margin-bottom: 16px`(`FilePlus2 size={40}`).
- `__title`: 16/600 `--text-strong`, `margin-bottom: 6px`.
- `__desc`: 13 `--text-secondary`, line-height 1.6; `b` color `--text-body`.

#### 2.7.11 저장 노트 `.saved-note` · `globals.css:590-594`
- inline-flex, gap 5px, font 13/600, color `--status-success`(#2eb872), `animation: mnPop 0.14s var(--ease-out)`. `Check size={16}` + "저장되었습니다".

#### 2.7.12 로그아웃 카드 `.logout-card*` · `globals.css:596-603`
- flex, gap 14px, `margin-top: 16px`, bg `--surface-card`, border `1px --border-subtle`, radius-lg, shadow-xs, padding `18px 24px`.
- `__title`: 14/600 `--text-strong`; `__desc`: 12 `--text-muted`, `margin-top: 1px`.

#### 2.7.13 스크롤바 `.mn-scroll` · `globals.css:192-195`
- `scrollbar-width: thin; scrollbar-color: var(--border-strong) transparent`.
- webkit: `::-webkit-scrollbar { width/height: 11px }`, thumb bg `--border-default`, `border-radius: 8px`, `border: 3px solid var(--surface-page)`(트랙 여백 효과), thumb:hover bg `--border-strong`.
- 라이트 최종값은 이전(`--gray-200`/`--gray-300`)과 동일하며, 다크에서는 `#3a3a3a`/`#4d4d4d`로 따라가 밝은 thumb가 튀지 않는다. 트랙 테두리는 `--surface-page`라 자동으로 테마를 따른다.
- 사용처: `.sidebar__scroll`, `.app-main`.

#### 2.7.14 글자 수 칩 `.detail-charcount` · `globals.css:531-537`
- 용도: 글 상세 본문(`.detail-content`)의 grapheme 글자 수를 편집 컬럼 우측 하단에 고정 표시. 컴포넌트 `components/CharCount.tsx`(`<CharCount text>`)가 렌더한다.
- 배치: `position: sticky; bottom: 24px; margin-left: auto; width: fit-content` — `.detail-page`(760px 컬럼) 안 `.detail-content` 다음 마지막 자식. `.app-main` 스크롤 시 뷰포트 하단 근처에 유지.
- 스타일: padding `3px 10px`, bg `--surface-card`, border `1px --border-subtle`, radius-pill, shadow-xs, font 12, color `--text-muted`, `user-select: none`.
- 비방해: `pointer-events: none` — 아래 본문 편집/클릭을 막지 않는다(FR-007).
- 내용: 텍스트 `{n}자`(예: `0자`, `128자`). 빈 내용도 숨기지 않고 `0자` 표시.

#### 2.7.15 커버 이미지 `.detail-cover*` · `globals.css:485-516` · `components/PostCover.tsx`
- 용도: 글 상세(`.detail-page`) 제목 입력창 **위** 배너. 오픈 API `https://cataas.com/cat/cute`의 랜덤 고양이 사진. 컴포넌트 `PostCover`가 렌더하며, 부모는 `<PostCover key={post.id} />`로 글별 remount(=열 때마다 새 랜덤)한다.
- 배치: 브레드크럼과 `.detail-title` 사이(§4.3). 장식 요소이므로 컨테이너 `aria-hidden="true"`, 이미지 `alt=""`.
- 상태 3종(모두 동일 박스 점유 → 레이아웃 이동 없음), 상태 식별 훅 `data-cover="skeleton|image|fallback"`:
  - 로딩(스켈레톤) → 표시(이미지) → 또는 실패(중립 폴백). 네이티브 `onError` 즉시, 또는 오류 없이 `10000ms`(`COVER_TIMEOUT_MS`) 초과 시 실패로 전환. loaded/error는 최종 상태(늦은 이벤트로 덮이지 않음). 마운트 시 타이머 1개, 언마운트/확정 시 정리.
- `.detail-cover`(컨테이너): `position: relative; width: 100%; height: 200px; margin: 0 0 20px; border-radius: --radius-lg(12px); overflow: hidden; background: --surface-subtle; box-shadow: --shadow-xs`.
- `.detail-cover__img`: `width/height: 100%; object-fit: cover; display: block`. 기본 `opacity: 0` → 로드 시(`[data-cover="image"]`) `opacity: 1`, `transition: opacity --dur-normal(180ms) --ease-standard`(페이드인).
- `.detail-cover__skeleton`: `position: absolute; inset: 0`. **스피너 아님** — shimmer `linear-gradient(100deg, --surface-subtle 30%, --surface-hover 50%, --surface-subtle 70%)`, `background-size: 200% 100%`, `animation: mnShimmer 1.4s ease-in-out infinite`(§1.5). reduced-motion에서 정적(§7).
- `.detail-cover__fallback`: `position: absolute; inset: 0; display: flex; align-items/justify-content: center`; `background: --surface-subtle; color: --text-placeholder`. 중앙 아이콘 `<ImageOff size={28}>`(lucide) — 깨진 이미지 대신 커버 공간 보존.

### 2.8 ThemeToggle · `components/ui/ThemeToggle.tsx`

- **용도:** 상단바 **가로 정중앙**의 라이트/다크 테마 토글. 앱 셸에만 렌더된다(로그인 화면에는 없음).
- **props:** 없음. `useTheme()`(`lib/theme.tsx`)에서 `theme`·`toggle`을 직접 읽는다.
- **해부:** 신규 스타일 없이 기존 `.icon-btn`(§2.2) 프리미티브를 그대로 재사용한다.
  `<button type="button" class="icon-btn" title aria-label aria-pressed><Icon size={16}/></button>`
- **아이콘(lucide, size 16):** "누르면 일어날 동작"을 예고한다.

| 현재 테마 | 아이콘 | `aria-label` / `title` | `aria-pressed` |
|---|---|---|---|
| `light` | `Moon` | `다크 모드로 전환` | `false` |
| `dark` | `Sun` | `라이트 모드로 전환` | `true` |

- **상태별 스타일:** `.icon-btn`과 동일 — default color `--text-muted`, hover bg `--surface-hover` +
  color `--text-secondary`, active bg `--surface-active`. 두 테마 모두 토큰이 따라가므로 별도 규칙 없음.
- **배치:** 상단바에서 `.topbar__theme` 래퍼가 절대 중앙 배치를 담당한다(→ §3.2). 컴포넌트 자신은
  위치를 모른다(재사용 가능).
- **접근성:** 네이티브 `<button>` — 키보드 포커스와 Enter/Space가 기본 동작한다.
- **예시:** `<div className="topbar__theme"><ThemeToggle /></div>`

---

## 3. 앱 셸 / 레이아웃 (App Shell)

출처: `components/AppShell.tsx` + `.app-root/.topbar/.app-body/.sidebar/.app-main` (`globals.css:288-345`). 라우트 그룹 `app/(app)/layout.tsx`가 `<AppShell>`로 모든 앱 화면을 감싼다.

### 3.1 전체 골격

```
.app-root (height:100vh, column, overflow:hidden)
├── header.topbar (height:48px, position:relative)
│   └── .topbar__theme → <ThemeToggle/> (가로 정중앙, 절대 배치)
└── .app-body (flex:1, row, min-height:0)
    ├── nav#app-sidebar.sidebar (width:264px / 접힘 56px)
    │   ├── .sidebar__inner (padding:10px 8px)
    │   │   ├── .sidebar__toolbar → IconButton 접기/펼치기 토글 (양 상태 공통)
    │   │   ├── SidebarItem "홈"
    │   │   ├── spacer 8px            ┐
    │   │   ├── .input-sm (검색 "글 검색")│ 펼침 전용
    │   │   ├── spacer 12px
    │   │   └── .sidebar__scroll.mn-scroll
    │   │       ├── SidebarSection "내 글" (count, +액션)   ┐ 펼침 전용
    │   │       ├── spacer 10px                            ┘
    │   │       └── 펼침: SidebarSection "앱" (캘린더/할 일/휴지통)
    │   │           접힘: SidebarItem 캘린더/할 일/휴지통 (섹션 헤더 없이 아이콘만)
    │   └── button.sidebar__profile (하단 고정, border-top; 접힘 시 아바타만)
    └── main.app-main.mn-scroll → {children}
```

- `.app-root`: `height:100vh; display:flex; flex-direction:column; overflow:hidden; background:--surface-page`.
- `.app-body`: `flex:1; display:flex; min-height:0`.
- `.app-main`: `flex:1; min-width:0; height:100%; overflow-y:auto; background:--surface-page`.

### 3.2 상단바 (`.topbar`)

- 스타일: 높이 48px, **`position: relative`**(중앙 토글의 배치 기준), `display:flex; align-items:center; gap:12px`, padding `0 12px 0 14px`, `border-bottom: 1px --border-subtle`, bg `--surface-page`, `flex:none`.
- **왼→오 순서:**
  1. `.brand-chip` — 텍스트 "mini".
  2. `.topbar__workspace`(flex, gap 5px, cursor pointer, color `--text-muted`): `.topbar__title` "미니 노션"(15/700, `--text-strong`, `-0.01em`) + `ChevronsUpDown size={14}`.
  2.5. **`.topbar__theme` — 테마 토글(§2.8), 가로 정중앙.**
     - `position: absolute; left: 50%; transform: translateX(-50%); display: inline-flex`.
     - 절대 배치라 플렉스 흐름에서 빠져 있어 좌/우 그룹 폭과 무관하게 **진짜 중앙**에 놓이고, 기존
       레이아웃을 밀지 않는다. 마크업 순서상으로는 워크스페이스와 spacer 사이에 둔다.
     - 좁은 화면에서는 좌측 워크스페이스·우측 아이콘 그룹과 겹칠 수 있다(대략 430px 미만).
       현재 앱은 데스크톱 폭 기준이며, 이 경계는 스펙의 알려진 엣지 케이스로 육안 검증 대상이다.
  3. `.topbar__spacer`(flex:1).
  4. `.topbar__bell`(position:relative): `<IconButton icon={Bell} title="알림" />` + `.topbar__bell-dot`.
     - `__bell-dot`: `position:absolute; top:5px; right:6px; 7×7; border-radius:50%; bg --red-500; border:1.5px solid --surface-page; pointer-events:none`.
  5. `<IconButton icon={Search} title="검색" />`
  6. `<IconButton icon={CircleHelp} title="도움말" />`
  7. `<IconButton icon={LayoutGrid} title="앱" />`
  8. `<IconButton icon={Menu} title="메뉴" />`

### 3.3 사이드바 (`.sidebar`)

- 스타일: `width:var(--sidebar-w)(264px); flex:none; height:100%; display:flex; flex-direction:column; border-right:1px --border-subtle; bg --surface-sidebar`.
  - `transition: width var(--dur-normal)(180ms) var(--ease-standard)` — 접기/펼치기 폭 전환(§3.3.1). reduced-motion에서 `none`(§7).
- `id="app-sidebar"` — 토글 버튼의 `aria-controls` 대상.
- `.sidebar__inner`: `flex:1; min-height:0; display:flex; flex-direction:column; padding:10px 8px`.
- `.sidebar__scroll`: `flex:1; min-height:0; overflow-y:auto; margin-right:-4px; padding-right:4px`(+`.mn-scroll`).
- **구성 순서:**
  0. `.sidebar__toolbar` — 접기/펼치기 토글 1개(§3.3.1). 양 상태 공통.
  1. `<SidebarItem icon={House} label="홈" active={pathname === "/"} onClick={()=>router.push("/")} />`
  2. 간격 `<div style={{height:8}} />`
  3. 검색 `.input-sm` — `<Search size={14}/>` + `<input placeholder="글 검색">`(상태 `search`).
  4. 간격 `<div style={{height:12}} />`
  5. `.sidebar__scroll`:
     - `SidebarSection label="내 글" count={app.posts.length}` + 액션 `[{icon:Plus, title:"새 페이지", onClick:newPage}]`.
       - 내용: `navPosts.map(post => <SidebarItem icon={FileText} label={post.title.trim()||"제목 없음"} active={pathname===`/posts/${post.id}`} onClick={()=>router.push(`/posts/${post.id}`)} />)`.
       - `app.posts.length === 0`이면 `<div class="sidebar-section__empty">아직 글이 없어요.</div>`.
     - 간격 `<div style={{height:10}} />`
     - `SidebarSection label="앱"`: `SidebarItem 캘린더(Calendar)`, `할 일(SquareCheck)`, `휴지통(Trash2)` — **onClick 없음(비활성/장식)**.

- **프로필 버튼(`.sidebar__profile`, 하단 고정):**
  - `display:flex; align-items:center; gap:10px; padding:10px 12px; width:100%; text-align:left; border-top:1px --border-subtle; bg transparent; color --text-muted`; hover bg `--surface-hover`.
  - 내용: `<Avatar name={profile.displayName} src={profile.avatarUrl} size={28} />`(구글 계정 기반, `useProfile`) + `.sidebar__profile-body`[`.sidebar__profile-name`(displayName) `<br/>` `.sidebar__profile-sub` "마이 페이지"] + `<Settings size={16} />`.
  - onClick: `router.push("/mypage")`.
  - 접힘 시: `__profile-body`·`Settings`를 렌더하지 않고 아바타만 남긴다. `justify-content:center; padding:10px 0`, 버튼에 `title="마이 페이지"`(툴팁).

#### 3.3.1 접기/펼치기 (Collapse / Rail)

사이드바는 **펼침**과 **접힘(아이콘 레일)** 두 상태를 가진다. 상태값은 스토어의 `sidebarCollapsed`(§5.5), 전환은 `toggleSidebar()`(§5.7).

- **토글 버튼(단 하나, 양 상태 공통):**
  - 위치: `.sidebar__inner`의 첫 줄 `.sidebar__toolbar`(높이 30px). 펼침에서는 우측 정렬, 레일에서는 중앙 정렬.
  - 마크업: `<IconButton icon={collapsed ? PanelLeftOpen : PanelLeftClose} title={collapsed ? "사이드바 펼치기" : "사이드바 접기"} ariaExpanded={!collapsed} ariaControls="app-sidebar" onClick={app.toggleSidebar} />`
  - 아이콘·문구가 현재 상태를 구분한다: 펼침 → `PanelLeftClose` + "사이드바 접기", 접힘 → `PanelLeftOpen` + "사이드바 펼치기".
- **폭:** 펼침 `--sidebar-w`(264px) ↔ 접힘 `--sidebar-w-rail`(56px). 차이 208px만큼 `.app-main`(`flex:1`)이 자동으로 넓어진다.
  - 레일 56px = 좌우 패딩 8px + 항목 폭 40px + 8px.
- **접힘(`.sidebar.is-collapsed`)에서 숨기는 것:** 검색 `.input-sm`, `SidebarSection` 헤더("내 글"·"앱")와 카운트·＋액션, "내 글" 글 목록, 프로필 텍스트. 검색·글 목록·새 페이지는 레일에서 **노출하지 않는다**(쓰려면 먼저 펼친다).
- **접힘에서 남는 것:** 토글, 고정 내비 아이콘(홈 / 캘린더 · 할 일 · 휴지통), 프로필 아바타. 내비 항목의 이동 동작과 활성 표시(`is-active`)는 펼침과 동일하다. 개별 글의 활성 표시는 목록이 없으므로 펼침에서만 나타난다.
- **툴팁:** 레일의 각 항목은 `SidebarItem`의 `title={label}`(§2.5)로 이름을 노출한다.
- **모션:** `width` 180ms `--ease-standard`. 클릭을 연타해도 상태는 boolean 토글이라 중간 상태에 갇히지 않고 마지막 클릭 결과로 수렴한다.
- **범위:** v1은 데스크톱 폭 기준. 모바일·초협폭 오버레이 사이드바는 미구현.

### 3.4 본문 (`.app-main`)

- `<main class="app-main mn-scroll">{children}</main>` — 스크롤 가능한 콘텐츠 영역.

### 3.5 인증 가드 (AppShell 내부)

- `useEffect`: `if (auth.ready && !auth.session) router.replace("/login")` (Supabase 세션 기반).
- 렌더 가드: `if (!auth.ready || !auth.session || !app.loaded) return null;` — 인증 확정 전/비로그인/서버에서 글을 불러오기 전에는 셸 자체를 그리지 않음.
- 사이드바 검색 필터: `q = search.trim().toLowerCase()`; `navPosts = q ? app.posts.filter(p => (p.title||"제목 없음").toLowerCase().includes(q)) : app.posts`.
- `newPage = async () => { const post = await app.createPost(""); if (post) router.push(`/posts/${post.id}`) }`.

---

## 4. 화면별 명세 (Screens)

4개 화면: 로그인 `/login`, 업무 페이지(글 목록) `/`, 글 상세 `/posts/[id]`, 마이 페이지 `/mypage`.

### 4.1 로그인 `/login` · `app/login/page.tsx` + `.login-*`(`globals.css:350-372`)

- **레이아웃:** `.login-page`(min-height:100vh, center, bg `--surface-subtle`(#f7f8f9), padding 24px) 중앙에 `.login-card`.
- **`.login-card`:** `width:400px; max-width:100%; bg --surface-card; border:1px --border-subtle; border-radius:--radius-lg; box-shadow:--shadow-md; padding:44px 40px 32px; text-align:center`.
- **구성(위→아래):**
  1. `.brand-chip` "mini" (로그인 변형: radius 9px, padding 6px 11px, font 15, margin-bottom 22px).
  2. `<h1>` "미니 노션" (26/700, `--text-strong`, -0.02em, margin `0 0 8px`).
  3. `.login-card__desc` (14/1.6, `--text-secondary`, margin `0 0 30px`): "나만의 가벼운 업무 관리 공간." `<br/>` "구글 계정으로 바로 시작하세요."
  4. `.login-google-btn` (width 100%, height 46px, gap 10px, bg `--surface-card`, border 1px `--border-default`, radius-md, 14/600, `--text-body`): `<GoogleLogo/>`(인라인 SVG 4색) + "Google 계정으로 계속하기". hover: bg `--surface-hover`, border-color `--border-strong`.
     - **로딩/비활성**(`:disabled`): `cursor:default; opacity:0.6`, hover 변화 없음. 라벨은 클릭 직후 "연결 중…", OAuth 복귀(code 교환) 중 "로그인 처리 중…".
  5. `.login-error`(오류 있을 때만, 버튼 아래): 13/1.5, `--status-danger`(#f0483e). 인증 오류(설정 누락·동의 취소 등) 문구.
  6. `.login-card__terms` (12/1.6, `--text-muted`, margin `22px 0 0`): "로그인하면 서비스 약관 및 개인정보 처리방침에" `<br/>` "동의하는 것으로 간주됩니다."
- **상호작용(실제 Google OAuth via Supabase):**
  - `handleLogin`: `useAuth().signInWithGoogle()` → Supabase PKCE OAuth로 Google 이동 → 복귀 후 세션 확정 시 `router.replace("/")`.
  - 진입 시 `if (auth.ready && auth.session) router.replace("/")` — 이미 로그인 상태면 워크스페이스로.
- **특수 상태:** 로딩(버튼 비활성 + 라벨 전환), 인라인 에러(`.login-error`). 신규 색·간격 없이 기존 토큰 재사용.

### 4.2 업무 페이지(글 목록) `/` · `app/(app)/page.tsx` + `.list-*`(`globals.css:377-459`)

- **컨테이너:** `.list-page`(max-width 820px, 중앙, padding `36px 28px 72px`).
- **구성(위→아래):**
  1. `<h1 class="list-page__title">` "내 업무" (28/700).
  2. `<p class="list-page__subtitle">` "기록하고 싶은 것을 자유롭게 남겨보세요." (14, `--text-secondary`).
  3. **컴포저** `.composer-wrap > .composer`:
     - `.composer__icon`(`SquarePen size={18}`) + `<input placeholder="/page 를 입력하거나 할 일을 적어보세요">`(상태 `query`) + `<Button variant="primary" iconLeft={Plus} onClick={()=>createPage("")}>새 페이지</Button>`.
  4. **슬래시 메뉴** (`showSlash` = `query.trim().startsWith("/")`일 때만):
     - `.slash-menu`: `.slash-menu__group` "기본 블록" + `.slash-menu__item`(onClick `createPage("")`):
       - `.slash-menu__tile`(`FileText size={18}`) + `.slash-menu__body`[`.slash-menu__name` "페이지" `<br/>` `.slash-menu__desc` "제목과 내용이 있는 새 글을 만듭니다"] + `<kbd>/page</kbd>`.
  5. `<p class="composer-hint">` : "노션처럼 " `<b>/page</b>` " 를 입력하고 Enter를 누르면 새 글이 만들어져요."
  6. **목록 or 빈 상태** (`app.posts.length > 0` 분기):
     - **목록 있을 때:**
       - `.list-head`: `.list-head__label` "전체" + `<Badge>{count}</Badge>` + `.list-head__spacer` + `<IconButton icon={ArrowUpDown} size="sm" title="정렬" />`.
       - `.post-list`(gap 8px): 각 글 `.post-card`(`role="link" tabIndex={0}`, onClick/Enter → 상세):
         - `.post-card__tile`(`FileText size={18}`)
         - `.post-card__body`[`.post-card__title`(=`post.title.trim()||"제목 없음"`) `<br/>` `.post-card__preview`(=`post.content.replace(/\s+/g," ").trim().slice(0,90) || "내용 없음"`)]
         - `.post-card__date`(=`formatDate(post.createdAt)`)
         - `.post-card__chevron`(`ChevronRight size={16}`)
     - **빈 상태(`.empty-state`):**
       - `.empty-state__tile`(`FilePlus2 size={40}`)
       - `.empty-state__title` "첫 글을 만들어 보세요"
       - `.empty-state__desc`: "위 입력창에 " `<b>/page</b>` " 를 입력하고 Enter를 누르거나" `<br/>` "'새 페이지' 버튼을 눌러 시작하세요." (원문에 좌우 홑따옴표 `‘새 페이지’` 사용)
- **상호작용(슬래시 커맨드):** → [§5.1](#51-page-슬래시-커맨드로-새-글-생성) 참조. 글 생성은 서버 왕복이므로 비동기다.

### 4.3 글 상세 `/posts/[id]` · `app/(app)/posts/[id]/page.tsx` + `.detail-*`(`globals.css:464-536`)

- **컨테이너:** `.detail-page`(max-width 760px, 중앙, padding `18px 28px 96px`).
- **구성(위→아래):**
  1. **브레드크럼** `.detail-breadcrumb`(gap 8px, margin-bottom 22px):
     - `<IconButton icon={ArrowLeft} title="뒤로" onClick={()=>router.push("/")} />`
     - `.detail-breadcrumb__root`(13, `--text-muted`, hover `--text-secondary`) "내 업무" (onClick → `/`)
     - `.detail-breadcrumb__sep`(`ChevronRight size={14}`, color `--text-placeholder`)
     - `.detail-breadcrumb__current`(13/500, `--text-secondary`, max-width 280px 말줄임) = `post.title.trim() || "제목 없음"`
     - `.detail-breadcrumb__spacer`(flex:1)
     - `.detail-delete-btn`(`Trash2 size={16}` + "삭제", onClick `handleDelete`)
  2. **커버 이미지** `<PostCover key={post.id} />` → `.detail-cover`(§2.7.13), 브레드크럼과 제목 사이. 랜덤 고양이 사진(cataas). 로딩 시 스켈레톤(스피너 아님) → 이미지, 실패 시 중립 폴백. 장식 요소(`aria-hidden`), 편집 비방해(FR-007).
  3. **제목** `<input class="detail-title" placeholder="제목 없음">` (34/700, -0.02em, lh 1.25, margin-bottom 10px), value=`post.title`, onChange → `updatePost(id,{title})`.
  4. **메타** `.detail-meta`(gap 7px, margin-bottom 22px, color `--text-muted`): `Calendar size={14}` + `<span>{formatDate(post.createdAt)} 작성</span>` + `.detail-meta__dot`(3×3 원, bg `--border-strong` — 라이트 #d3d5d8로 이전과 동일, 다크 #4d4d4d) + `<span>자동 저장됨</span>`.
  5. **본문** `<textarea class="detail-content" placeholder="내용을 입력하세요. 떠오르는 생각, 할 일, 메모를 자유롭게 기록해 보세요.">` (15/1.75, `--text-body`, min-height 340px, `resize:none`), value=`post.content`, onChange → `updatePost(id,{content})`.
  6. **글자 수 칩** `<CharCount text={post.content} />` → `.detail-charcount`(§2.7.12), 본문 다음 마지막 자식. `post.content`만 전달(제목 제외, FR-008), grapheme 수를 우측 하단 sticky로 실시간 표시. 빈 내용 → `0자`.
- **상호작용:**
  - `handleDelete`: `window.confirm("이 글을 삭제할까요? 삭제하면 되돌릴 수 없어요.")` → 확인 시 `deletePost(id)` + `router.push("/")`.
  - 가드: `if (app.loaded && !post) router.replace("/")`(삭제/없는 글). `if (!post) return null`.
  - 제목/내용은 입력 즉시 로컬 반영 + 600ms 디바운스로 서버 저장(§5.2).

### 4.4 마이 페이지 `/mypage` · `app/(app)/mypage/page.tsx` + `.mypage*`(`globals.css:541-602`)

- **컨테이너:** `.mypage`(max-width 600px, 중앙, padding `40px 28px 80px`).
- **구성(위→아래):**
  1. `<h1 class="mypage__title">` "마이 페이지" (26/700).
  2. `<p class="mypage__subtitle">` "서비스에서 사용할 프로필 정보를 관리하세요." (14, `--text-secondary`, margin-bottom 28px).
  3. **프로필 카드** `.mypage-card`(bg card, border 1px `--border-subtle`, radius-lg, shadow-xs, padding 28px):
     - **아바타 행** `.mypage-avatar-row`(gap 18px, padding-bottom 24px, border-bottom 1px `--border-subtle`):
       - `<Avatar name={profile.displayName} src={profile.avatarUrl} size={72} />`
       - `.mypage-avatar-row__body`: `__name` "프로필 이미지"(15/600) + `__hint` "JPG, PNG · 정사각형 이미지를 권장합니다."(12, `--text-muted`) + `.upload-btn`(`<label>`): `ImageIcon size={16}` + "사진 변경" + 숨겨진 `<input type="file" accept="image/*" style={{display:"none"}}>`.
     - **별명 필드** `.mypage-field`(padding `22px 0 4px`): `<label for="nickname">` "별명" + `<input id="nickname" class="field-input" placeholder="사용할 별명을 입력하세요">`(상태 `nickDraft`).
     - **자기소개 필드** `.mypage-field`(padding `22px 0 4px`): `<label for="introduction">` "자기소개" + `<textarea id="introduction" class="field-textarea" maxLength={200} placeholder="자신을 간단히 소개해 보세요">`(상태 `introDraft`). 선택 항목이며 여러 줄(줄바꿈 보존)을 허용한다.
     - **이메일 필드** `.mypage-field.mypage-field--email`(padding `16px 0 24px`): `<label>` "이메일" + `.field-readonly`[`Mail size={16}` + `.field-readonly__value`(=`profile.email`, 실제 구글 이메일) + `<Badge>Google 계정</Badge>`].
     - **푸터** `.mypage-card__footer`(gap 12px, padding-top 20px, border-top 1px `--border-subtle`): `<Button variant="primary" onClick={saveProfile}>변경사항 저장</Button>` + (`saved`일 때)`.saved-note`(`Check size={16}` + "저장되었습니다").
  4. **로그아웃 카드** `.logout-card`(margin-top 16px, padding `18px 24px`): `.logout-card__body`[`__title` "로그아웃" + `__desc` "이 기기에서 계정을 로그아웃합니다."] + `<Button variant="secondary" iconLeft={LogOut} onClick={auth.signOut}>로그아웃</Button>`.
- **상호작용:**
  - 초기: `useEffect(()=>{ if(app.loaded) setNickDraft(profile.displayName) }, [app.loaded])`.
  - 자기소개 초기값: 별명/아바타(localStorage)와 달리 Supabase `profile.introduction`에서 온다 — `useEffect(...,[userId])`에서 `fetchIntroduction(userId)` → `setIntroDraft(introduction ?? "")`. 언마운트 시 `cancelled` 플래그로 늦은 응답 무시.
  - `saveProfile`: `saveNickname(nickDraft)` + `saveIntroduction(userId, introDraft)`(별명과 한 번의 저장으로 함께 반영) → `setSaved(true)` → `setTimeout(()=>setSaved(false), 1800)`(1800ms 후 노트 사라짐). 언마운트 시 타이머 정리.
  - 자기소개 정규화(`normalizeIntroduction`, `lib/profile-sync.ts`): 앞뒤 공백 제거 → 빈 값이면 `null`(제거), 최대 200자(`INTRODUCTION_MAX_LENGTH`)까지만 저장. 가운데 줄바꿈은 보존. 별명(`saveNickname`)과 같은 규칙이다.
  - `onAvatarPick`: 파일 선택 → `FileReader.readAsDataURL` → `app.setAvatar(dataUrl)`(base64로 localStorage 저장).
  - 로그아웃: `auth.signOut()` → Supabase 세션 제거 → (AppShell 가드가) `/login`으로 리다이렉트.

---

## 5. 상호작용 · 동작 명세 (Behavior)

출처: `lib/store.tsx`(상태) + `lib/posts.ts`(Supabase 데이터 접근) + 각 페이지 로직.

> 게시글은 **Supabase `page` 테이블**에 저장된다(localStorage 아님). 소유권·인증 제어는
> 화면뿐 아니라 서버의 RLS 정책(`page_select_own`/`insert`/`update`/`delete_own`)이 강제한다.

### 5.1 `/page` 슬래시 커맨드로 새 글 생성

- 목록 페이지 컴포저 `onQueryKey`(`app/(app)/page.tsx`):
  - `Escape` → `setQuery("")`(닫기).
  - `Enter`(그 외 키는 무시):
    - `q = query.trim()`; 빈 문자열이면 무시.
    - `q.toLowerCase().startsWith("/page")` → `createPage(q.slice(5).trim())`(`/page` 뒤 텍스트를 제목으로).
    - `q.startsWith("/")`(그 외 `/명령`) → **무시(대기)**.
    - 그 외 일반 텍스트 → `createPage(q)`(입력 자체를 제목으로).
  - `showSlash`(=`query.trim().startsWith("/")`)이면 슬래시 메뉴 표시. 메뉴 아이템 클릭 → `createPage("")`.
  - `createPage(title)`: `const post = await app.createPost(title)` → `setQuery("")` → `post`가 있으면 `router.push(`/posts/${post.id}`)`.
    - **비동기**: 서버가 발급한 실제 id로만 상세에 진입할 수 있다. 저장 실패 시 `createPost`는 `null`을 반환하고 이동하지 않는다.
- "새 페이지" 버튼(컴포저·사이드바 액션): `await createPost("")` 후 상세로 이동.

### 5.2 제목/내용 자동 저장 (디바운스 서버 저장)

- 상세 페이지에서 `onChange` 즉시 `updatePost(id, {title|content})` 호출.
- **로컬은 즉시** 반영해 입력 반응성을 유지하고, **서버 UPDATE는 id별 600ms 디바운스**로 1회만 보낸다(연속 타이핑 = 요청 1회).
- 언마운트/화면 이탈 시 대기 중인 변경을 flush 해 유실을 막는다. 삭제된 글의 대기 중 편집은 취소한다.
- 별도 저장 버튼 없음. UI 표기: 메타 영역 "자동 저장됨". 저장 실패 시 알림.

### 5.3 글 삭제

- 상세 `handleDelete`: `window.confirm("이 글을 삭제할까요? 삭제하면 되돌릴 수 없어요.")` → 확인 시 `deletePost(id)` → `/`로 이동.
- `deletePost`: 로컬에서 **낙관적으로 제거**한 뒤 서버 DELETE. 실패하면 알림 + 재조회로 서버 진실에 맞춰 복구한다.
- 타인의 글 삭제 시도는 RLS(`page_delete_own`)가 서버에서 거부한다(0행 영향).

### 5.4 로그인 / 로그아웃 / 인증 가드

- 인증은 Supabase 세션(`lib/auth.tsx`의 `useAuth`)이 담당한다 — `signInWithGoogle()` / `signOut()`.
- 로그인 페이지: 이미 로그인 시(`auth.ready && auth.session`) `/`로 `replace`.
- AppShell: `auth.ready && !auth.session` → `/login`으로 `replace`. `!auth.ready || !auth.session || !app.loaded`면 `return null`.
- 상세: `app.loaded && !post` → `/`로 `replace`(삭제됐거나 내 소유가 아닌 글).

### 5.5 상태 모델 · 영속화 (서버 + 로컬 오버라이드)

- **Post 타입:** `{ id: string; title: string; content: string; createdAt: number }`. (`favorite` 없음 — 기능 제거)
- **AppState:** `{ loaded, posts: Post[], nickname: string|null, avatar: string|null, sidebarCollapsed: boolean }`. (인증/신원은 `AppState`가 아니라 Supabase 세션 — `lib/auth.tsx`의 `useAuth`.)
- **신원 파생값(`useProfile`, `lib/profile.ts`):** 구글 계정(`user_metadata.full_name`/`name`, `email`, `avatar_url`/`picture`)에 로컬 오버라이드를 병합 → `displayName = nickname || 구글이름 || email`, `email = 구글 이메일`, `avatarUrl = 로컬 avatar || 구글 사진`. 하드코딩 김민수/minsu.kim 제거됨.
- **게시글 저장소:** Supabase `public.page` 테이블(`id` bigint, `created_at` timestamptz, `title`, `content`, `user_id` uuid). 테이블 구조는 변경하지 않는다.
  - **행 ↔ Post 매핑(`lib/posts.ts`):** `id: String(row.id)`, `title/content: ?? ""`, `createdAt: Date.parse(row.created_at)`.
  - **로드:** 세션이 확정되면(`auth.ready` + 세션 있음) `select("*").order("created_at", {ascending:false})` → `loaded = true`. 클라이언트에서 user 필터를 걸지 않는다 — 격리는 RLS가 강제한다.
  - **로그아웃:** `posts = []`, `loaded` 재설정.
  - **createPost:** `insert({ title: title.trim(), content: "", user_id })` → 반환 행을 `Post`로 매핑해 배열 **맨 앞에 추가**(최신 우선). `user_id`를 반드시 명시한다(DB 기본값이 `gen_random_uuid()`라 생략하면 소유자 미상 행이 생긴다). 비로그인이면 서버 호출 없이 `null`.
  - **시드 없음:** 신규 사용자는 빈 목록 + 빈 상태 UI에서 시작한다.
- **localStorage 키:** `"mini-notion-v1"` — **프로필 오버라이드 + UI 환경설정 전용**.
  - **저장 스키마:** `JSON.stringify({ nickname, avatar, sidebarCollapsed })`. (게시글은 저장하지 않는다. 인증 세션은 supabase-js가 별도 키로 관리.)
  - `sidebarCollapsed`는 `!!d.sidebarCollapsed`로 읽는다 — 이 필드가 없는 이전 저장 데이터는 기본값 `false`(펼침).
- **saveNickname:** `(nick||"").trim() || null`(빈 값이면 null → displayName은 다시 구글 계정 이름).
- **setAvatar:** dataUrl(base64) 저장.
- **오류 처리:** 로드·생성·수정·삭제 실패는 `window.alert`로 알리고(정적 SPA — 토스트 인프라 없음) 로컬 상태를 서버 진실과 어긋나지 않게 유지한다.

### 5.6 날짜 포맷 규칙 (`formatDate`)

- 오늘 자정 기준 경과 일수 `days` 계산:
  - `days === 0` → `"오늘"`
  - `days === 1` → `"어제"`
  - 그 외 → `` `${d.getMonth()+1}월 ${d.getDate()}일` ``(예: "7월 3일")
- 상세 메타에서는 `` `${formatDate} 작성` ``으로 표시.

### 5.7 사이드바 접기 / 펼치기

- `toggleSidebar()`: `sidebarCollapsed = !sidebarCollapsed`. 함수형 업데이트라 연타해도 최종 상태로 수렴한다.
- 기본값 `false`(펼침). 값은 §5.5 스키마로 localStorage에 함께 저장되어 라우트 이동·새로고침 후에도 유지된다.
- AppShell은 `app.sidebarCollapsed`로 `.sidebar`에 `is-collapsed`를 붙이고, 레일에서 숨길 요소(검색·섹션·글 목록·프로필 텍스트)를 **조건부 렌더**로 제외한다(§3.3.1).
- 셸은 `app.loaded` 전에는 `return null`이므로(§3.5) 복원 전 상태가 잠깐 보이는 깜빡임은 없다.

---

## 6. 콘텐츠 / 카피 인벤토리 (Content)

사용자에게 보이는 **모든 한국어/텍스트 문자열**을 화면별로 정리(원문 그대로). placeholder 데이터 포함.

### 6.1 공통 / 앱 셸

| 위치 | 문구 |
|---|---|
| 브랜드칩(상단바·로그인) | `mini` |
| 워크스페이스 타이틀 | `미니 노션` |
| 상단바 아이콘 title | `알림` / `검색` / `도움말` / `앱` / `메뉴` |
| 상단바 중앙 테마 토글 title/aria-label | 라이트일 때 `다크 모드로 전환` / 다크일 때 `라이트 모드로 전환` |
| 사이드바 토글 title/aria-label | `사이드바 접기`(펼침 상태) / `사이드바 펼치기`(접힘 상태) |
| 사이드바 홈 | `홈` |
| 사이드바 검색 placeholder | `글 검색` |
| 섹션 "내 글" 라벨 / 액션 title | `내 글` / `새 페이지` |
| 글 제목 폴백(사이드바·카드·브레드크럼·제목 placeholder) | `제목 없음` |
| 섹션 빈 상태 | `아직 글이 없어요.` |
| 섹션 "앱" + 항목 | `앱` / `캘린더` / `할 일` / `휴지통` |
| 프로필 서브 | `마이 페이지` |
| 프로필 이름(기본) | 로그인한 구글 계정 이름 (닉네임 없을 때) |
| 문서 메타(title/description) | `미니 노션` / `나만의 가벼운 업무 관리 공간` |

### 6.2 로그인

| 위치 | 문구 |
|---|---|
| 제목 | `미니 노션` |
| 설명 | `나만의 가벼운 업무 관리 공간.` / `구글 계정으로 바로 시작하세요.` |
| 버튼 | `Google 계정으로 계속하기` (진행 중: `연결 중…` / 복귀 처리 중: `로그인 처리 중…`) |
| 오류(있을 때) | `.login-error` — 예: `로그인이 아직 설정되지 않았습니다. 잠시 후 다시 시도해 주세요.` |
| 약관 | `로그인하면 서비스 약관 및 개인정보 처리방침에` / `동의하는 것으로 간주됩니다.` |

### 6.3 업무 페이지(글 목록)

| 위치 | 문구 |
|---|---|
| 제목 | `내 업무` |
| 서브타이틀 | `기록하고 싶은 것을 자유롭게 남겨보세요.` |
| 컴포저 placeholder | `/page 를 입력하거나 할 일을 적어보세요` |
| 새 페이지 버튼 | `새 페이지` |
| 슬래시 메뉴 그룹 | `기본 블록` |
| 슬래시 아이템 이름/설명/kbd | `페이지` / `제목과 내용이 있는 새 글을 만듭니다` / `/page` |
| 컴포저 힌트 | `노션처럼 /page 를 입력하고 Enter를 누르면 새 글이 만들어져요.` (`/page`만 강조) |
| 리스트 헤드 라벨 / 정렬 title | `전체` / `정렬` |
| 카드 내용 폴백 | `내용 없음` |
| 빈 상태 제목 | `첫 글을 만들어 보세요` |
| 빈 상태 설명 | `위 입력창에 /page 를 입력하고 Enter를 누르거나` / `‘새 페이지’ 버튼을 눌러 시작하세요.` |

### 6.4 글 상세

| 위치 | 문구 |
|---|---|
| 뒤로 title | `뒤로` |
| 브레드크럼 루트 | `내 업무` |
| 삭제 버튼 | `삭제` |
| 제목 placeholder | `제목 없음` |
| 메타 | `{날짜} 작성` · `자동 저장됨` |
| 본문 placeholder | `내용을 입력하세요. 떠오르는 생각, 할 일, 메모를 자유롭게 기록해 보세요.` |
| 글자 수 칩 | `{n}자` (예: `0자`, `128자`) |
| 삭제 확인창 | `이 글을 삭제할까요? 삭제하면 되돌릴 수 없어요.` |

### 6.5 마이 페이지

| 위치 | 문구 |
|---|---|
| 제목 | `마이 페이지` |
| 서브타이틀 | `서비스에서 사용할 프로필 정보를 관리하세요.` |
| 아바타 행 이름/힌트 | `프로필 이미지` / `JPG, PNG · 정사각형 이미지를 권장합니다.` |
| 업로드 버튼 | `사진 변경` |
| 별명 라벨/placeholder | `별명` / `사용할 별명을 입력하세요` |
| 자기소개 라벨/placeholder | `자기소개` / `자신을 간단히 소개해 보세요` |
| 이메일 라벨/값/배지 | `이메일` / (실제 로그인 구글 이메일) / `Google 계정` |
| 저장 버튼 / 저장 노트 | `변경사항 저장` / `저장되었습니다` |
| 로그아웃 카드 제목/설명/버튼 | `로그아웃` / `이 기기에서 계정을 로그아웃합니다.` / `로그아웃` |

### 6.6 placeholder / 데모 데이터

- 신원(이름·이메일·아바타)은 로그인한 구글 계정에서 옴(하드코딩 `OWNER_NAME`/`EMAIL` 제거). 별명·아바타는 마이페이지에서 로컬 오버라이드 가능.
- 시드/데모 게시글 없음 — 게시글은 로그인한 사용자가 서버에 직접 만든 것뿐이다(신규 사용자는 빈 목록).

---

## 7. 접근성 · 상태 디테일 (States & A11y)

- **포커스 링:** `--shadow-focus` + `--border-focus`(#4e97f0, 두 테마 공통). 적용: `.input-sm:focus-within`, `.field-input:focus`, `.field-textarea:focus`. (나머지 인풋/textarea는 `outline:none`이며 별도 포커스 링 없음 — `.detail-title`, `.detail-content`, `.composer input` 등.)
  - 라이트 `0 0 0 3px rgba(78,151,240,0.25)` / 다크 `0 0 0 3px rgba(78,151,240,0.4)` — 어두운 배경에서 25%는 잘 보이지 않아 다크에서만 알파를 높였다(가시성 향상, §1.1.5).
- **placeholder 색:** `input::placeholder, textarea::placeholder { color: var(--text-placeholder) }`(#b0b3b8).
- **선택 영역:** `::selection { background: var(--accent-soft) }`(#eef4fe).
- **커스텀 스크롤바:** `.mn-scroll`(→ [§2.7.13](#2713-스크롤바-mn-scroll)). thumb 11px, 색 `--border-default`/hover `--border-strong`, 트랙은 3px solid 페이지색 테두리로 여백감. 두 테마 모두 토큰이 따라간다. 네이티브 스크롤바는 `color-scheme`이 처리한다.
- **hover 규칙:** 대부분 `--surface-hover`(#f1f2f3) 배경 전환, 카드류는 border/shadow/transform까지. `--dur-fast`(120ms).
- **active/press:** `.btn:active { transform: scale(0.97) }`, `.icon-btn:active { background: --surface-active }`.
- **disabled:** 명시적 `:disabled` 스타일 없음(비활성 항목은 onClick 미지정 방식 — 사이드바 "캘린더/할 일/휴지통").
- **링크:** `a { color: --text-link; text-decoration: none } a:hover { color: --accent-hover }`.
- **키보드:** post-card는 `role="link" tabIndex={0}` + Enter로 이동. IconButton은 `aria-label`=title. 그 외 시맨틱은 기본 `<button>`.
- **툴팁(`title`):** IconButton 전반, `SidebarItem`(항상 `label`), 접힘 상태의 `.sidebar__profile`. 접힌 레일에서 레이블이 없는 아이콘의 이름을 확인하는 수단이다(§3.3.1).
- **토글 상태 노출:** 사이드바 토글은 네이티브 `<button>`(Tab 도달·Enter/Space 활성화) + `aria-label`(상태별 문구) + `aria-expanded`(펼침 여부) + `aria-controls="app-sidebar"`. 접힘 상태에서도 항상 렌더되므로 포커스가 사라지지 않는다.
- **reduced-motion:** `@media (prefers-reduced-motion: reduce)` 대상 2건 — ① 커버 스켈레톤 shimmer는 애니메이션을 끄고 정적 `--surface-hover` 배경으로 대체(§2.7.15, 그 배경도 토큰이라 다크에서 자동으로 따라간다), ② `.sidebar { transition: none }`으로 접기/펼치기 폭 전환을 즉시 적용(§3.3.1).
  > TODO(유지): 새 애니메이션 요소(`mnPop` 등)를 추가할 때 위 미디어 쿼리에 동일 패턴으로 등록할 것.
- **다크 모드:** 지원한다(→ [§1.1.5](#115-다크-테마-data-themedark), [§2.8](#28-themetoggle--componentsuithemetoggletsx), §3.2).
  - 전환은 상단바 중앙 토글 버튼의 **명시적 조작**으로만 일어난다. `prefers-color-scheme`은
    **저장된 선택이 없는 첫 방문의 기본값**을 정할 때만 참조하며, 이후 시스템 설정 변경을 실시간
    추종하지는 않는다(명시 선택 우선).
  - 테마 전환에 별도 트랜지션을 걸지 않는다 — 토큰이 즉시 교체되어 전환이 한 프레임에 끝나고
    레이아웃 이동도 없다. reduced-motion 사용자에게 추가 모션을 만들지 않기 위한 선택이기도 하다.
- **대비(두 테마 공통 기준):** 본문 텍스트는 배경 대비 **최소 4.5:1**을 만족해야 한다.
  다크 실측: `--text-strong` 15.0:1, `--text-body` 11.9:1, `--text-secondary` 7.2:1,
  `--text-muted` 5.4:1, `--text-link` 7.3:1(모두 `--surface-page` #191919 기준).
  `--text-placeholder`는 다크에서 3.2:1로, 라이트의 2.1:1보다 **높다**(placeholder는 본문 텍스트가
  아니므로 4.5:1 대상이 아니며, 어느 테마에서도 기존 기준을 낮추지 않았다).
  아이콘·그래픽 요소(`--accent` on `--accent-soft` 4.7:1 등)는 3:1 기준을 만족한다.
- **다크에서의 이미지·장식:** 커버 이미지(cataas)와 사진 아바타는 원본 그대로 표시된다(밝은 사진이
  어두운 셸에서 도드라지지만 식별성에는 문제가 없다). 이니셜 아바타·브랜드칩·배지·스크롤바·meta dot은
  토큰화되어 테마를 따른다. 구글 로고 4색만 브랜드 고정색으로 유지된다.

---

## 8. 부록: 커버리지 체크리스트 (Coverage)

"소스의 이 부분 → 문서의 이 섹션" 매핑.

| 소스 파일 | 내용 | 반영 섹션 |
|---|---|---|
| `app/globals.css` `:root` | CSS 변수 76개(색/타이포/라운드/그림자/모션) + `color-scheme` | §1.1–§1.5 (전량 열거) |
| `app/globals.css` `[data-theme="dark"]` | 다크 시맨틱 토큰·그림자 재정의 | §1.1.5 (전량 열거) |
| `app/globals.css` Base(174–197) | reset, body, a, ::selection, placeholder, mn-scroll, mnPop | §1.5, §2.7.13, §7 |
| `app/globals.css` Primitives(203–283) | btn/icon-btn/badge/avatar/input-sm/sidebar-item/sidebar-section | §2.1–§2.7 |
| `app/globals.css` App shell(288–345) | app-root/topbar/sidebar(+`is-collapsed` 레일·toolbar)/app-main | §3, §3.3.1 |
| `app/globals.css` Login(350–372) | login-page/card/google-btn/terms | §4.1 |
| `app/globals.css` 목록 | list-page/composer/slash-menu/post-card/empty-state | §4.2, §2.7 |
| `app/globals.css` 상세(464–536) | detail-* | §4.3 |
| `app/globals.css` 마이(541–602) | mypage-*/upload-btn/field-*(input/textarea/readonly)/saved-note/logout-card | §4.4, §2.7 |
| `components/ui/Button.tsx` | Button | §2.1 |
| `components/ui/IconButton.tsx` | IconButton(+sm) | §2.2 |
| `components/ui/Badge.tsx` | Badge | §2.3 |
| `components/ui/Avatar.tsx` | Avatar(img/이니셜) | §2.4 |
| `components/ui/SidebarItem.tsx` | SidebarItem(active) | §2.5 |
| `components/ui/SidebarSection.tsx` | SidebarSection(count/actions/empty) | §2.6 |
| `components/ui/ThemeToggle.tsx` | ThemeToggle(Sun/Moon, aria-pressed) | §2.8 |
| `lib/theme.tsx` | resolveInitialTheme / ThemeProvider / useTheme / 영속화 | §1.1.5 |
| `components/AppShell.tsx` | 셸 구성·네비·인증 가드·검색·아이콘·사이드바 접기 토글 | §3, §3.3.1, §1.7 |
| `app/(app)/page.tsx` | 목록·컴포저·슬래시·카드·빈 상태 | §4.2, §5.1 |
| `app/(app)/posts/[id]/page.tsx` | 상세·자동저장·삭제 | §4.3, §5.2/5.3 |
| `app/(app)/mypage/page.tsx` | 프로필·아바타 업로드·저장 노트·로그아웃 | §4.4, §5 |
| `app/login/page.tsx` | 로그인·구글 로고 SVG | §4.1, §1.1.4 |
| `app/(app)/layout.tsx` / `app/layout.tsx` | 셸 래핑 / 폰트·metadata / `data-theme`·FOUC 방지 인라인 스크립트·ThemeProvider | §3, §1.2, §1.1.5, §6.1 |
| `lib/store.tsx` | 상태·세션 연동·낙관적 갱신·날짜포맷·상수·사이드바 접힘 상태 | §5, §5.7, §6.6 |
| `lib/posts.ts` | Supabase `page` 접근(조회/생성/수정/삭제)·행↔Post 매핑 | §5.5 |
| `docs/page-rls-setup.sql` | `page` RLS 정책 4종(소유권 강제) | §5.5 |
| `03-reference-design.png` | ui:bowl 레퍼런스(다른 제품) | §0 레퍼런스 메모 |
| `02-prd.md`, `README.md` | 제품 맥락·원칙 | §0 |

### 자체 점검 결과

1. `:root` CSS 변수 76개(사이드바 폭 토큰 2개 포함) → §1에 **전부** 열거(미사용 토큰은 "정의만" 표기). 다크 재정의 토큰은 §1.1.5에 전량 열거. ✅
2. `components/ui/` 파일 7개 = 문서 컴포넌트 7개(§2.1–2.6, §2.8) + CSS 전용 조각 16개(§2.7). 누락 없음. ✅
3. 4개 화면 모두 포함, 빈 상태·슬래시 메뉴·저장 노트·삭제 확인창까지 포함. ✅
4. 사용자 노출 한국어 문구 → §6에 화면별 전량 인용(placeholder + 테마 토글 라벨 포함). ✅
5. 근사·반올림 값 없음 — hex/px/ms/cubic-bezier 원문 유지. 대비값만 소수 첫째 자리 반올림(계산값). ✅
6. 확정 불가/미완 항목(reduced-motion 커버리지, 레퍼런스 divergence)은 TODO/메모로 표시. 다크모드는 **구현 완료**로 갱신됨. ✅
7. 다크 모드 도입 시 하드코딩·프리미티브 직접 참조 6곳을 토큰화했고, 라이트 최종값은 전부 불변임을 §1.1.4에 명시. ✅

> **미사용(정의만) 토큰 목록**(보존용): `--gray-25`, `--gray-700`(직접 참조 없음, 램프값으로만), `--blue-200`, `--blue-300`, `--blue-400`, `--gold-300`, `--gold-500`, `--accent-soft-fg`, `--status-warning`(및 그 참조원 `--amber-500`), `--radius-xs`, `--dur-slow`. — 삭제하지 말 것(디자인 시스템 원본에서 이식된 완전 램프/스케일의 일부).
> `--surface-inverse`는 다크 모드에서 `.brand-chip`이 사용하기 시작해 목록에서 제외됐다.
> 다크 스코프는 `#93bdf8`·`#66a9ff`처럼 램프에 존재하는 값도 리터럴로 적는다(중성 다크색 대부분이 램프에 대응값이 없어 표기를 통일). 따라서 `--blue-300/400`은 여전히 "정의만" 상태다.
