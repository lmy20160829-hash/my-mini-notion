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
| `rgba(25, 25, 25, 0.45)` | `.modal-overlay`(라이트) | 모달 dim 배경 — 라이트 그림자 기준색(25,25,25) 계열 (§2.9) |
| `rgba(0, 0, 0, 0.6)` | `[data-theme="dark"] .modal-overlay` | 모달 dim 배경(다크) — 다크 그림자와 같은 순수 검정 기준 |

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

#### 1.1.6 색 팔레트 — 글자색 · 배경색 (Phase F 태스크 C2) · `lib/editor/palette.ts`

에디터 서식(Color/Highlight, §1.1의 마크 등록은 `lib/editor/marks.ts`)이 쓰는 컨플루언스식
색 팔레트. §1.1.1~1.1.5의 CSS 커스텀 프로퍼티 토큰과 달리 **이 팔레트는 CSS 변수가 아니다** —
Tiptap의 `Color`/`Highlight` 확장은 선택한 값을 문서에 **인라인 style로 저장**한다
(`style="color: #2f6fed"` / `style="background-color: #dbe8fd"`). 저장된 hex는 테마 토큰을
전혀 경유하지 않으므로 **다크 테마로 전환해도 재계산되지 않는다** — §1.1.5가 재정의하는
시맨틱 토큰과 근본적으로 다른 메커니즘이다. 이 한계 때문에 아래 hex는 처음부터 라이트/다크
양쪽 배경에서 무난히 읽히도록 중간 채도로 골라 고정했다(글자색은 진하게, 배경색은 연하게).

**글자색 8종** — 기본(상속) + 7색. `id`가 팔레트 UI(C3)의 선택 키, `value`가 저장되는 hex.

| id | label | hex | 비고 |
|---|---|---|---|
| `default` | 기본 | `null` | 상속(인라인 style 미적용, `unsetColor()`) |
| `gray` | 회색 | `#6b7280` | |
| `red` | 빨강 | `#e5484d` | |
| `orange` | 주황 | `#d97514` | |
| `yellow` | 노랑 | `#b8860b` | |
| `green` | 초록 | `#1f9d57` | |
| `blue` | 파랑 | `#2f6fed` | |
| `purple` | 보라 | `#8b5cf6` | |

**배경색(형광펜) 8종** — 없음 + 7색. 연한 배경(텍스트 위 판독 우선, 양쪽 테마 공용).

| id | label | hex | 비고 |
|---|---|---|---|
| `none` | 없음 | `null` | 하이라이트 미적용(`unsetHighlight()`) |
| `gray` | 회색 | `#e5e7eb` | |
| `red` | 빨강 | `#fbdcdb` | |
| `orange` | 주황 | `#fbe6cf` | |
| `yellow` | 노랑 | `#fbf1c7` | |
| `green` | 초록 | `#d5f0e0` | |
| `blue` | 파랑 | `#dbe8fd` | |
| `purple` | 보라 | `#e9e2fb` | |

> 글자색·배경색은 `id`가 각각 `gray`/`red`/... 로 겹치지만 별개 배열(`TEXT_COLORS` /
> `HIGHLIGHT_COLORS`)이며 hex 값도 서로 다르다(글자색은 진한 색조, 배경색은 옅은 색조) —
> 이름만 대응할 뿐 같은 토큰을 공유하지 않는다.
>
> 소비처(C3, [§2.16](#216-colorpopover-색-팝오버--componentseditorcolorpopovertsx--clr-globalscss-끝-색-팝오버-c3--216-블록)):
> 색 팝오버가 두 배열을 그대로 렌더링해 스와치 그리드를 만들고, 클릭 시 `value`(hex 또는
> `null`)를 `setColor`/`unsetColor`, `toggleHighlight`/`unsetHighlight`에 전달한다.

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
- 적용: `.slash-menu { animation: mnPop 0.14s var(--ease-out); }`, `.saved-note { animation: mnPop 0.14s var(--ease-out); }`, `.modal-card { animation: mnPop 0.14s var(--ease-out); }`(§2.9 — reduced-motion에서 해제, §7) (지속시간 `0.14s` = 140ms, 하드코딩).

**키프레임 2 — `mnShimmer`** (`globals.css:513`): 커버 스켈레톤 로딩 표현(스피너 대체).
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
| `.calendar-cell` | background |
| `.calendar-chip` | background |

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
- **실제 사용된 lucide 아이콘 (28종)** 과 기본 size(px):

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
| `Trash2` | 16 / 40 | 사이드바 "휴지통"(16), 상세 삭제(16), 휴지통 영구 삭제 버튼(16), 휴지통 빈 상태 tile(40) |
| `RotateCcw` | 16 | 휴지통 "복원" 버튼(Button iconLeft, §4.5) |
| `Settings` | 16 | 사이드바 프로필 버튼 |
| `SquarePen` | 18 | 컴포저 아이콘 |
| `ArrowUpDown` | 14 | 목록 정렬(IconButton sm) |
| `ChevronRight` | 16 / 14 | post-card 셰브론(16), 브레드크럼 구분(14), 캘린더 "다음 달"(IconButton 16) |
| `ChevronLeft` | 16 | 캘린더 "이전 달"(IconButton) |
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

`components/ui/*`의 React 프리미티브 7개 + `globals.css`에 정의된 재사용 CSS 조각 전부 + 화면 종속이지만 카탈로그로 승격된 모달 컴포넌트([§2.9](#29-eventmodal--componentscalendareventmodaltsx)). 각 항목: 용도 / props / 변형 / 크기 / 해부 / 상태별 스타일 / 예시 마크업.

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

### 2.2 IconButton · `components/ui/IconButton.tsx` + `.icon-btn` (`globals.css:220-228`, 비활성 229-236)

- **용도:** 아이콘 전용 정사각 버튼(상단바·정렬·섹션 액션·뒤로).
- **props:** `icon: LucideIcon`, `size?: "sm" | "md"`(기본 `md`), `title?`, `className?`, `ariaExpanded?: boolean`, `ariaControls?: string`, `disabled?: boolean`, `onClick?`. `title`은 `title` + `aria-label` 둘 다로 매핑.
  - **`disabled`(미구현 기능 표시):** `is-disabled` 클래스 + `aria-disabled="true"`가 붙고, `title`/`aria-label`이 `pendingLabel()`로 `"{title} (준비 중)"`이 되며 `onClick`은 전달되지 않는다.
  - **`disabled` 속성을 쓰지 않는 이유:** 진짜 `disabled` 버튼은 브라우저가 포인터 이벤트를 없애 `title` 툴팁이 뜨지 않는다. 그러면 "준비 중"이라는 사실을 전달할 수단 자체가 사라지고, 접힌 레일의 이름 확인(FR-009, §3.3)도 함께 깨진다. `aria-disabled`는 보조기술에 동일하게 비활성으로 전달되면서 호버·툴팁을 살려 둔다. 회귀 방지: `__tests__/AppShell.pendingItems.test.tsx`.
  - `ariaExpanded`/`ariaControls`: **토글 컨트롤 전용**(접기/펼치기처럼 다른 영역의 펼침 상태를 제어할 때). 각각 `aria-expanded`/`aria-controls`로 그대로 전달되며, 미지정 시 속성이 렌더되지 않는다. 현재 사용처는 사이드바 토글(§3.3) 하나다.
  - `className`: 기본 클래스 뒤에 덧붙는 추가 클래스(선택).
- **변형/크기:** md `30×30`, radius-md, 아이콘 16 / sm `24×24`(`.icon-btn--sm`), radius-sm, 아이콘 14.
- **해부:** `<button type="button" class="icon-btn[ icon-btn--sm][ {className}]" title aria-label [aria-expanded] [aria-controls]><Icon size={16|14}/></button>`
- **상태별 스타일:** default color `--text-muted`(#8a8f98), bg none · hover bg `--surface-hover`, color `--text-secondary`(#6b7178) · active bg `--surface-active`(#ebeced).
  - **`.is-disabled`:** `cursor: default; opacity: 0.45`, hover/active 배경 변화 없음(`--text-muted` 유지). `pointer-events`는 끄지 않는다 — 툴팁이 떠야 하기 때문이다.
- **예시:** `<IconButton icon={Bell} title="알림" />`, `<IconButton icon={ArrowUpDown} size="sm" title="정렬" />`, `<IconButton icon={PanelLeftClose} title="사이드바 접기" ariaExpanded ariaControls="app-sidebar" onClick={app.toggleSidebar} />`

### 2.3 Badge · `components/ui/Badge.tsx` + `.badge` (`globals.css:239-243`)

- **용도:** 개수/라벨 pill.
- **props:** `children`.
- **크기/스타일:** 높이 `18px`, padding `0 7px`, radius-pill(999px), bg `--surface-hover`(라이트 #f1f2f3 = 이전 `--gray-100`과 동일 값), font 11/600, color `--text-secondary`, `line-height: 1`.
  - 다크에서 배경이 `#2a2a2a`로 따라가 `--text-secondary`(#a6a6a6)와 6.4:1 대비를 유지한다(토큰화 이전에는 밝은 회색 배경이 그대로 남아 대비가 무너졌다).
- **상태:** 단일(상태 없음).
- **예시:** `<Badge>{app.posts.length}</Badge>`, `<Badge>Google 계정</Badge>`

### 2.4 Avatar · `components/ui/Avatar.tsx` + `.avatar` (`globals.css:246-251`)

- **용도:** 프로필 아바타(이미지 or 이니셜 폴백).
- **props:** `name: string`, `src?: string | null`, `size?: number`(기본 `28`).
- **동작:** `src`가 있으면 `<img src={src} alt={name}>`, 없으면 `name.charAt(0)`(첫 글자) 표시.
- **크기 계산:** 인라인 style `width/height = size`, `fontSize = Math.round(size * 0.42)`. (예: 28→12px, 72→30px)
- **스타일:** 원형(50%), bg `--avatar-bg`(라이트 #dbe9fd), color `--avatar-fg`(라이트 #2f6bb5), font-weight 600, `overflow: hidden; user-select: none`. `img { width:100%; height:100%; object-fit: cover }`.
  - 다크: bg `rgba(78,151,240,0.24)`, color `#93bdf8`(대비 8.0:1) — 밝은 파랑 칩이 어두운 셸에서 튀지 않게 반투명 처리(§1.1.5). 사진 아바타(`img`)는 원본 그대로 표시된다.
- **예시:** `<Avatar name={profile.displayName} src={profile.avatarUrl} size={28} />`(사이드바), `size={72}`(마이페이지). `profile`은 구글 계정+로컬 오버라이드 병합(`useProfile`).

### 2.5 SidebarItem · `components/ui/SidebarItem.tsx` + `.sidebar-item` (`globals.css:269-279`, 비활성 232-236)

- **용도:** 사이드바 네비 항목(홈·글·앱 메뉴).
- **props:** `icon: LucideIcon`, `label: string`, `active?: boolean`, `disabled?: boolean`, `onClick?`.
- **해부:** `<button class="sidebar-item[ is-active][ is-disabled]" title={label} [aria-disabled]>` → `.sidebar-item__icon`(Icon 16) + `.sidebar-item__label`(말줄임).
- **툴팁:** `title`은 `label`과 같고, `disabled`면 `"{label} (준비 중)"`이 된다. 접힌 레일에서 레이블이 숨겨져도 이름을 확인할 수 있고(§3.3), 펼침 상태에서도 말줄임된 긴 제목을 확인하는 데 쓰인다. 비활성이어도 **이름은 반드시 남는다** — 레일에서 아이콘을 식별할 유일한 단서이기 때문이다(FR-009).
- **`disabled`:** IconButton과 같은 규약(§2.2) — `aria-disabled`, `is-disabled`, `onClick` 미전달. 보이는 레이블(`__label`)은 이름 그대로 두어 접근성 이름과 시각 레이블을 일치시킨다.
- **크기:** 높이 `32px`, padding `0 10px`, gap 8px, radius-md, font 13/500.
- **레일 변형(`.sidebar.is-collapsed` 하위):** `width: 40px; padding: 0; justify-content: center` — 아이콘만 남고 `__label`은 `display: none`. 높이·radius·상태 스타일은 동일.
- **상태별 스타일:**

| 상태 | 스타일 |
|---|---|
| default | color `--text-secondary`; 아이콘 `--text-muted` |
| hover | bg `--surface-hover` |
| `.is-active` | bg `--surface-active`, color `--text-strong`, font-weight **600**; 아이콘 색 `--text-secondary` |
| `.is-disabled` | `cursor: default; opacity: 0.45`; hover 배경 변화 없음 |

- **예시:** `<SidebarItem icon={House} label="홈" active={pathname === "/"} onClick={...} />`, `<SidebarItem icon={FileText} label={title||"제목 없음"} active={...} />`

### 2.6 SidebarSection · `components/ui/SidebarSection.tsx` + `.sidebar-section*` (`globals.css:282-290`)

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
  <SidebarSection label="내 글" count={navPosts.length} /* 검색 중엔 매치 개수(§5.8) */
    actions={[{ icon: Plus, title: "새 페이지", onClick: newPage }]}>
    {navPosts.map(...)}
    {/* 빈 상태 분기: 글 없음 → "아직 글이 없어요." / 검색 매치 없음 → "검색 결과가 없어요."(§5.8) */}
  </SidebarSection>
  ```

### 2.7 CSS 전용 재사용 조각 (globals.css에 정의)

React 컴포넌트가 없는 인라인 프리미티브. 화면 코드에서 클래스로 직접 사용된다.

#### 2.7.1 검색 인풋 `.input-sm` · `globals.css:254-266`
- 용도: 사이드바 "글 검색" — 입력값으로 "내 글" 목록을 실시간 필터링한다(§5.8). 높이 32px, padding `0 10px`, gap 7px, bg `--surface-subtle`, border `1px --border-subtle`, radius-md, color `--text-muted`.
- 자식 `input`: `flex:1; border:none; outline:none; background:transparent; font 13; color --text-body`.
- 상태: `:focus-within` → bg `--surface-card`, border-color `--border-focus`, box-shadow `--shadow-focus`.
- 마크업: `<div class="input-sm"><Search size={14}/><input value={search} onChange={...} placeholder="글 검색"/></div>`

#### 2.7.2 상세 삭제 버튼 `.detail-delete-btn` · `globals.css:483-490`
- 높이 30px, padding `0 12px`, gap 6px, font 13/600, color `--status-danger`(#f0483e), bg none, radius-md. hover bg `--danger-soft`(라이트 #fdeae9 / 다크 `rgba(240,72,62,0.16)`). 아이콘 `Trash2 size={16}` + 텍스트 "삭제".

#### 2.7.3 업로드 버튼 `.upload-btn` · `globals.css:561-572`
- 용도: 마이페이지 "사진 변경"(실제로는 `<label>` + 숨겨진 file input). 높이 34px, padding `0 14px`, gap 7px, bg `--surface-subtle`, radius-md, font 14/600, color `--text-body`. hover bg `--surface-hover`. `svg { color: --text-secondary }`. 아이콘 `ImageIcon size={16}`.
- **진행 중 상태 `.upload-btn.is-busy`:** 업로드하는 동안 붙는다. `cursor: default; opacity: 0.6`, hover 배경 변화 없음(`--surface-subtle` 유지) — `.login-google-btn:disabled`(§4.1)와 같은 관행이다. 라벨은 "사진 변경" → "업로드 중…"으로 바뀌고 내부 `input`에 `disabled`가 걸려 겹쳐 올리기가 막힌다.

#### 2.7.4 필드 인풋 `.field-input` · `globals.css:576-582`
- 용도: 마이페이지 "별명". 폭 100%, 높이 42px, padding `0 12px`, bg `--surface-card`, border `1px --border-default`, radius-md, font 14, color `--text-body`, `outline:none`.
- 상태: `:focus` → border-color `--border-focus`, box-shadow `--shadow-focus`.

#### 2.7.4b 여러 줄 필드 `.field-textarea` · `globals.css:584-591`
- 용도: 마이페이지 "자기소개"(여러 줄 일반 텍스트). `.field-input`과 같은 토큰을 쓰되 높이·줄바꿈만 다르다.
- 폭 100%, `min-height: 96px`, padding `10px 12px`, bg `--surface-card`, border `1px --border-default`, radius-md, `font-family: inherit`, font 14/1.6, color `--text-body`, `outline:none`, `resize: vertical`, `display:block`.
- 상태: `:focus` → border-color `--border-focus`, box-shadow `--shadow-focus`(`.field-input`과 동일한 포커스 링).
- `font-family: inherit`는 브라우저 기본 textarea 폰트(monospace)를 막아 본문 폰트를 유지하기 위함이다.

#### 2.7.5 읽기전용 필드 `.field-readonly` (+`__value`) · `globals.css:592-597`
- 용도: 마이페이지 "이메일". 높이 42px, padding `0 12px`, gap 8px, bg `--surface-subtle`, border `1px --border-subtle`, radius-md, color `--text-muted`.
- `__value`: `flex:1; font 14; color --text-secondary`. 마크업: `<Mail size={16}/> <span class="field-readonly__value">{email}</span> <Badge>Google 계정</Badge>`.

#### 2.7.6 브랜드칩 `.brand-chip` · `globals.css:306-310` (+ 로그인 변형 360)
- inline-flex, bg `--surface-inverse`, color `--surface-page`, radius `7px`, padding `3px 8px`, font 12/700, `letter-spacing: -0.02em`.
  - 라이트: 어두운 칩 + 흰 글자(#191919 / #ffffff — 토큰화 이전 값과 동일). 다크: 밝은 칩 + 어두운 글자(#ededed / #191919)로 **자동 반전**된다.
- 로그인 변형(`.login-card .brand-chip`): radius `9px`, padding `6px 11px`, font 15, `margin-bottom: 22px`.
- 내용: 텍스트 "mini".

#### 2.7.7 컴포저 `.composer` (+`-wrap`/`__icon`/`-hint`) · `globals.css:391-400`
- `-wrap`: `position: relative; margin: 24px 0 6px`(슬래시 메뉴 앵커).
- `.composer`: flex, gap 10px, bg `--surface-card`, border `1px --border-default`, radius-2xl(20px), shadow-sm, padding `9px 10px 9px 16px`.
- `__icon`: color `--text-muted`(`SquarePen size={18}`). `input`: flex:1, font 15, color `--text-body`.
- `-hint`: margin `0 0 26px`, font 12, color `--text-muted`; `b`는 color `--text-secondary`, weight 600.

#### 2.7.8 슬래시 메뉴 `.slash-menu*` · `globals.css:404-430`
- `.slash-menu`: `position:absolute; top: calc(100% + 6px); left:0; right:0`, bg `--surface-card`, border `1px --border-subtle`, radius-lg, shadow-lg, padding 6px, `z-index: 20`, `animation: mnPop 0.14s var(--ease-out)`.
- `__group`: padding `6px 10px 4px`, font 11/700, color `--text-muted`, `letter-spacing: 0.02em`.
- `__item`: flex, gap 12px, padding `8px 10px`, radius-md, bg none; hover bg `--surface-hover`.
- `__tile`: `34×34`, radius-md, bg `--accent-soft`, color `--accent`.
- `__name`: 13/600 `--text-strong`; `__desc`: 12 `--text-muted`.
- `kbd`: font-mono 11, color `--text-muted`, bg `--surface-subtle`, border `1px --border-subtle`, radius `5px`, padding `2px 7px`.

#### 2.7.9 글 카드 `.post-card*` · `globals.css:437-455`
- `.post-card`: flex, gap 14px, padding `13px 16px`, bg `--surface-card`, border `1px --border-subtle`, radius-lg, shadow-xs, cursor pointer.
  - hover: border-color `--border-default`, box-shadow `--shadow-md`, `transform: translateY(-1px)`.
- `__tile`: `38×38`, radius-md, bg `--surface-subtle`, color `--text-secondary`(`FileText size={18}`).
- `__title`: 14/600 `--text-strong`, 말줄임.
- `__preview`: 13 `--text-muted`, 말줄임, `margin-top: 1px`.
- `__date`: 12 `--text-muted`, `flex:none; white-space:nowrap`.
- `__chevron`: color `--text-muted`(`ChevronRight size={16}`).

#### 2.7.10 빈 상태 `.empty-state*` · `globals.css:457-468`
- `.empty-state`: center, padding `56px 24px`, `border: 1px dashed --border-default`, radius-lg, bg `--surface-subtle`.
- `__tile`: `64×64`, radius-xl, bg `--accent-soft`, color `--accent`, `margin-bottom: 16px`(`FilePlus2 size={40}`).
- `__title`: 16/600 `--text-strong`, `margin-bottom: 6px`.
- `__desc`: 13 `--text-secondary`, line-height 1.6; `b` color `--text-body`.

#### 2.7.11 저장 노트 `.saved-note` · `globals.css:600-604`
- inline-flex, gap 5px, font 13/600, color `--status-success`(#2eb872), `animation: mnPop 0.14s var(--ease-out)`. `Check size={16}` + "저장되었습니다".

#### 2.7.12 로그아웃 카드 `.logout-card*` · `globals.css:606-613`
- flex, gap 14px, `margin-top: 16px`, bg `--surface-card`, border `1px --border-subtle`, radius-lg, shadow-xs, padding `18px 24px`.
- `__title`: 14/600 `--text-strong`; `__desc`: 12 `--text-muted`, `margin-top: 1px`.

#### 2.7.13 스크롤바 `.mn-scroll` · `globals.css:192-195`
- `scrollbar-width: thin; scrollbar-color: var(--border-strong) transparent`.
- webkit: `::-webkit-scrollbar { width/height: 11px }`, thumb bg `--border-default`, `border-radius: 8px`, `border: 3px solid var(--surface-page)`(트랙 여백 효과), thumb:hover bg `--border-strong`.
- 라이트 최종값은 이전(`--gray-200`/`--gray-300`)과 동일하며, 다크에서는 `#3a3a3a`/`#4d4d4d`로 따라가 밝은 thumb가 튀지 않는다. 트랙 테두리는 `--surface-page`라 자동으로 테마를 따른다.
- 사용처: `.sidebar__scroll`, `.app-main`.

#### 2.7.14 글자 수 칩 `.detail-charcount` · `globals.css:539-545`
- 용도: 글 상세 본문(`.detail-content`)의 grapheme 글자 수를 편집 컬럼 우측 하단에 고정 표시. 컴포넌트 `components/CharCount.tsx`(`<CharCount text>`)가 렌더한다.
- 배치: `position: sticky; bottom: 24px; margin-left: auto; width: fit-content` — `.detail-page`(760px 컬럼) 안 `.detail-content` 다음 마지막 자식. `.app-main` 스크롤 시 뷰포트 하단 근처에 유지.
- 스타일: padding `3px 10px`, bg `--surface-card`, border `1px --border-subtle`, radius-pill, shadow-xs, font 12, color `--text-muted`, `user-select: none`.
- 비방해: `pointer-events: none` — 아래 본문 편집/클릭을 막지 않는다(FR-007).
- 내용: 텍스트 `{n}자`(예: `0자`, `128자`). 빈 내용도 숨기지 않고 `0자` 표시.

#### 2.7.15 커버 이미지 `.detail-cover*` · `globals.css:493-524` · `components/PostCover.tsx`
- 용도: 글 상세(`.detail-page`) 제목 입력창 **위** 배너. 오픈 API `https://cataas.com/cat/cute`의 랜덤 고양이 사진. 컴포넌트 `PostCover`가 렌더하며, 부모는 `<PostCover key={`cover-${post.id}`} />`로 글별 remount(=열 때마다 새 랜덤)한다. 접두사 `cover-`는 같은 부모의 형제인 `PostEditor`(`editor-*`)와 key가 겹치지 않게 하려는 것 — 맨 key가 `post.id`이면 React가 중복 key로 경고하고 한쪽을 버린다.
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

### 2.9 EventModal · `components/calendar/EventModal.tsx` + `.modal-*` (`globals.css:683-736`)

- **용도:** 캘린더(§4.5)의 일정 추가/수정 모달. dim 오버레이 + 카드. 추가/수정 겸용이며 수정 모드에만 삭제 버튼이 나온다. 이 앱의 첫(현재 유일한) 모달 — `.modal-*` 조각은 다른 모달에도 재사용 가능하게 범용으로 명명했다.
- **props:** `mode: "create" | "edit"`, `initial: EventDraft`(제목/설명/시작·종료 ms/하루 종일/색), `onSave(draft)`, `onDelete?`, `onClose`.
- **해부:**
  - `.modal-overlay`: `position: fixed; inset: 0; z-index: 50`, flex 중앙 정렬, padding 24px. 배경 dim은 라이트 `rgba(25,25,25,0.45)` / 다크 `rgba(0,0,0,0.6)`(§1.1.4 하드코딩 표). **클릭하면 닫힌다.**
  - `.modal-card`: `role="dialog" aria-modal="true" aria-label="일정 추가|일정 수정"`, 클릭 전파 차단. `width: 440px; max-width: 100%; max-height: calc(100vh - 48px); overflow-y: auto`, bg `--surface-card`, border `1px --border-subtle`, radius-lg, shadow-lg, padding 24px, `animation: mnPop 0.14s var(--ease-out)`(reduced-motion에서 none, §7).
  - `.modal-card__title`: 16/600 `--text-strong`, margin `0 0 16px`. 텍스트 "일정 추가"/"일정 수정".
  - `form` 내부(위→아래):
    1. `.modal-field` 제목: `<label for="event-title">제목` + `<input class="field-input" placeholder="일정 제목" maxLength=200>`(§2.7.4 재사용).
    2. `.modal-field-row`(grid 2열, gap 12px): 시작/종료 `<input type="datetime-local" class="field-input">`(라벨 "시작"/"종료").
    3. `.modal-check`(flex, gap 8px, 13/500 `--text-body`): `<input type="checkbox">`(`accent-color: --accent`) + "하루 종일".
    4. `.modal-field` 색상: `.modal-field__legend`(라벨과 동일 스타일) + `.modal-colors`(`role="group" aria-label="색상"`, flex gap 8px) → `.modal-color` 5개.
    5. `.modal-field` 설명: `<label for="event-desc">설명` + `<textarea class="field-textarea" placeholder="메모를 남겨보세요">`(§2.7.4b 재사용).
    6. `.modal-footer`(flex, gap 12px, margin-top 20px, padding-top 16px, border-top `1px --border-subtle`): (수정 모드)`.detail-delete-btn`(§2.7.2, `Trash2 16` + "삭제") + `.modal-footer__spacer`(flex:1) + `<Button type="submit" variant="primary">저장</Button>`.
- **필드 라벨:** `.modal-field label, .modal-field__legend` — 13/600 `--text-secondary`, margin-bottom 8px(마이페이지 `.mypage-field label`과 동일 값). 필드 간격 `.modal-field { margin-bottom: 14px }`.
- **색상 스와치 `.modal-color`:** 24×24 원형 버튼, `aria-label`/`title` = 파랑/초록/주황/빨강/회색, `aria-pressed`로 선택 노출.

| 상태 | 스타일 |
|---|---|
| default | 배경 = 색상 토큰(아래 매핑), border 없음 |
| `.is-selected` | `box-shadow: 0 0 0 2px var(--surface-card), 0 0 0 4px var(--border-focus)` — 카드색 간격 + 포커스색 이중 링 |

- **색상 매핑(§1.1 토큰, spec 고정):** blue `--accent` / green `--status-success` / amber `--status-warning` / red `--status-danger` / gray `--text-muted`. 캘린더 칩 점(§4.5)과 동일 매핑.
- **닫기:** ESC 키(window keydown), 오버레이 클릭. 별도 닫기(X)·취소 버튼은 두지 않는다(spec).
- **저장 전 검증(클라이언트 선반영 — DB check 오류가 날것으로 새지 않게):** 제목 필수, 시작 필수, 종료 ≥ 시작. 실패 문구는 §6.7, 알림은 `window.alert`(§5.5 관행).
- **예시:** `<EventModal mode="create" initial={draft} onSave={handleSave} onClose={() => setModal(null)} />`

### 2.10 FormatToolbar (플로팅 서식 툴바) · `components/editor/FormatToolbar.tsx` + `.fmt-*` (`globals.css:857-886`)

- **용도:** 본문 에디터에서 **텍스트를 범위 선택했을 때만** 선택 위에 뜨는 말풍선 서식 툴바(상단 고정 툴바 없음 — 스프린트 결정). 마크 6종: 굵게·기울임·밑줄·취소선·인라인 코드·링크(`lib/editor/marks.ts`의 `MARKS`).
- **props:** `FormatToolbar { editor: Editor | null }`(null이면 렌더 안 함). 내용은 `FormatToolbarContent { editor }`로 분리(테스트 단위).
- **표시 조건(`fmtShouldShow`):** 편집 가능 + 범위 선택(`from !== to`) + 노드 선택 아님 + 선택 범위에 실제 텍스트 존재. BubbleMenu(`@tiptap/react/menus`) placement `top`, offset 6.
- **해부:** `<div class="fmt-bar" role="toolbar" aria-label="서식">` → `.icon-btn`(§2.2 재사용) ×6(`aria-pressed`) → (링크 열림 시) `.fmt-link-input > input`.
- **스타일:** `.fmt-bar` = bg `--surface-card`, border `1px --border-subtle`, radius-lg, `--shadow-lg`, padding 4px, gap 2px, `animation: mnPop 0.14s var(--ease-out)`(§1.5, reduced-motion에서 해제 §7). 활성 마크 버튼 = `.is-active`(bg `--surface-active`, color `--text-strong`).
- **링크 미니 입력 `.fmt-link-input`:** §2.7.1 `.input-sm`과 동일 토큰 — 높이 32px, padding `0 10px`, bg `--surface-subtle`, border `1px --border-subtle`, radius-md, `:focus-within` 시 bg `--surface-card` + `--border-focus` + `--shadow-focus`. 내부 `input` 폭 200px, font 13, color `--text-body`. 동작: 링크 버튼 클릭 → 입력 열림(기존 href 미리 채움) → **Enter 적용, 빈 값(공백 포함) = 링크 해제**(`applyLink`), Esc 닫기. `rel="noopener noreferrer nofollow"`는 Link 확장 기본값 유지, `openOnClick: false`(편집 중 클릭 이동 방지).
- **키보드:** 확장 기본 단축키 그대로 — Cmd/Ctrl+B(굵게)·I(기울임)·U(밑줄)·Shift+S(취소선)·E(코드).
- **버튼 순서·아이콘(lucide):** 굵게 `Bold` / 기울임 `Italic` / 밑줄 `Underline` / 취소선 `Strikethrough` / 코드 `Code` / 링크 `Link2`, 전부 size 16. 마크 버튼은 `onMouseDown preventDefault`로 선택 해제를 막는다.
- **예시:** `<FormatToolbar editor={editor} />` — `PostEditor`에서 `EditorContent` 형제로 렌더(결합부 불변).

### 2.11 SlashMenu (에디터 슬래시 커맨드 메뉴) · `components/editor/SlashMenu.tsx` + `.slash2-*` (`globals.css:888-912`)

- **용도:** 본문 에디터에서 `/` 로 여는 블록 삽입 메뉴. **기존 컴포저 슬래시 메뉴(§2.7.8 `.slash-menu`)와 별개 컴포넌트** — 그 화면은 불변이며, 같은 토큰(카드·hover·`__tile`)으로 시각 일관성만 맞춘다.
- **props:** `{ editor: Editor | null }`. `@tiptap/suggestion` 플러그인을 `editor.registerPlugin` 으로 런타임 등록(맨 앞 prepend — 확장 키맵보다 먼저 Enter/방향키를 받는다). PostEditor 결합부는 불변.
- **데이터:** 항목은 `lib/editor/blocks.ts`의 `BLOCKS` 레지스트리만 소비(하드코딩 금지). `keywords`+`label` 실시간 필터(`filterBlocks`, 대소문자 무시), **스키마 미등록 타입 자동 숨김**(`isBlockAvailable` — `editor.schema.nodes[type]` 검사). 삽입은 `insertBlock(editor, spec)` 단일 함수(`lib/editor/insert.ts`). 매치 없으면 `결과 없음` 한 줄(`.slash2-menu__empty`).
- **미디어 항목(이미지·파일)의 삽입은 노드 생성이 아니라 파일 선택기 오픈이다** — `openAttachmentPicker`(§5.13)로 위임하고, 업로드 성공 시에만 노드가 삽입된다(실패 시 블록 미삽입 계약 준수, P3 결선).
- **해부:** `<div class="slash2-menu" role="listbox" aria-label="블록 삽입">` → `.slash2-menu__item[role=option]`(button) × N — 내부 `.slash2-menu__tile`(아이콘 34×34) + `.slash2-menu__name`(라벨).
- **스타일:** `.slash2-menu` = `position: fixed`(트리거 문자 아래 +6px), 폭 240px, max-height 320px 스크롤, bg `--surface-card`, border `1px --border-subtle`, radius-lg, `--shadow-lg`, padding 6px, z-index 30, `mnPop 0.14s var(--ease-out)`(reduced-motion 해제 §7). `__item` = gap 12px, padding `6px 10px`, radius-md, hover·`.is-selected` bg `--surface-hover`(transition `--dur-fast --ease-standard`). `__tile` = 34×34, radius-md, bg `--accent-soft`, color `--accent`. `__name` = 13/600 `--text-strong`. `__empty` = 13, `--text-muted`, padding `8px 10px`.
- **아이콘 매핑(lucide, size 16 — 표시 전용, 레지스트리와 분리):** 텍스트 `Type` / 제목 1·2·3 `Heading1·2·3` / 불릿 목록 `List` / 번호 목록 `ListOrdered` / 체크박스 목록 `ListChecks` / 인용 `Quote` / 콜아웃 `Megaphone` / 토글 `ChevronRight` / 구분선 `Minus` / 이미지 `Image` / 파일 `Paperclip` / 표 `Table`. 미지정 폴백 `Type`.
- **키보드:** ↑/↓ 순환 이동(`.is-selected`), Enter 삽입, Esc 닫기(§5.11). 질의가 바뀌면 첫 항목으로 리셋. 항목 `onMouseDown preventDefault`로 에디터 포커스 유지, `onMouseEnter` 로 선택 이동.
- **예시:** `<SlashMenu editor={editor} />` — `PostEditor`에서 `EditorContent` 형제로 렌더.

### 2.12 드래그 핸들 · `components/editor/DragHandle.tsx` + `.handle-*`(`globals.css:812-857`)


- **용도:** 글 상세 본문(§4.3)에서 블록 hover 시 **왼쪽 여백**에 뜨는 `⋮⋮` 핸들.
  드래그 = 블록 이동(ProseMirror 기본), 클릭 = 블록 메뉴(타입 변환·복제·삭제 — §5.10).
- **구현:** `@tiptap/extension-drag-handle-react`(MIT). PostEditor **결합부는 수정하지 않고**
  `EditorContent` 형제 컴포넌트 `<EditorDragHandle editor={editor} />`로 부착 — 플러그인은
  컴포넌트가 스스로 등록·해제한다. 위치는 floating-ui가 계산(래퍼 `.handle-wrap`).
- **props:** `editor: Editor | null`(null·destroyed면 렌더 안 함).
- **해부:**
  - `.handle-wrap`: 플러그인이 위치를 잡는 래퍼(absolute, z-index 20). hover 대상이 없으면
    플러그인이 숨긴다(visibility hidden).
  - `.handle-btn`: 24×24, radius-sm, `GripVertical size={16}`, `aria-label="블록 옮기기"`,
    `aria-haspopup="menu"`/`aria-expanded`. 색 `--text-placeholder` → hover `--text-muted` +
    bg `--surface-hover`(transition `--dur-fast --ease-standard`). cursor `grab`(드래그 중 `grabbing`).
  - `.handle-menu`: 핸들 아래(`top: calc(100% + 6px)`), width 180px — §2.7.8 슬래시 메뉴와
    같은 카드 토큰(bg `--surface-card`, border `1px --border-subtle`, radius-lg, shadow-lg,
    padding 6px, `mnPop 0.14s --ease-out`, reduced-motion에서 해제).
  - `.handle-menu__group`: 11/700 `--text-muted`, `+0.02em`, padding `6px 10px 4px` —
    "전환" / "동작"(§2.7.8 `__group`과 동일 값).
  - `.handle-menu__item`: `role="menuitem"` 버튼, 폭 100%, padding `6px 10px`, radius-md,
    13/500 `--text-body`; hover·`:focus-visible` bg `--surface-hover`(outline none — 포커스는
    배경으로 표시). 삭제 항목 `--danger`: 색 `--status-danger`, hover bg `--danger-soft`
    (`.detail-delete-btn`과 동일 관행).

| 상태 | 스타일 |
|---|---|
| 핸들 default | `--text-placeholder`, bg none |
| 핸들 hover | `--text-muted`, bg `--surface-hover` |
| 메뉴 항목 hover/focus | bg `--surface-hover` |
| 삭제 항목 hover/focus | 색 `--status-danger`, bg `--danger-soft` |

- **메뉴 동작:** 열릴 때 `lockDragHandle`로 핸들 위치·표시 고정, 닫힐 때 unlock + 에디터
  재포커스. 바깥 클릭(pointerdown)·Esc로 닫힌다. 항목 실행 후 자동으로 닫힌다.
- **접근성:** 메뉴 `role="menu" aria-label="블록 메뉴"`, 항목 roving tabindex —
  열리면 첫 항목 포커스, 위/아래 화살표 순환 이동, Home/End, Enter=실행(네이티브 버튼),
  Esc=닫기(§5.10).
- **예시:** `<EditorDragHandle editor={editor} />` (PostEditor 내부에서만 사용)

### 2.13 이미지·파일 블록 (에디터 미디어 노드) · `lib/editor/media-nodes.ts` + `components/editor/nodes-media/` + `.attach-*`(globals.css 끝 "wt3: 본문 이미지·파일 블록" 블록)

본문 에디터의 `image`·`fileBlock` 노드(⑥⑧) — 블록 레지스트리 계약(`lib/editor/blocks.ts`)의 이름을 그대로 구현한다. 업로드 동작은 §5.13, 카피는 §6.9.

- **이미지 `.attach-img`** (사전 설치 `@tiptap/extension-image`, `allowBase64: false`):
  - `max-width:100%; height:auto; display:block; margin:8px 0; border-radius:--radius-lg(12px)` — 커버(§2.7.15)와 같은 라운드.
  - 선택 시(`.ProseMirror-selectednode`): `outline: 2px solid --border-focus`.
  - attrs: `src`(공개 URL)·`alt`(원본 파일명).
- **파일 블록 `.attach-file`** (커스텀 노드, `group:block; atom; draggable`, attrs `url`·`name`·`size`):
  - 노드 뷰 `FileBlockView`(React) — 카드형, `.post-card`(§2.7.9) 토큰 계열: flex·gap 14px, padding `10px 14px`, margin `8px 0`, bg `--surface-card`, border `1px --border-subtle`, radius-lg, shadow-xs. 선택 시 border `--border-focus`.
  - `__tile`: 38×38, radius-md, bg `--surface-subtle`, color `--text-secondary`(`FileText size={18}`).
  - `__name`: 14/600 `--text-strong`, 말줄임. `__size`: 12 `--text-muted`, `formatBytes`(1MB 미만 KB, 이상 MB 소수 첫째 자리 — 예 `512KB`, `1.5MB`).
  - `__download`: 30×30(`.icon-btn` 기하), `Download size={16}`, `href={url} download target="_blank"`, title/aria-label "다운로드".
  - 직렬화(노드 뷰 없는 환경): `<a data-file-block data-name data-size href class="attach-file">{name}</a>`.
- **업로드 중 `.attach-uploading`** (위젯 데코레이션 — 문서 무변경이라 실패 시 흔적이 남지 않는다):
  - `height:72px; margin:8px 0; radius-lg`, §2.7.15 스켈레톤과 동일한 shimmer(`mnShimmer 1.4s`). reduced-motion에서 정적 `--surface-hover`(§7 TODO 준수).

### 2.15 표 (에디터 테이블 블록) · `lib/editor/table-nodes.ts` + `components/editor/TableToolbar.tsx` + `.tbl-*`(globals.css 끝 "표" 블록)

본문 에디터의 `table`/`tableRow`/`tableHeader`/`tableCell` 노드(①) — 블록 레지스트리(`lib/editor/blocks.ts`)의 "표"(`id: "table"`, keywords 표/table/그리드/grid) 항목을 슬래시 메뉴(§2.11)가 삽입한다. `@tiptap/extension-table`(+ `-row`/`-header`/`-cell` 서브패키지) 기반, 이미지·파일(§2.13)과 같은 방식으로 `nodes.ts`(§4.3.1)와는 별도 파일에서 등록한다.

- **삽입:** `insertTable({ rows: 3, cols: 3, withHeaderRow: true })`(`lib/editor/insert.ts`) — 항상 3×3, 헤더 행 포함으로 시작.
- **셀 콘텐츠 제약:** 헤더·일반 셀 모두 `content: "(paragraph | bulletList | orderedList | taskList)+"`(`CELL_CONTENT`, `table-nodes.ts`로 export) — 표 중첩·콜아웃·토글·이미지 등 다른 블록 삽입 금지.
- **해부(HTMLAttributes 클래스):**
  - `<table class="tbl">` — `Table.configure({ resizable: true, HTMLAttributes: { class: "tbl" } })`.
  - `<th class="tbl-th">` / `<td class="tbl-td">` — 각각 `TableHeader`/`TableCell` 확장에 부여. `TableRow`는 클래스 없는 네이티브 `<tr>`.
- **스타일:** `.tbl` = `border-collapse: collapse`, `table-layout: fixed`, `width: 100%`, `margin: 12px 0`, `overflow: hidden`. 셀 공통(`td, th`) = `border: 1px solid --border-default`, `padding: 6px 10px`, `vertical-align: top`, `position: relative`(리사이즈 핸들·선택 오버레이 좌표 기준). 헤더 `th` = bg `--surface-subtle`, `font-weight: 600`, `text-align: left`.
- **셀 선택 오버레이 `.selectedCell`** (ProseMirror 표 플러그인이 붙이는 클래스, 직접 정의 아님): `::after` — `position: absolute; inset: 0; background: --accent-soft; mix-blend-mode: multiply`(밑에 텍스트가 비치도록 곱셈 블렌드), `pointer-events: none`.
- **열 리사이즈 핸들 `.column-resize-handle`** (플러그인 제공 클래스): 셀 우측 경계에 `position: absolute; right: -2px; top/bottom: 0; width: 4px; background: --accent; cursor: col-resize`.
- **표 셀 플로팅 툴바 `.tbl-toolbar`** (`TableToolbarContent`) — FormatToolbar(§2.10 `.fmt-bar`)와 동일한 BubbleMenu 패턴·카드 팝오버 토큰:
  - **표시 조건:** `editor.isEditable && editor.isActive("table")` — 커서가 표 셀 안에 있을 때만. placement `top`, offset 8.
  - **해부:** `<div class="tbl-toolbar" role="toolbar" aria-label="표 편집">` → `.icon-btn`(§2.2 재사용) × 7.
  - **버튼(순서·아이콘 lucide, size 16, 각각 `onMouseDown preventDefault`로 선택 유지):** 행 위 삽입 `ArrowUpToLine` / 행 아래 삽입 `ArrowDownToLine` / 열 왼쪽 삽입 `ArrowLeftToLine` / 열 오른쪽 삽입 `ArrowRightToLine` / 행 삭제 `Rows3` / 열 삭제 `Columns3` / 헤더 행 토글 `Heading`. 버튼마다 한국어 `title`/`aria-label`.
  - **스타일:** bg `--surface-card`, border `1px --border-subtle`, radius-lg, `--shadow-lg`, padding 4px, gap 2px, `animation: mnPop 0.14s var(--ease-out)`. `prefers-reduced-motion: reduce`에서 `animation: none`(§7 TODO 준수).
- **슬래시 메뉴 아이콘(§2.11):** `Table`(lucide, size 16, 표시 전용 — 레지스트리와 분리).
- **예시:** `<TableToolbar editor={editor} />` — `PostEditor`에서 `EditorContent` 형제로 렌더(결합부 불변, FormatToolbar·SlashMenu·DragHandle과 동일 위치 관행).

### 2.16 ColorPopover (색 팝오버) · `components/editor/ColorPopover.tsx` + `.clr-*`(globals.css 끝 "색 팝오버 (C3, §2.16)" 블록)

글자색·배경색을 고르는 스와치 그리드 팝오버(C3). §1.1.6의 `TEXT_COLORS`/`HIGHLIGHT_COLORS`(`lib/editor/palette.ts`)를 그대로 렌더링해 소비하며, 이 태스크는 팝오버 자체까지만이다 — 상단 툴바(Phase B, 미구현)가 이 컴포넌트를 여는 트리거를 아직 갖고 있지 않다.

- **props:** `ColorPopover({ editor: Editor; kind: "text" | "highlight" })`. `kind="text"` → `TEXT_COLORS`(글자색 8종), `kind="highlight"` → `HIGHLIGHT_COLORS`(배경색 8종).
- **해부:** `<div class="clr-pop" role="listbox" aria-label="글자색"|"배경색">` → `.clr-swatch`(button) × 8 — 색이 있는 항목은 `style={{ background: hex }}`, 각 배열의 첫 항목(`value: null`, "기본"/"없음")은 배경 없이 `.clr-swatch__none`(✕ 글리프)만 표시.
- **동작(적용/해제):** 클릭 시 `editor.chain().focus()` 체인으로 —
  - `kind="text"`: `value`가 있으면 `setColor(value)`, 첫 항목(`value: null`)이면 `unsetColor()`.
  - `kind="highlight"`: `value`가 있으면 `toggleHighlight({ color: value })`, 첫 항목이면 `unsetHighlight()`.
  - 모든 버튼은 `onMouseDown={(e) => e.preventDefault()}`로 클릭 시 에디터 선택 영역이 풀리지 않게 한다(FormatToolbar §2.10·SlashMenu §2.11·TableToolbar §2.15와 동일 관행).
- **스타일:** `.clr-pop` = 카드 팝오버 관례(§2.10 `.fmt-bar`/§2.15 `.tbl-toolbar`와 동일 토큰) — bg `--surface-card`, border `1px --border-subtle`, radius-lg, `--shadow-lg`, padding 10px, `animation: mnPop 0.14s var(--ease-out)`(reduced-motion에서 해제 §7). 그리드는 `grid-template-columns: repeat(4, 1fr)`, gap 6px(4열 × 2행).
  - `.clr-swatch`: 28×28, radius-sm, 배경 없음 항목은 `--surface-subtle`, 항상 `box-shadow: inset 0 0 0 1px --border-subtle`(옅은 색 스와치가 카드 배경과 경계 없이 섞이는 것을 방지). hover·`:focus-visible` = 바깥쪽 `0 0 0 2px --border-focus` 링 추가(배경색을 바꾸지 않음 — 스와치 자체가 색상 견본이라 hover로 색을 덮지 않는다).
  - `.clr-swatch__none`: 12px `--text-muted`.
- **접근성:** 컨테이너 `role="listbox"` + `aria-label`(종류별). 각 스와치는 `title`/`aria-label`이 색 이름 한국어 라벨(예: "빨강", "기본", "없음") — 색맹·스크린리더 사용자도 hex가 아닌 이름으로 식별한다.
- **예시:** `<ColorPopover editor={editor} kind="text" />` / `<ColorPopover editor={editor} kind="highlight" />` — 트리거(상단 툴바 버튼·표시 위치)는 이후 태스크(Phase B) 범위.

---

## 3. 앱 셸 / 레이아웃 (App Shell)

출처: `components/AppShell.tsx` + `.app-root/.topbar/.app-body/.sidebar/.app-main` (`globals.css:296-353`). 라우트 그룹 `app/(app)/layout.tsx`가 `<AppShell>`로 모든 앱 화면을 감싼다.

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
  4. `.topbar__bell`(position:relative): `<IconButton icon={Bell} title="알림" disabled />` + `.topbar__bell-dot`.
     - `__bell-dot`: `position:absolute; top:5px; right:6px; 7×7; border-radius:50%; bg --red-500; border:1.5px solid --surface-page; pointer-events:none`. **순수 장식** — 실제 알림 개수와 무관하다.
  5. `<IconButton icon={Search} title="검색" disabled />`
  6. `<IconButton icon={CircleHelp} title="도움말" disabled />`
  7. `<IconButton icon={LayoutGrid} title="앱" disabled />`
  8. `<IconButton icon={Menu} title="메뉴" disabled />`
- **미구현 표시:** 상단바 아이콘 5종은 전부 아직 만들지 않은 기능이라 `disabled`(§2.2)로 렌더된다 — 흐리게 + 기본 커서 + 툴팁 "…(준비 중)". 상단바에서 실제로 동작하는 것은 **가운데 테마 토글뿐**이다. 이전에는 `onClick`만 빼고 겉모습이 눌리는 버튼 그대로여서 고장으로 오해됐다.

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
  3. 검색 `.input-sm` — `<Search size={14}/>` + `<input value={search} onChange placeholder="글 검색">`(상태 `search`). 입력값은 "내 글" 목록을 제목+본문 부분 일치로 실시간 필터링한다(§5.8).
  4. 간격 `<div style={{height:12}} />`
  5. `.sidebar__scroll`:
     - `SidebarSection label="내 글" count={navPosts.length}` + 액션 `[{icon:Plus, title:"새 페이지", onClick:newPage}]`.
       - `navPosts = filterPosts(app.posts, search)`(§5.8) — 카운트는 검색 중엔 매치 개수, 평소엔 전체 개수.
       - 내용 — 두 갈래(⑤ 페이지 중첩):
         - **검색 중**: 평면 그대로 `navPosts.map(post => <SidebarItem icon={FileText} label={post.title.trim()||"제목 없음"} active={pathname===`/posts/${post.id}`} onClick={()=>router.push(`/posts/${post.id}`)} />)`(§5.8 — 트리는 표시 계층일 뿐).
         - **평소**: `<PostTree posts={app.posts} activeId collapsedIds={app.treeCollapsedIds} …/>` — `parent_id` 기반 페이지 트리(→ [§4.7](#47-사이드바-페이지-트리중첩--componentstreeposttreetsx--tree-)).
       - 빈 상태 분기(`.sidebar-section__empty`, §5.8): `app.posts.length === 0`이면 "아직 글이 없어요.", 글은 있는데 검색 매치가 없으면 "검색 결과가 없어요.".
     - 간격 `<div style={{height:10}} />`
     - `SidebarSection label="앱"`: `SidebarItem 캘린더(Calendar)` — **구현됨**: `active={pathname === "/calendar"}`, 클릭 시 `/calendar` 이동(§4.6). `휴지통(Trash2)` — **구현됨**: `active={pathname === "/trash"}`, 클릭 시 `/trash` 이동(§4.5). `할 일(SquareCheck)`만 **`disabled`(아직 만들지 않은 기능)** — `is-disabled` + `aria-disabled` + 툴팁 "…(준비 중)"(§2.5). 실제 구현 후보는 `docs/BACKLOG.md` 참조.

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

6개 화면: 로그인 `/login`, 업무 페이지(글 목록) `/`, 글 상세 `/posts/[id]`, 마이 페이지 `/mypage`, 휴지통 `/trash`, 캘린더 `/calendar`.

### 4.1 로그인 `/login` · `app/login/page.tsx` + `.login-*`(`globals.css:358-380`)

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

### 4.2 업무 페이지(글 목록) `/` · `app/(app)/page.tsx` + `.list-*`(`globals.css:385-467`)

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
         - `.post-card__tile`(`post.icon`이 있으면 `.tree-emoji--lg`(18px) 이모지, 없으면 `FileText size={18}` — ⑦)
         - `.post-card__body`[`.post-card__title`(=`post.title.trim()||"제목 없음"`) `<br/>` `.post-card__preview`(=`docToPreview(post.contentDoc ?? textToDoc(post.content)) || "내용 없음"`)]
           - **미리보기 = 내용 있는 첫 블록 한 줄**(노션 관행). `docToPreview`(`lib/editor/doc.ts`)가 최상위 블록을 훑어 텍스트가 있는 첫 블록만 뽑고, 블록 안 `hardBreak`·연속 공백은 한 칸으로 정규화한다. 빈 문단·이미지·구분선처럼 텍스트 없는 블록은 건너뛰며, 그런 블록뿐이면 빈 문자열 → 호출부가 "내용 없음"을 표시한다. 상세와 같은 dual-read(`contentDoc ?? textToDoc(content)`)라 `content_doc` 없는 레거시 글도 첫 줄이 잡힌다. **표(table)가 첫 블록이면 표 전체가 아니라 첫 행만** 보여준다 — 첫 블록의 텍스트에서 첫 줄만 취하는 규칙이라, 행 사이 줄바꿈으로 구분되는 표에서 자연히 첫 행만 남는다.
           - **말줄임(…)은 CSS 담당** — `.post-card__preview`의 `white-space:nowrap; overflow:hidden; text-overflow:ellipsis`(globals.css:452)가 카드 폭에 맞춰 자른다. 그래서 JS에서 글자 수로 자르지 않는다(고정 컷은 넓은 화면에서 "…" 없이 잘린 것처럼 보인다). `docToPreview` 내부 200자 상한은 시각 요소가 아니라 초장문 문단이 DOM에 통째로 실리는 것을 막는 안전장치다.
         - `.post-card__date`(=`formatDate(post.createdAt)`)
         - `.post-card__chevron`(`ChevronRight size={16}`)
     - **빈 상태(`.empty-state`):**
       - `.empty-state__tile`(`FilePlus2 size={40}`)
       - `.empty-state__title` "첫 글을 만들어 보세요"
       - `.empty-state__desc`: "위 입력창에 " `<b>/page</b>` " 를 입력하고 Enter를 누르거나" `<br/>` "'새 페이지' 버튼을 눌러 시작하세요." (원문에 좌우 홑따옴표 `‘새 페이지’` 사용)
- **상호작용(슬래시 커맨드):** → [§5.1](#51-page-슬래시-커맨드로-새-글-생성) 참조. 글 생성은 서버 왕복이므로 비동기다.

### 4.3 글 상세 `/posts/[id]` · `app/(app)/posts/[id]/page.tsx` + `.detail-*`(`globals.css:472-544`)

- **컨테이너:** `.detail-page`(max-width 760px, 중앙, padding `18px 28px 96px`).
- **구성(위→아래):**
  1. **브레드크럼** `.detail-breadcrumb`(gap 8px, margin-bottom 22px):
     - `<IconButton icon={ArrowLeft} title="뒤로" onClick={()=>router.push("/")} />`
     - `.detail-breadcrumb__root`(13, `--text-muted`, hover `--text-secondary`) "내 업무" (onClick → `/`)
     - **조상 체인(⑤, §5.12)**: `ancestorChain(app.posts, post.id)`(루트→직계 부모 순, `lib/tree.ts`)의 각 조상마다 `__sep` + `__root` 스타일 버튼(제목 폴백 "제목 없음", onClick → 해당 글). 부모가 휴지통이면 체인이 거기서 끊긴다.
     - `.detail-breadcrumb__sep`(`ChevronRight size={14}`, color `--text-placeholder`)
     - `.detail-breadcrumb__current`(13/500, `--text-secondary`, max-width 280px 말줄임) = `post.title.trim() || "제목 없음"`
     - **이모지(⑦):** 조상·현재 크럼 모두 `icon`이 있으면 제목 앞에 `` `${icon} ` ``를 붙인다(없으면 기존 표시 유지).
     - `.detail-breadcrumb__spacer`(flex:1)
     - `.detail-delete-btn`(`Trash2 size={16}` + "삭제", onClick `handleDelete`)
  2. **커버 이미지** `<PostCover key={`cover-${post.id}`} />` → `.detail-cover`(§2.7.13), 브레드크럼과 제목 사이. 랜덤 고양이 사진(cataas). 로딩 시 스켈레톤(스피너 아님) → 이미지, 실패 시 중립 폴백. 장식 요소(`aria-hidden`), 편집 비방해(FR-007).
  2b. **페이지 아이콘(⑦)** `<PageIconButton icon={post.icon} onChange={(icon)=>app.setPostIcon(post.id, icon)} />` → `.icon-pick-*`(globals.css 끝 "wt3: 페이지 이모지 아이콘" 블록) — 커버 아래·제목 위(`.icon-pick-row`, `position:relative; margin-bottom:6px`):
     - **아이콘 있음** `.icon-pick-btn`: 이모지 **40px**(line-height 1), padding `2px 6px`, radius-md, hover bg `--surface-hover`. title/aria-label "아이콘 변경".
     - **아이콘 없음** `.icon-pick-ghost`(유령 버튼): `Smile size={14}` + "아이콘 추가", height 28px, 13/500 `--text-muted`, 기본 `opacity:0` → 줄 hover·`:focus-visible`에서 1(§2.6 hover 노출 관행). hover bg `--surface-hover`.
     - **팝오버 `.icon-pick`**(`role="dialog" aria-label="아이콘 선택"`): `absolute; top:calc(100%+6px); left:0; z-index:30`, bg `--surface-card`, border `1px --border-subtle`, radius-lg, shadow-lg, padding 10px, `mnPop 0.14s`(reduced-motion에서 none, §7) — 슬래시 메뉴(§2.7.8)와 같은 카드 관행.
       - `__grid`: `repeat(8, 32px)` 그리드, gap 2px — **고정 이모지 24종**(`PAGE_ICONS`, 외부 라이브러리 금지). `__item`: 32×32, font 18, radius-sm, hover `--surface-hover`.
       - `__footer`(아이콘 있을 때만): margin/padding-top 8px, border-top `1px --border-subtle` + `__remove` "제거"(12/600 `--text-muted`, hover `--surface-hover`).
       - 닫기: 선택·ESC·바깥 클릭.
  3. **제목** `<input class="detail-title" placeholder="제목 없음">` (34/700, -0.02em, lh 1.25, margin-bottom 10px), value=`post.title`, onChange → `updatePost(id,{title})`.
  4. **메타** `.detail-meta`(gap 7px, margin-bottom 22px, color `--text-muted`): `Calendar size={14}` + `<span>{formatDate(post.createdAt)} 작성</span>` + `.detail-meta__dot`(3×3 원, bg `--border-strong` — 라이트 #d3d5d8로 이전과 동일, 다크 #4d4d4d) + `<span>자동 저장됨</span>`.
  5. **본문** `<PostEditor>`(`components/editor/PostEditor.tsx` — Tiptap v3, P1은 문단 전용) — contentEditable 컨테이너가 기존 `.detail-content` 클래스(15/1.75, `--text-body`, min-height 340px)를 그대로 입는다. placeholder "내용을 입력하세요. 떠오르는 생각, 할 일, 메모를 자유롭게 기록해 보세요."는 Placeholder 확장 + `.is-editor-empty::before`(색 `--text-placeholder`)로 동일하게 표시. 초기 문서 = `post.contentDoc ?? textToDoc(post.content)`(dual-read), 편집 시 `onDocChange` → `updatePost(id, buildEditPatch(doc))`(dual-write, §5.2). 글 전환 시 `key={`editor-${post.id}`} ` remount(형제 `PostCover`가 `cover-*`를 쓰므로 접두사로 key 유일성 확보 — §2.7.15). ProseMirror 보정 CSS는 globals.css **파일 끝** "에디터 (P1)" 블록.
  6. **글자 수 칩** `<CharCount text={post.content} />` → `.detail-charcount`(§2.7.12), 본문 다음 마지막 자식. `post.content`만 전달(제목 제외, FR-008), grapheme 수를 우측 하단 sticky로 실시간 표시. 빈 내용 → `0자`.
- **상호작용:**
  - `handleDelete`: `window.confirm("이 글을 휴지통으로 옮길까요? 휴지통에서 복원할 수 있어요.")` → 확인 시 `deletePost(id)`(소프트 삭제, §5.3) + `router.push("/")`.
  - 가드: `if (app.loaded && !post) router.replace("/")`(삭제/없는 글). `if (!post) return null`.
  - 제목/내용은 입력 즉시 로컬 반영 + 600ms 디바운스로 서버 저장(§5.2).

#### 4.3.1 본문 블록 타입 카탈로그 · `lib/editor/nodes.ts` + `.blk-*`(`globals.css:749-810`)

wt2 ④ — `lib/editor/blocks.ts` 계약 14종 중 이미지·파일(wt3 소유, §2.13)과 표(①, §2.15)를
뺀 **11종**을 `lib/editor/nodes.ts`(에디터 스키마)에 등록한다. 시각 값은 전부 §1 토큰이며,
스타일은 globals.css **파일 끝** `.blk-*` 조각만 쓴다(각 확장에 `HTMLAttributes.class`로 부여).
표는 별도 파일 `lib/editor/table-nodes.ts`에서 `.tbl-*` 클래스로 등록되며(상세는 §2.15),
아래 카탈로그에는 참조용으로 함께 싣는다.

| 블록(타입) | 클래스 | 마크다운 단축 | 시각 값 |
|---|---|---|---|
| 텍스트 `paragraph` | — (P1) | — | 15/1.75 `--text-body`(`.detail-content` 상속, margin 0) |
| 제목 1 `heading`(level 1) | `.blk-heading`(h1) | `# ` | **26/700**, `-0.02em`, lh 1.3, margin `22px 0 6px` |
| 제목 2 `heading`(level 2) | `.blk-heading`(h2) | `## ` | **20/700**, `-0.02em`, lh 1.3, margin `18px 0 4px` |
| 제목 3 `heading`(level 3) | `.blk-heading`(h3) | `### ` | **17/700**, `-0.02em`, lh 1.3, margin `14px 0 4px` |
| 불릿 목록 `bulletList` | `.blk-ul`/`.blk-li` | `- ` | margin `4px 0`, padding-left 24px, 항목 margin `2px 0` |
| 번호 목록 `orderedList` | `.blk-ol`/`.blk-li` | `1. ` | 불릿과 동일 |
| 체크박스 목록 `taskList` | `.blk-task`(+item) | `[] ` | list-style none, 항목 flex gap 8px, 체크박스 `accent-color: --accent`, 완료 항목 `--text-muted` + line-through. **중첩 허용**(`TaskItem nested`) |
| 인용 `blockquote` | `.blk-quote` | `> ` | border-left `3px --border-strong`, padding `2px 0 2px 12px`, margin `6px 0` |
| 콜아웃 `callout`(커스텀) | `.blk-callout` | — (슬래시 메뉴·핸들 변환) | bg `--accent-soft`, radius-lg, padding `14px 16px`, flex gap 10px. 아이콘 `💡` 고정(P1) — CSS `::before` 장식이라 문서 텍스트에 포함되지 않음. 내부는 문단(`paragraph+`) |
| 토글 `toggle`(커스텀) | `.blk-toggle*` | — (〃) | 아래 상세 |
| 구분선 `horizontalRule` | `.blk-hr` | `---` | border-top `1px --border-default`, margin `18px 0`; 선택 시(`ProseMirror-selectednode`) `--border-focus` |
| 표 `table`(+`tableRow`/`tableHeader`/`tableCell`, 별도 파일 `table-nodes.ts`) | `.tbl`/`.tbl-th`/`.tbl-td` | — (슬래시 메뉴 "/표") | 3×3 헤더 포함으로 삽입, 셀은 문단/목록 3종만 허용 — **상세는 §2.15** |

- **제목 스케일 확정**(§1.2 스케일에 없던 값의 신설 기록): h1 26/700, h2 20/700, h3 17/700 —
  모두 `letter-spacing: -0.02em`(§1.2 "큰 제목" 규칙 준용), 색 `--text-strong`, `:first-child`는 margin-top 0.
- **toggle 상세** (`components/editor/nodes/ToggleView.tsx` — React NodeView):
  - 구조: `.blk-toggle`(flex, gap 4px) = `.blk-toggle__btn`(24×24, radius-sm, `ChevronRight 16`,
    `--text-muted` → hover bg `--surface-hover` + `--text-secondary`) + `.blk-toggle__content`(flex:1).
  - 펼침 표시: `.is-open`에서 삼각형 `rotate(90deg)`, `transition: transform --dur-fast --ease-standard`
    (reduced-motion에서 해제 — §7 TODO 패턴, globals.css 끝 미디어 블록).
  - 접힘: `.is-open`이 없으면 `__content`의 첫 자식(제목행)만 보이고 나머지는 `display:none`.
    내용은 문서에 남으므로 검색·글자 수(`docToText`)는 접힘과 무관하다.
  - 상태 저장: 노드 attrs `open`(기본 true) → 직렬화 시 `data-open="true|false"`. 스키마 `paragraph block*`.
  - 접근성: 버튼 `aria-expanded={open}`, `aria-label` `토글 접기`/`토글 펼치기`(§6.4).
- 마크다운 단축 입력은 각 확장의 기본 inputRules(§5.10). `#### `는 level 1–3 제한으로 변환되지 않는다.

### 4.4 마이 페이지 `/mypage` · `app/(app)/mypage/page.tsx` + `.mypage*`(`globals.css:549-613`)

- **컨테이너:** `.mypage`(max-width 600px, 중앙, padding `40px 28px 80px`).
- **구성(위→아래):**
  1. `<h1 class="mypage__title">` "마이 페이지" (26/700).
  2. `<p class="mypage__subtitle">` "서비스에서 사용할 프로필 정보를 관리하세요." (14, `--text-secondary`, margin-bottom 28px).
  3. **프로필 카드** `.mypage-card`(bg card, border 1px `--border-subtle`, radius-lg, shadow-xs, padding 28px):
     - **아바타 행** `.mypage-avatar-row`(gap 18px, padding-bottom 24px, border-bottom 1px `--border-subtle`):
       - `<Avatar name={profile.displayName} src={profile.avatarUrl} size={72} />`
       - `.mypage-avatar-row__body`: `__name` "프로필 이미지"(15/600) + `__hint` "JPG, PNG · 5MB 이하 정사각형 이미지를 권장합니다."(12, `--text-muted`) + `.upload-btn`(`<label>`): `ImageIcon size={16}` + "사진 변경"(업로드 중 "업로드 중…") + 숨겨진 `<input type="file" accept="image/*" style={{display:"none"}}>`(업로드 중 `disabled`).
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
  - `onAvatarPick`(프로필 사진 업로드, `lib/profile-image.ts`): 별명·자기소개와 달리 **"변경사항 저장"을 기다리지 않고 고르는 즉시** 반영된다.
    - 검사(`validateImageFile`) → 통과 못 하면 `window.alert`만 하고 끝. 허용: `image/jpeg|png|webp|gif`, 1byte~5MB(`MAX_IMAGE_BYTES`).
    - 경로(`newImagePath`) = `crypto.randomUUID()`(uuidv4) + 확장자. 사용자 파일명은 남기지 않는다 — 한글·경로 조작 문자를 차단하고, 같은 이름의 파일을 다시 올려도 덮어쓰이지 않는다.
    - 업로드(`profile-image` 공개 버킷, `upsert:false`) → `profile.image_path`에 **경로만** update(`.select()`로 갱신 행 확인, 0행이면 실패 — `saveIntroduction`과 같은 이유) → 성공 시에만 이전 파일 `remove`(고아 파일 방지). DB 기록이 실패하면 방금 올린 파일을 되돌려 지운다.
    - 성공 시 `app.setProfileImagePath(path)` → 마이페이지와 **사이드바 아바타가 함께** 갱신된다. 실패는 `window.alert`(§5.5 오류 처리 관행).
    - 업로드 중에는 `uploading` 상태로 라벨·`disabled`를 바꾼다(§2.7.3). 같은 파일을 다시 고를 수 있도록 처리 후 `input.value = ""`로 비운다.
  - **다운로드 URL 분리:** 앞부분(스토리지 주소 + 버킷명)은 환경변수 `NEXT_PUBLIC_SUPABASE_STORAGE_URL`, 뒷부분(버킷 이후 경로)은 `profile.image_path`에 나눠 둔다. 표시할 때 `joinStorageUrl`이 슬래시 중복 없이 합친다. 환경변수나 경로가 없으면 `null` → 구글 계정 사진으로 폴백. 버킷 RLS 설정은 `docs/profile-image-storage-setup.sql`.
  - 로그아웃: `auth.signOut()` → Supabase 세션 제거 → (AppShell 가드가) `/login`으로 리다이렉트.

### 4.5 휴지통 `/trash` · `app/(app)/trash/page.tsx` + `.post-card--trash`(`globals.css:615-622`)

소프트 삭제(§5.3)된 글의 목록·복원·영구 삭제. 신규 토큰 없이 기존 조각을 재사용한다.

- **컨테이너:** `.list-page` 재사용(§4.2와 동일 — max-width 820px, 중앙, padding `36px 28px 72px`).
- **데이터:** 진입 시 `fetchTrashedPosts()`(§5.5)를 화면 **로컬 상태**로 fetch — 스토어에 넣지 않는다. 로드 전에는 `null`을 반환해 아무것도 그리지 않는다(§3.5 셸 가드와 같은 관행). 조회 실패는 `window.alert` 후 빈 목록.
- **구성(위→아래):**
  1. `<h1 class="list-page__title">` "휴지통" (28/700).
  2. `<p class="list-page__subtitle">` "삭제한 글을 복원하거나 영구적으로 지울 수 있어요." (14, `--text-secondary`).
  3. **목록 or 빈 상태** (`trashed.length > 0` 분기):
     - **목록 있을 때:**
       - `.list-head`: `.list-head__label` "삭제된 글" + `<Badge>{count}</Badge>` (정렬 IconButton 없음).
       - `.post-list`: 각 글 `.post-card.post-card--trash` — **클릭 이동 없음**(role/tabIndex/onClick 없음):
         - `.post-card__tile`(`FileText size={18}`) + `.post-card__body`[`__title`(폴백 "제목 없음") + `__preview`(폴백 "내용 없음") — §4.2와 동일 규칙]
         - `.post-card__date`: `` `${formatDate(post.deletedAt ?? post.createdAt)} 삭제` `` — 목록 정렬 기준(삭제 시각)과 같은 값을 보여준다.
         - `.post-card__actions`: `<Button variant="secondary" iconLeft={RotateCcw}>복원</Button>` + `.detail-delete-btn`(§2.7.2 재사용, `Trash2 size={16}` + "영구 삭제").
     - **빈 상태(`.empty-state`, §2.7.10 재사용):** `__tile`(`Trash2 size={40}` — 목록 화면의 `FilePlus2` 대신) + `__title` "휴지통이 비어 있어요." + `__desc` "글을 삭제하면 여기로 옮겨지고, 언제든 복원할 수 있어요." (한 줄).
- **CSS 조각(파일 끝, `globals.css:615-622`):**
  - `.post-card--trash`: `cursor: default`; `:hover`에서 기본 상태 값으로 고정(border `--border-subtle`, shadow `--shadow-xs`, `transform: none`) — 이동이 없는 카드가 눌리는 것처럼 보이지 않게 한다.
  - `.post-card__actions`: `display:flex; align-items:center; gap:8px; flex:none` — 카드 우측 액션 묶음.
- **상호작용:**
  - **복원:** `restorePost(id)`(UPDATE `deleted_at=null`, A2 계약 §5.5) 성공 시 로컬 목록에서 제거 + 스토어 `restoreToList(post)` → 목록·사이드바에 즉시 되돌아온다. 실패(서버 오류·0행)는 `window.alert`, 목록 유지.
  - **영구 삭제:** `window.confirm("이 글을 영구 삭제할까요? 영구 삭제하면 되돌릴 수 없어요.")` → 확인 시 `deletePostById(id)`(DELETE). 성공 시 로컬 목록에서 제거 + **첨부 정리** `deletePostAttachments(userId, id)` 비동기 호출(결과 무시 — 실패는 고아 첨부 고정 포맷 로깅, §5.13). 실패는 `window.alert`(첨부 정리는 호출하지 않음).
  - 진입은 사이드바 "휴지통" 항목(§3.3), `pathname === "/trash"`에서 활성 표시.

### 4.6 캘린더 `/calendar` · `app/(app)/calendar/page.tsx` + `components/calendar/CalendarView.tsx` + `.calendar-*`(`globals.css:623-681`)

- **컨테이너:** `.calendar-page`(max-width 980px, 중앙, padding `36px 28px 72px`) — 7열 그리드가 필요해 목록(820px)보다 넓다.
- **구성(위→아래):**
  1. **헤더** `.calendar-head`(flex, gap 8px, margin-bottom 18px):
     - `<h1 class="calendar-head__title">` `{YYYY}년 {M}월`(예: "2026년 7월", 26/700, `-0.02em`, `--text-strong`)
     - `.calendar-head__spacer`(flex:1)
     - `<Button variant="secondary" onClick={goToday}>오늘</Button>`
     - `<IconButton icon={ChevronLeft} title="이전 달" />` + `<IconButton icon={ChevronRight} title="다음 달" />`
  2. **요일 행** `.calendar-weekdays`(grid 7열, `aria-hidden` — 각 셀이 날짜를 이름으로 노출): `일`~`토`, 12/700 `+0.02em` `--text-muted`, 중앙 정렬, padding `6px 8px`.
  3. **그리드** `.calendar-grid`(grid 7열, 바깥 위·왼쪽 + 각 셀 오른쪽·아래 `1px --border-subtle` 선): `monthGrid()`가 만든 일요일 시작 6주 **42칸 고정**(달이 바뀌어도 높이 불변).
     - `.calendar-cell`: `min-height: 96px; padding: 6px`, column flex(gap 2px), bg `--surface-page`, cursor pointer, hover `--surface-hover`, transition background 120ms. `role="button" tabIndex={0}`, `aria-label="{M}월 {D}일 일정 추가"`, Enter로도 열림.
     - `.calendar-cell__date`: 22px 원형 배지 자리(min-width 22/height 22), 12/500 `--text-secondary`. **다른 달**(`.is-outside`)은 `--text-placeholder`. **오늘**(`.is-today`)은 bg `--accent` + `--text-on-accent`/600(§1.1 액센트 계열 강조).
     - **일정 칩** `.calendar-chip`(`<button>`, 높이 20px, padding `0 6px`, radius-sm(6px), font 12 `--text-body`, hover `--surface-hover`): `.calendar-chip__dot`(6×6 원형, 색상 토큰 — §2.9 매핑과 동일) + `.calendar-chip__title`(말줄임). `title` 속성 = 일정 제목(말줄임 보완 툴팁). 클릭 시 셀로 전파를 막고 수정 모달을 연다.
     - 셀당 칩 **최대 3개**, 초과분은 `.calendar-more`(12, `--text-muted`) `+{N}`.
     - 여러 날 일정은 연속 바 없이 **걸치는 날짜마다 칩**으로 표시한다(범위 단순화 — spec).
  4. **모달**: [§2.9 EventModal](#29-eventmodal--componentscalendareventmodaltsx). 날짜 셀 클릭 → 추가(해당 날짜 프리필), 칩 클릭 → 수정.
- **데이터:** 표시 달의 그리드(42칸) 범위를 `fetchMyEvents(fromIso, toIso)`로 조회(`start_at` 기준) — 앞뒤 달 채움 칸의 일정도 함께 보여야 해서 월이 아니라 그리드 범위다. 달 이동·오늘 복귀 시 재조회. 실패 시 `window.alert` + 빈 달력 유지.
- **props:** `CalendarView`의 `initialDate?: Date`는 테스트가 표시 달을 고정하기 위한 것(기본: 오늘이 속한 달).
- **상호작용 상세:** → [§5.9](#59-캘린더-일정-crud-libeventsts--componentscalendar).

### 4.7 사이드바 페이지 트리(중첩) · `components/tree/PostTree.tsx` + `.tree-*`(globals.css 끝 "wt3: 사이드바 페이지 트리" 블록)

사이드바 "내 글"의 평면 목록을 `page.parent_id` 기반 트리로 표시한다(⑤). 계층 계산은
`lib/tree.ts`의 순수 함수 `buildTree`가 담당하고, 데이터는 평면 그대로다(검색 §5.8은 평면 유지).

- **행 구성(`.tree-row`, flex·gap 2px):** 들여쓰기는 인라인 `padding-left: depth × 12px`(단계당 12px).
  1. **접기 삼각형 `.tree-toggle`** — 자식 있는 항목만 `<button>`(18×18, radius-sm, `--text-muted`, hover bg `--surface-hover`): `ChevronRight size={12}`가 펼침(`.is-open`)에서 90° 회전(`transform`, `--dur-fast --ease-standard`). `aria-expanded` + `aria-label` "하위 페이지 접기/펼치기". 자식 없는 항목은 같은 폭의 스페이서 `.tree-toggle--spacer`(`visibility:hidden`)로 열을 맞춘다.
  2. **글 항목** — 기존 `.sidebar-item`(§2.5) 재사용(`flex:1; min-width:0; padding:0 8px 0 4px`로 재조정): 아이콘 자리에는 `post.icon`이 있으면 `.tree-emoji`(15px) 이모지, 없으면 `FileText size={16}`(⑦) + 제목(폴백 "제목 없음", `title` 툴팁), 열린 글이면 `is-active`.
  3. **하위 페이지 추가 `.tree-add`** — 20×20, radius-sm, `Plus size={14}`, 기본 `opacity:0` → 행 hover·`:focus-visible`에서 1(§2.6 섹션 액션과 같은 관행). title/aria-label "하위 페이지 추가".
- **접힘 상태:** 스토어 `treeCollapsedIds`(§5.5 localStorage `treeCollapsed`). 접힌 항목의 자손 행은 렌더하지 않는다.
- **레일(§3.3.1):** 접힌 사이드바에서는 "내 글" 섹션 전체가 숨겨지므로 트리도 보이지 않는다(기존과 동일).
- **동작 상세:** → §5.12.

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

- 상세 페이지에서 제목은 `onChange` 즉시 `updatePost(id, {title})`, 본문은 에디터 `onDocChange`가
  `updatePost(id, {content, contentDoc})`를 호출한다 — **dual-write**: 블록 JSON(`content_doc`)과
  플레인 projection(`content` = `docToText(doc)`)을 항상 함께 저장해 사이드바 검색·폴백 렌더·
  `docToText(content_doc) === content` 불변식(손실 제로 계약)을 지킨다. 변환은 `lib/editor/doc.ts`.
- **로컬은 즉시** 반영해 입력 반응성을 유지하고, **서버 UPDATE는 id별 600ms 디바운스**로 1회만 보낸다(연속 타이핑 = 요청 1회).
- 언마운트/화면 이탈 시 대기 중인 변경을 flush 해 유실을 막는다. 삭제된 글의 대기 중 편집은 취소한다.
- 별도 저장 버튼 없음. UI 표기: 메타 영역 "자동 저장됨". 저장 실패 시 알림.

### 5.3 글 삭제 (소프트 삭제 — 휴지통 이동)

- 삭제의 의미는 **소프트 삭제**다: 행을 지우지 않고 `deleted_at`에 시각을 기록해 휴지통(§4.5)으로 보낸다. 영구 삭제는 휴지통 화면에서만 일어난다.
- 상세 `handleDelete`: `window.confirm("이 글을 휴지통으로 옮길까요? 휴지통에서 복원할 수 있어요.")` → 확인 시 `deletePost(id)` → `/`로 이동.
- `deletePost`: 로컬에서 **낙관적으로 제거**한 뒤 서버에 `softDeletePost`(UPDATE `deleted_at`). 실패하면(서버 오류 또는 A2 0행) 알림 + 재조회로 서버 진실에 맞춰 복구한다. 대기 중이던 디바운스 편집 저장은 취소한다.
- 타인의 글 삭제 시도는 RLS(`page_update_own`)가 서버에서 거부한다 — 에러가 아니라 **0행**으로 오며, A2 계약(§5.5)이 이를 실패로 승격한다.
- 복원·영구 삭제 동작은 §4.5(휴지통 화면) 참조.

### 5.4 로그인 / 로그아웃 / 인증 가드

- 인증은 Supabase 세션(`lib/auth.tsx`의 `useAuth`)이 담당한다 — `signInWithGoogle()` / `signOut()`.
- 로그인 페이지: 이미 로그인 시(`auth.ready && auth.session`) `/`로 `replace`.
- AppShell: `auth.ready && !auth.session` → `/login`으로 `replace`. `!auth.ready || !auth.session || !app.loaded`면 `return null`.
- 상세: `app.loaded && !post` → `/`로 `replace`(삭제됐거나 내 소유가 아닌 글).

### 5.5 상태 모델 · 영속화 (서버 + 로컬 오버라이드)

- **Post 타입:** `{ id: string; title: string; content: string; createdAt: number; deletedAt: number | null; contentDoc: EditorDoc | null; parentId: string | null; icon: string | null }`. (`favorite` 없음 — 기능 제거. `deletedAt`은 소프트 삭제 시각 — null이면 살아 있는 글, 값이 있으면 휴지통에 있다. §4.5/§5.3. `parentId`는 페이지 중첩 §5.12 — null이면 루트. `icon`은 페이지 이모지 §5.12 — null이면 기본 아이콘.)
- **AppState:** `{ loaded, posts: Post[], nickname: string|null, profileImagePath: string|null, sidebarCollapsed: boolean, treeCollapsedIds: string[] }`. 스토어는 여기에 파생값 `profileImageUrl`(= 환경변수 앞부분 + `profileImagePath`)을 얹어 노출한다. (인증/신원은 `AppState`가 아니라 Supabase 세션 — `lib/auth.tsx`의 `useAuth`.)
- **신원 파생값(`useProfile`, `lib/profile.ts`):** 구글 계정(`user_metadata.full_name`/`name`, `email`, `avatar_url`/`picture`)에 오버라이드를 병합 → `displayName = nickname || 구글이름 || email`, `email = 구글 이메일`, `avatarUrl = 업로드한 사진 URL || 구글 사진`. 별명은 로컬(localStorage), 사진은 서버(`profile.image_path`)에서 온다. 하드코딩 김민수/minsu.kim 제거됨.
- **게시글 저장소:** Supabase `public.page` 테이블(`id` bigint, `created_at` timestamptz, `title`, `content`, `user_id` uuid, `deleted_at` timestamptz null — 소프트 삭제 마커).
  - **행 ↔ Post 매핑(`lib/posts.ts`):** `id: String(row.id)`, `title/content: ?? ""`, `createdAt: Date.parse(row.created_at)`, `deletedAt: row.deleted_at ? Date.parse(row.deleted_at) : null`.
  - **로드:** 세션이 확정되면(`auth.ready` + 세션 있음) `select("*").is("deleted_at", null).order("created_at", {ascending:false})` → `loaded = true`. 휴지통 글은 목록·사이드바에서 제외한다. 클라이언트에서 user 필터를 걸지 않는다 — 격리는 RLS가 강제한다.
  - **휴지통 조회(`fetchTrashedPosts`):** `.not("deleted_at", "is", null)` + `deleted_at` 내림차순(최근에 지운 글 우선). 스토어에 넣지 않고 `/trash` 화면의 로컬 상태로만 쓴다(§4.5).
  - **소프트 삭제 쓰기 계약(A2):** `softDeletePost`(deleted_at ← 현재 시각 ISO)와 `restorePost`(deleted_at ← null)는 `.select("id")`로 영향받은 행을 돌려받아 **0행이면 throw** 한다 — RLS 거부는 에러가 아니라 0행으로 온다(`docs/BACKLOG.md` A2). 영구 삭제는 기존 `deletePostById`(DELETE)를 재사용한다.
  - **로그아웃:** `posts = []`, `loaded` 재설정.
  - **createPost:** `insert({ title: title.trim(), content: "", user_id })` → 반환 행을 `Post`로 매핑해 배열 **맨 앞에 추가**(최신 우선). `user_id`를 반드시 명시한다(DB 기본값이 `gen_random_uuid()`라 생략하면 소유자 미상 행이 생긴다). 비로그인이면 서버 호출 없이 `null`.
  - **시드 없음:** 신규 사용자는 빈 목록 + 빈 상태 UI에서 시작한다.
- **프로필 사진 저장소:** Supabase Storage `profile-image` 공개 버킷 + `public.profile.image_path`.
  - **로드:** 세션이 확정되면 게시글과 같은 effect에서 `fetchImagePath(userId)` → `profileImagePath`. 사이드바에도 나오므로 마이 페이지 진입과 무관하게 읽는다. 실패해도 구글 사진으로 폴백되니 알림 없이 콘솔 로깅만 한다.
  - **로그아웃:** `profileImagePath = null`(별명과 같은 이유 — 다음 사용자에게 이전 사용자 사진이 보이면 안 된다).
  - 업로드·URL 분리 규칙은 §4.4 `onAvatarPick` 참조.
- **localStorage 키:** `"mini-notion-v1"` — **별명 + UI 환경설정 전용**.
  - **저장 스키마:** `JSON.stringify({ nickname, sidebarCollapsed, treeCollapsed })`. (게시글·프로필 사진은 저장하지 않는다 — 서버가 원본이다. 인증 세션은 supabase-js가 별도 키로 관리.)
  - `sidebarCollapsed`는 `!!d.sidebarCollapsed`로 읽는다 — 이 필드가 없는 이전 저장 데이터는 기본값 `false`(펼침).
  - `treeCollapsed`(⑤ §5.12)는 문자열 id 배열만 받는다 — 필드가 없거나 형식이 다르면 빈 배열(전부 펼침). 로그아웃에도 유지(sidebarCollapsed와 같은 기기 UI 환경설정).
  - **예전 `avatar`(base64 dataURL) 필드는 읽지도 쓰지도 않는다.** 읽어 오면 서버에 올린 새 사진보다 우선해(§`mergeProfile` 병합 순서) 사진을 바꿔도 예전 이미지가 계속 보인다.
- **saveNickname:** `(nick||"").trim() || null`(빈 값이면 null → displayName은 다시 구글 계정 이름).
- **setProfileImagePath:** 업로드 성공 후 새 경로를 반영(사이드바 아바타도 같은 상태를 본다).
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

### 5.8 사이드바 글 검색 (제목+본문 필터)

- 출처: `lib/search.ts`(`filterPosts`) + `components/AppShell.tsx`(상태 `search`).
- **`filterPosts(posts, query)`** (순수 함수): 쿼리를 trim·소문자화해 **제목 + 본문(content)** 에 대해 substring 부분 일치로 거른다. 빈 쿼리(또는 공백만)면 필터 없음 — 전체 반환. 정렬은 입력 순서 유지, 원본 불변. 외부 라이브러리·디바운스 없음(로컬 배열 필터, 최대 수백 건).
- **범위:** 사이드바 "내 글" 목록 전용 — 메인 목록(`/`)과 글 상세는 영향받지 않는다. 대상은 활성 글만(`app.posts`). 상단바 검색 아이콘은 여전히 비활성(§3.2) — Cmd+K 팔레트는 후속 과제(docs/BACKLOG.md).
- **카운트:** 섹션 카운트(`__count`)는 `navPosts.length` — 검색 중엔 매치 개수, 평소엔 전체 개수.
- **빈 상태 분기:** 글이 하나도 없으면 "아직 글이 없어요."(우선), 글은 있는데 매치가 없으면 "검색 결과가 없어요." — 둘 다 `.sidebar-section__empty`(§2.6).
- **영속화 없음:** 검색어는 AppShell 컴포넌트 state라 클라이언트 라우트 이동 중에는 유지되고 새로고침하면 초기화된다(§5.5 localStorage 스키마에 없음). 접힌 레일에서는 검색 입력 자체가 숨겨지지만(§3.3.1) 상태는 남아, 다시 펼치면 입력해 둔 검색어가 그대로 적용돼 있다.

### 5.9 캘린더 일정 CRUD (`lib/events.ts` + `components/calendar/`)

> 일정은 **Supabase `public.events` 테이블**에 저장된다. 구조(참고): uuid `id`,
> `user_id`(default `auth.uid()`), `title`(1~200자 check), `description`,
> `start_at`/`end_at`(`end_at >= start_at` check, timestamptz), `all_day`,
> `color`(check `blue|green|amber|red|gray`), `updated_at` 트리거 자동 갱신.
> 소유 격리는 RLS 4정책 `events_*_own`(`auth.uid() = user_id`)이 서버에서 강제한다.
> 테이블·RLS는 사전에 적용·검증되었으며 클라이언트 코드는 DDL을 수행하지 않는다.

- **행 ↔ CalendarEvent 매핑(`rowToEvent`):** `id` 문자열, `start_at/end_at` → epoch ms(`startAt`/`endAt`, 없으면 null), `description ?? ""`, 허용 목록 밖 `color`는 `"blue"` 폴백.
- **조회:** `fetchMyEvents(fromIso, toIso)` — 표시 그리드 범위를 `start_at` 기준 `gte/lte`로 조회, `start_at` 오름차순. 클라이언트 user 필터 없음(RLS가 격리).
- **추가:** 날짜 셀 클릭 → 추가 모달. 프리필: 시작 = 해당 날짜 09:00, 종료 없음, 하루 종일 해제, 색 `blue`. 저장 → `toEventPayload`(제목 trim, 빈 설명 → null, ms → ISO, **user_id 미포함** — DB default `auth.uid()`가 기록) → `insertEvent`(`.select().single()`) → 반환 행을 로컬 상태에 추가(칩 즉시 표시) → 모달 닫기.
- **수정:** 칩 클릭 → 수정 모달(기존 값 프리필). 저장 → `updateEvent(id, payload)` — **A2 계약:** `.select("id")`로 영향받은 행을 돌려받고 **0행이면 throw**("일정을 찾지 못해 저장하지 못했습니다."). RLS 거부는 에러가 아니라 0행 + `error: null`로 오기 때문이다(`lib/posts.ts`의 `ensureAffected` 패턴). 성공 시 로컬 상태를 초안으로 재구성.
- **삭제:** 수정 모달의 삭제 버튼 → `window.confirm("이 일정을 삭제할까요? 삭제하면 되돌릴 수 없어요.")` → `deleteEvent(id)` — 0행이면 throw("일정을 찾지 못해 삭제하지 못했습니다.", A2). 성공 시 로컬에서 제거 + 모달 닫기.
- **실패 처리:** 조회·저장·삭제 실패는 `window.alert`(§5.5 관행 — 토스트 인프라 없음). 로컬 상태는 성공했을 때만 갱신해 서버 진실과 어긋나지 않게 한다.
- **클라이언트 선검증:** 제목 필수·시작 필수·종료 ≥ 시작(§2.9) — DB check 제약 위반이 사용자에게 날것으로 새지 않게 한다.
- **범위 제외(spec):** 주/일 뷰, 여러 날 일정의 연속 바 렌더링, 반복 일정, 알림.

### 5.10 서식·블록 편집 동작 (wt2 — `lib/editor/nodes.ts`)

- **마크다운 단축 입력**(각 확장의 기본 inputRules — 별도 구현 없음):
  `# `→제목1, `## `→제목2, `### `→제목3(`#### `는 무변환 — level 1–3 제한),
  `- `→불릿, `1. `→번호, `[] `→체크박스(taskItem, checked=false), `> `→인용, `---`→구분선.
- **toggle 접힘/펼침:** 제목행 왼쪽 삼각형 버튼 클릭 → `updateAttributes({ open })` —
  상태가 **문서 attrs로 저장**되어 dual-write(§5.2)를 타고 서버까지 보존된다.
  접힘은 CSS 표시 전환일 뿐 내용 삭제가 아니다(§4.3.1).
- **projection 불변식 유지:** 새 블록 전부에서 `docToText`가 중첩 재귀로 텍스트를
  수집하므로(리스트·콜아웃·토글 내부 포함) `docToText(content_doc) === content`
  불변식(§5.2)과 사이드바 검색·글자 수 칩이 그대로 동작한다. 구분선은 빈 줄 하나로
  projection 된다. 잠그는 테스트: `__tests__/editor-doc-blocks.test.ts`.
- 노드 등록·직렬화 왕복·입력 규칙의 계약 테스트: `__tests__/editor-nodes.test.ts`.
- **드래그 핸들(③, §2.12):** 블록 hover → 핸들 표시(플러그인 onNodeChange가 대상
  블록 pos 추적). **드래그**하면 블록이 통째로 이동한다(ProseMirror 기본 이동).
  **클릭**하면 `.handle-menu`:
  - **전환** — BLOCKS 계약 중 스키마에 존재하는 텍스트 블록 10종(구분선·이미지·파일
    제외 — atom·미등록은 `handleMenuBlocks`가 자동 제외)으로 타입 변환.
    내부 문단의 inline 내용을 순서대로 옮겨 **텍스트·마크를 보존**한다
    (목록↔문단 변환 시 항목 수 = 문단 수). 변환 후에도 `docToText` projection이
    같은 텍스트를 돌려준다.
  - **복제** — 같은 블록을 바로 아래 삽입. **삭제** — 블록 제거.
  - 액션 구현·테스트: `components/editor/DragHandle.tsx`의
    `convertBlockAt`/`duplicateBlockAt`/`deleteBlockAt` + `__tests__/DragHandle.test.tsx`.

### 5.11 슬래시 메뉴 · 템플릿 동작 (wt1)

**에디터 슬래시 커맨드(§2.11):**

- 본문에서 `/` 입력 → 커서 아래(+6px)에 `.slash2-menu` 등장. 이어서 타이핑하는 질의로 `BLOCKS`를 실시간 필터(`filterBlocks` — label+keywords, 대소문자 무시), 매치 없으면 `결과 없음` 한 줄.
- **스키마 가드:** `editor.schema.nodes[type]`이 없는 항목(아직 머지되지 않은 wt2·wt3 노드)은 자동 숨김 — 머지 순서와 무관하게 단독으로도 깨지지 않는다.
- 선택 실행: 항목 클릭 또는 ↑/↓(순환)+Enter → 트리거 텍스트(`/질의`) 삭제 후 `insertBlock(editor, spec)` 단일 함수로 삽입. 타입군별 매핑 — paragraph·heading `setNode` / 목록 3종 `toggleList` / blockquote·callout·toggle `wrapIn`(실패 시 빈 문단 품은 `insertContent` 폴백) / 리프·원자 `insertContent`.
- Esc → 메뉴 닫기(문서 불변). 공백 입력(`allowSpaces: false`)·범위 이탈 시 suggestion 종료.

**페이지 템플릿(⑨) — `components/editor/TemplatePicker.tsx` + `lib/editor/templates.ts` + `.tpl-row`(`globals.css:914-923`):**

- **노출:** **빈 글**(진입 시점 dual-read 문서가 `isBlankDoc` — 내용 없음 또는 빈 문단 하나) 상세 진입 시 본문 위에 `.tpl-row` — `빈 페이지 / 회의록 / 할 일 / 메모` 4버튼(Button secondary §2.1). `role="group" aria-label="템플릿으로 시작"`. 판정은 PostEditor remount(`key={`editor-${post.id}`}` — §4.3) 기준 1회.
- **선택:** 템플릿 버튼 → `setContent(template.build(), { emitUpdate: true })` + `focus("end")` — PostEditor `onUpdate` → `buildEditPatch` 로 **dual-write 저장**(§5.2) 후 행 사라짐. `빈 페이지`는 문서 불변, 행만 사라짐.
- **타이핑 시작 시 사라짐(노션 관행):** 에디터 `update` 이벤트에서 문서가 더는 빈 글이 아니면 숨김.
- **스키마 가드:** 템플릿이 쓰는 노드(재귀 수집)가 하나라도 스키마에 없으면 그 템플릿 숨김, 보일 템플릿이 0개면 행 자체를 숨김(wt2 미머지 단독 안전장치 — 슬래시 메뉴와 같은 원칙).
- **템플릿 3종(`TEMPLATES`, 노드 타입은 BLOCKS type + 목록 자식 listItem/taskItem):**
  - `회의록`: 제목1 "회의록" + 문단 `날짜: {YYYY}년 {M}월 {D}일`(생성 시점) + 제목2 "참석자"+불릿 1칸 + 제목2 "안건"+번호 목록 1칸 + 제목2 "액션 아이템"+체크박스 1칸(미완료).
  - `할 일`: 제목1 "할 일" + 체크박스 목록 3칸(전부 미완료).
  - `메모`: 제목1 "메모" + 빈 문단.
- **스타일 `.tpl-row`:** flex, gap 8px, wrap, margin-bottom 14px, `mnPop 0.14s var(--ease-out)`(reduced-motion 해제 §7).

### 5.12 페이지 중첩 동작 (`lib/tree.ts` + `page.parent_id`)

> `page.parent_id`(bigint, 자기참조 FK `on delete set null`, 인덱스 `page_parent_idx`)는
> 사전 적용·검증 완료(`docs/page-nesting-icon-setup.sql`). 클라이언트는 DDL을 수행하지 않는다.

- **매핑(`lib/posts.ts`):** `parent_id` ↔ `Post.parentId`(문자열, null = 루트). `newInsertPayload(title, userId, parentId?)`는 parentId가 있을 때만 `parent_id`를 담는다. `updatePostFields`의 patch `parentId`는 `parent_id` 컬럼으로 매핑(A2 계약 — `.select("id")` + 0행 throw — 그대로 적용).
- **트리 계산(`buildTree`, 순수):** 평면 목록 → 표시 트리. 루트·자식 모두 입력 순서(최신 우선) 유지. **고아·휴지통 부모**(부모가 살아 있는 목록에 없음) → 루트로 승격. 자기참조·순환(비정상 데이터)도 무한 루프 없이 전체 글을 정확히 한 번씩 담는다.
- **순환 방지(앱 레벨, `descendantIds`):** 부모 후보에서 자기 자신과 자손을 제외한다 — DB는 순환을 막지 않으므로 앱이 강제한다(`docs/page-nesting-icon-setup.sql` 주석).
- **하위 페이지 생성:** 트리 행 hover `+`(§4.7) → `createPost("", parentId)` → 부모 강제 펼침(`setTreeNodeCollapsed(parentId, false)`) → 새 글 상세로 이동.
- **조상 체인(`ancestorChain`):** 상세 브레드크럼(§4.3)이 [루트, …, 직계 부모]를 표시. 부모가 목록에 없으면(휴지통) 체인이 거기서 끊긴다. 순환은 방문 집합으로 종결.
- **삭제 의미론(⑤):** 소프트 삭제는 **해당 글만** 휴지통으로 — 자식은 트리 계산에서 루트로 승격되어 계속 보인다. 영구 삭제는 DB `on delete set null`로 자식이 실제 루트가 된다. 검색(§5.8)은 평면 그대로.
- **접힘 영속화:** `treeCollapsedIds` — §5.5 localStorage 스키마의 `treeCollapsed`(문자열 id 배열). 기기 UI 환경설정이라 로그아웃에도 유지(sidebarCollapsed와 같은 이유).
- **페이지 아이콘 저장(⑦):** `page.icon`(text ≤16자 check) ↔ `Post.icon`. 상세의 아이콘 버튼(§4.3)에서 선택 즉시 `setPostIcon(id, icon)` — 로컬 낙관 반영 + **디바운스 없는 단발 UPDATE**(단일 클릭이라 묶을 것이 없다). A2 계약(`.select("id")` + 0행 throw) 그대로. 실패 시 이전 값으로 롤백 + `window.alert`(폴백 "아이콘을 저장하지 못했습니다."). 표시는 사이드바 트리(§4.7)·글 카드 타일(§4.2)·브레드크럼(§4.3)에서 `FileText` 대신 이모지(없으면 기존 아이콘 유지).

### 5.13 첨부 업로드(DnD·붙여넣기) 동작 (`lib/attachments.ts` + `lib/editor/media-nodes.ts`)

> Storage 버킷 `post-attachments`(public·20MB·MIME 11종)와 insert/delete own 정책은
> 사전 적용·검증 완료(`docs/post-attachments-setup.sql`). 클라이언트는 DDL을 수행하지 않는다.

- **정책(오버뷰 스펙 §2 승인):** 화이트리스트 — 이미지 png/jpg/jpeg/gif/webp ≤**5MB**(svg 제외 — XSS 벡터), 일반 파일 pdf/zip/txt/md/csv/docx/xlsx ≤**20MB**. `validateAttachment`가 검사하고 실패 사유는 한국어 메시지(§6.9). MIME 정확 일치 우선, 비표준 MIME(x-zip 등)은 확장자로 폴백해 버킷 허용 MIME으로 정규화.
- **경로 규약:** `{userId}/{postId}/{uuid}.{ext}` — 파일명은 uuid(사용자 파일명이 경로에 남지 않음), 첫 폴더가 소유자(RLS). 공개 URL은 `getPublicUrl`로 얻는다. URL 노출 시 접근 가능(공개 버킷 — 비공개 필요 시 signed URL은 후속 과제).
- **진입점:** ① 에디터에 파일 **드롭**(`handleDrop` — 좌표 위치에 삽입), ② **클립보드 붙여넣기**(`handlePaste` — 선택 위치), ③ 슬래시 메뉴 이미지/파일 항목(`openAttachmentPicker` — wt1 결선). 핸들러는 `mediaEditorProps`로 노출되고 PostEditor가 spread 한다(결합부 무수정). 업로드 컨텍스트 `{userId, postId}`는 상세 화면이 `setAttachmentContext`로 설정.
- **업로드 중:** 블록 자리에 `.attach-uploading`(§2.13) 위젯 데코레이션 — 문서를 바꾸지 않아 실패 시 블록 미삽입이 보장된다. **실패:** `window.alert`(검증 사유 또는 서버 메시지) + 블록 미삽입. **성공:** image 또는 fileBlock 노드를 자리표시자 위치에 삽입 → 자동 저장(§5.2)으로 `content_doc`에 영속.
- **글 삭제와 첨부(승인 정책):**
  - 소프트 삭제(휴지통): 첨부 **유지** — 복원 대비.
  - 영구 삭제(§4.5): 글 행 삭제 확정 **후** `deletePostAttachments(userId, postId)`를 비동기 호출(결과 무시). 폴더 list → 일괄 remove.
  - **정리 실패 = 고아 첨부**: `console.error("[attachments] 고아 첨부 발생: {postId}/{경로}", 원인)` 고정 포맷 로깅만 하고 **절대 throw 하지 않는다**(글 삭제 흐름 비차단). 주기 정리는 `docs/BACKLOG.md` "고아 첨부 정리" 담당 — 로그 포맷을 고정해 로그·Storage 대조로 고아 목록을 재구성할 수 있게 한다.

### 5.14 문단·제목 정렬 동작 (A1 — `lib/editor/nodes.ts`, A2 — 렌더 확인·CSS)

- **확장:** `TextAlign.configure({ types: ["heading", "paragraph"] })`(A1) — 정렬 attrs가 붙는 대상은 문단·제목(h1~h3)뿐이다. 목록 항목·인용·콜아웃·토글 자체는 대상 밖이지만, 그 안에 중첩된 문단은 `paragraph` 노드이므로 똑같이 정렬 가능하다.
- **값:** `left`(기본값, attrs `null`) · `center` · `right` · `justify`(확장 기본 `alignments` — 별도 제한 없음). `editor.commands.setTextAlign(value)`가 대상 노드에 `updateAttributes({ textAlign: value })`, `unsetTextAlign()`이 `null`로 되돌린다.
- **저장:** `textAlign`은 문서 노드 attrs라 dual-write(§5.2)를 그대로 타고 `content_doc`에 영속된다 — 새 컬럼·별도 저장 로직 없이 서버 왕복·새로고침 후에도 유지된다.
- **렌더(CSS 불필요 — A2 확인):** TextAlign의 `renderHTML`이 값이 있을 때만 `style="text-align: {value}"`를 해당 `<p>`/`<h1~h3>`에 직접 부여한다(`null`이면 style 자체를 안 붙여 기본 좌측 정렬과 시각적으로 동일). Paragraph/Heading 확장 모두 표준 `renderHTML({ HTMLAttributes })` 패턴이라 core가 attrs→style 변환을 자동 병합한다 — Color/Highlight(§1.1.6·§2.16)가 인라인 `style`을 붙이는 것과 같은 메커니즘이라 이미 검증된 경로다. globals.css 전수 확인 결과 `.detail-content`/`.detail-content p`/`h1~h3.blk-heading`(§4.3.1) 어디에도 `text-align`을 강제하는 규칙이 없어(다른 `text-align` 선언은 전부 버튼·표 셀 등 무관 컴포넌트) 인라인 style이 항상 그대로 적용된다. 목록 항목(`ul.blk-task li > div`)·콜아웃(`.blk-callout > *`)·토글(`.blk-toggle__content`)의 flex 자식도 폭을 그대로 차지해 정렬이 동일하게 보인다. 이 태스크(A2)는 보정 클래스(`.align-*`, `[style*="text-align"]`)를 **추가하지 않았다** — 필요하지 않음을 확인한 것이 산출물이다(YAGNI).
- **트리거(현재 UI 없음):** A1/A2는 확장 등록·렌더 확인까지다. 상단/플로팅 툴바에 정렬 버튼은 아직 없다 — §2.16 ColorPopover와 같은 사유로 Phase B(미구현)가 트리거를 결선한다. 현재는 확장 기본 키보드 단축키(`Mod-Shift-L` 좌 / `Mod-Shift-E` 중앙 / `Mod-Shift-R` 우 / `Mod-Shift-J` 양쪽)와 `editor.commands.setTextAlign(...)` 프로그래밍 호출로만 정렬을 바꿀 수 있다.
- **활성 상태 조회:** `useFormatState`(§2.10 소비)의 `align` 필드가 `["left","center","right"]` 중 활성 값을 반환(`justify` 미포함 — 버튼 UI가 아직 없어 Phase B에서 필요 시 확장). 문서 없는 경우 기본 `"left"`.
- **projection 영향 없음:** `textAlign`은 시각 attrs일 뿐 텍스트 내용이 아니므로 `docToText`/`docToPreview`(§5.10) 불변식에 영향을 주지 않는다.
- 잠그는 테스트: `__tests__/editor-nodes.test.ts`("노드 등록(blocks.ts 계약)" — `setTextAlign` 커맨드로 `isActive({ textAlign: "center" })` 확인).

---

## 6. 콘텐츠 / 카피 인벤토리 (Content)

사용자에게 보이는 **모든 한국어/텍스트 문자열**을 화면별로 정리(원문 그대로). placeholder 데이터 포함.

### 6.1 공통 / 앱 셸

| 위치 | 문구 |
|---|---|
| 브랜드칩(상단바·로그인) | `mini` |
| 워크스페이스 타이틀 | `미니 노션` |
| 상단바 아이콘 title | `알림 (준비 중)` / `검색 (준비 중)` / `도움말 (준비 중)` / `앱 (준비 중)` / `메뉴 (준비 중)` — 5종 모두 미구현(§3.2) |
| 상단바 중앙 테마 토글 title/aria-label | 라이트일 때 `다크 모드로 전환` / 다크일 때 `라이트 모드로 전환` |
| 사이드바 토글 title/aria-label | `사이드바 접기`(펼침 상태) / `사이드바 펼치기`(접힘 상태) |
| 사이드바 홈 | `홈` |
| 사이드바 검색 placeholder | `글 검색` |
| 섹션 "내 글" 라벨 / 액션 title | `내 글` / `새 페이지` |
| 글 제목 폴백(사이드바·카드·브레드크럼·제목 placeholder) | `제목 없음` |
| 섹션 빈 상태 | `아직 글이 없어요.` |
| 섹션 검색 빈 상태(매치 없음) | `검색 결과가 없어요.` (§5.8) |
| 섹션 "앱" + 항목 | `앱` / `캘린더` / `할 일` / `휴지통` (보이는 레이블). 캘린더는 구현됨(툴팁 `캘린더`, `/calendar` 이동 — §4.6). 휴지통은 구현됨(툴팁 `휴지통`, `/trash` 이동 — §4.5). `할 일 (준비 중)`만 미구현(§3.3) |
| 미구현 항목 툴팁 접미사 | `(준비 중)` — `pendingLabel()`, `components/ui/IconButton.tsx` |
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
| 삭제 확인창 | `이 글을 휴지통으로 옮길까요? 휴지통에서 복원할 수 있어요.` (소프트 삭제 — §5.3) |
| 토글 블록 버튼 aria-label | 펼침 상태 `토글 접기` / 접힘 상태 `토글 펼치기` (§4.3.1) |
| 드래그 핸들 aria-label | `블록 옮기기` (§2.12) |
| 핸들 메뉴 aria-label / 그룹 라벨 | `블록 메뉴` / `전환` · `동작` |
| 핸들 메뉴 전환 항목 | BLOCKS 계약의 한국어 label 재사용 — `텍스트` `제목 1` `제목 2` `제목 3` `불릿 목록` `번호 목록` `체크박스 목록` `인용` `콜아웃` `토글` (`lib/editor/blocks.ts`) |
| 핸들 메뉴 동작 항목 | `복제` / `삭제` |

### 6.5 마이 페이지

| 위치 | 문구 |
|---|---|
| 제목 | `마이 페이지` |
| 서브타이틀 | `서비스에서 사용할 프로필 정보를 관리하세요.` |
| 아바타 행 이름/힌트 | `프로필 이미지` / `JPG, PNG · 5MB 이하 정사각형 이미지를 권장합니다.` |
| 업로드 버튼 | `사진 변경` (업로드 중 `업로드 중…`) |
| 업로드 실패 알림 | `JPG, PNG, WEBP, GIF 이미지만 올릴 수 있습니다.` / `이미지 용량은 5MB 이하여야 합니다.` / `빈 파일은 올릴 수 없습니다.` / `프로필을 찾지 못해 이미지를 저장하지 못했습니다.` (그 밖에는 Supabase 오류 메시지 그대로) |
| 별명 라벨/placeholder | `별명` / `사용할 별명을 입력하세요` |
| 자기소개 라벨/placeholder | `자기소개` / `자신을 간단히 소개해 보세요` |
| 이메일 라벨/값/배지 | `이메일` / (실제 로그인 구글 이메일) / `Google 계정` |
| 저장 버튼 / 저장 노트 | `변경사항 저장` / `저장되었습니다` |
| 로그아웃 카드 제목/설명/버튼 | `로그아웃` / `이 기기에서 계정을 로그아웃합니다.` / `로그아웃` |

### 6.5b 휴지통 (`/trash`)

| 위치 | 문구 |
|---|---|
| 제목 | `휴지통` |
| 서브타이틀 | `삭제한 글을 복원하거나 영구적으로 지울 수 있어요.` |
| 리스트 헤드 라벨 | `삭제된 글` |
| 카드 날짜 | `{날짜} 삭제` (예: `오늘 삭제`) |
| 카드 제목/내용 폴백 | `제목 없음` / `내용 없음` (§6.3과 동일 규칙) |
| 복원 버튼 / 영구 삭제 버튼 | `복원` / `영구 삭제` |
| 영구 삭제 확인창 | `이 글을 영구 삭제할까요? 영구 삭제하면 되돌릴 수 없어요.` |
| 빈 상태 제목/설명 | `휴지통이 비어 있어요.` / `글을 삭제하면 여기로 옮겨지고, 언제든 복원할 수 있어요.` |
| 실패 알림(폴백) | `휴지통을 불러오지 못했습니다.` / `게시글을 복원하지 못했습니다.` / `게시글을 삭제하지 못했습니다.` (서버 메시지가 있으면 그대로) |

### 6.6 placeholder / 데모 데이터

- 신원(이름·이메일·아바타)은 로그인한 구글 계정에서 옴(하드코딩 `OWNER_NAME`/`EMAIL` 제거). 별명·아바타는 마이페이지에서 로컬 오버라이드 가능.
- 시드/데모 게시글 없음 — 게시글은 로그인한 사용자가 서버에 직접 만든 것뿐이다(신규 사용자는 빈 목록).

### 6.7 캘린더

| 위치 | 문구 |
|---|---|
| 월 헤더 | `{YYYY}년 {M}월` (예: `2026년 7월`) |
| 헤더 버튼 / IconButton title | `오늘` / `이전 달` / `다음 달` |
| 요일 행 | `일` `월` `화` `수` `목` `금` `토` |
| 날짜 셀 aria-label | `{M}월 {D}일 일정 추가` |
| 칩 넘침 표시 | `+{N}` (예: `+1`) |
| 모달 제목 | `일정 추가` / `일정 수정` |
| 필드 라벨 | `제목` / `시작` / `종료` / `하루 종일` / `색상` / `설명` |
| placeholder | `일정 제목` / `메모를 남겨보세요` |
| 색상 스와치 aria-label·title | `파랑` / `초록` / `주황` / `빨강` / `회색` |
| 버튼 | `저장` / (수정 모드) `삭제` |
| 검증 알림 | `제목을 입력해 주세요.` / `시작 시각을 입력해 주세요.` / `종료 시각은 시작 시각보다 빠를 수 없습니다.` |
| 삭제 확인창 | `이 일정을 삭제할까요? 삭제하면 되돌릴 수 없어요.` |
| 실패 알림(폴백) | `일정을 불러오지 못했습니다.` / `일정을 저장하지 못했습니다.` / `일정을 삭제하지 못했습니다.` |
| 0행 실패 알림(A2) | `일정을 찾지 못해 저장하지 못했습니다.` / `일정을 찾지 못해 삭제하지 못했습니다.` (그 밖에는 Supabase 오류 메시지 그대로) |

### 6.8 에디터 · 템플릿 (wt1)

| 위치 | 문구 |
|---|---|
| 서식 툴바 버튼 title/aria-label (§2.10) | `굵게` / `기울임` / `밑줄` / `취소선` / `코드` / `링크` |
| 서식 툴바 role=toolbar aria-label | `서식` |
| 링크 미니 입력 placeholder·aria-label | `링크 주소 입력` |
| 슬래시 메뉴 aria-label (§2.11) | `블록 삽입` |
| 슬래시 메뉴 항목 라벨 | `BLOCKS` 레지스트리의 `label` 그대로(`lib/editor/blocks.ts`): `텍스트` `제목 1` `제목 2` `제목 3` `불릿 목록` `번호 목록` `체크박스 목록` `인용` `콜아웃` `토글` `구분선` `이미지` `파일` |
| 슬래시 메뉴 빈 결과 | `결과 없음` |
| 템플릿 행 aria-label (§5.11) | `템플릿으로 시작` |
| 템플릿 행 버튼 | `빈 페이지` / `회의록` / `할 일` / `메모` |
| 회의록 템플릿 본문 | `회의록` / `날짜: {YYYY}년 {M}월 {D}일` / `참석자` / `안건` / `액션 아이템` |
| 할 일·메모 템플릿 본문 | `할 일` / `메모` |

### 6.9 트리·첨부 (wt3)

| 위치 | 문구 |
|---|---|
| 트리 접기 삼각형 aria-label | `하위 페이지 접기`(펼침 상태) / `하위 페이지 펼치기`(접힘 상태) |
| 트리 hover `+` title/aria-label | `하위 페이지 추가` |
| 트리 항목 제목 폴백 | `제목 없음` (§6.1과 동일 규칙) |
| 첨부 형식 거부 알림 | `허용되지 않는 파일 형식입니다. 이미지(PNG·JPG·GIF·WEBP) 또는 PDF·ZIP·TXT·MD·CSV·DOCX·XLSX만 올릴 수 있습니다.` |
| 첨부 용량 거부 알림 | `이미지 용량은 5MB 이하여야 합니다.` / `파일 용량은 20MB 이하여야 합니다.` / `빈 파일은 올릴 수 없습니다.` |
| 업로드 실패 알림(폴백) | `첨부를 올리지 못했습니다.` (서버 메시지가 있으면 그대로) |
| 업로드 컨텍스트 없음 알림 | `첨부를 올릴 수 없습니다. 글을 다시 연 뒤 시도해 주세요.` |
| 파일 블록 이름 폴백 / 크기 | `파일` / `{n}KB`·`{n}MB` (예: `512KB`, `1.5MB`) |
| 파일 블록 다운로드 title/aria-label | `다운로드` |
| 고아 첨부 콘솔 로그(고정 포맷) | `[attachments] 고아 첨부 발생: {postId}/{경로}` (사용자 노출 아님 — BACKLOG 대조용) |
| 아이콘 버튼(아이콘 있음) title/aria-label | `아이콘 변경` |
| 아이콘 유령 버튼 | `아이콘 추가` |
| 아이콘 팝오버 aria-label / 제거 버튼 | `아이콘 선택` / `제거` |
| 아이콘 저장 실패 알림(폴백) | `아이콘을 저장하지 못했습니다.` (0행 실패는 A2 문구 `게시글을 찾지 못해 저장하지 못했습니다.`) |

---

## 7. 접근성 · 상태 디테일 (States & A11y)

- **포커스 링:** `--shadow-focus` + `--border-focus`(#4e97f0, 두 테마 공통). 적용: `.input-sm:focus-within`, `.field-input:focus`, `.field-textarea:focus`. (나머지 인풋/textarea는 `outline:none`이며 별도 포커스 링 없음 — `.detail-title`, `.detail-content`, `.composer input` 등.)
  - 라이트 `0 0 0 3px rgba(78,151,240,0.25)` / 다크 `0 0 0 3px rgba(78,151,240,0.4)` — 어두운 배경에서 25%는 잘 보이지 않아 다크에서만 알파를 높였다(가시성 향상, §1.1.5).
- **placeholder 색:** `input::placeholder, textarea::placeholder { color: var(--text-placeholder) }`(#b0b3b8).
- **선택 영역:** `::selection { background: var(--accent-soft) }`(#eef4fe).
- **커스텀 스크롤바:** `.mn-scroll`(→ [§2.7.13](#2713-스크롤바-mn-scroll)). thumb 11px, 색 `--border-default`/hover `--border-strong`, 트랙은 3px solid 페이지색 테두리로 여백감. 두 테마 모두 토큰이 따라간다. 네이티브 스크롤바는 `color-scheme`이 처리한다.
- **hover 규칙:** 대부분 `--surface-hover`(#f1f2f3) 배경 전환, 카드류는 border/shadow/transform까지. `--dur-fast`(120ms).
- **active/press:** `.btn:active { transform: scale(0.97) }`, `.icon-btn:active { background: --surface-active }`.
- **disabled:** 두 갈래다.
  - **폼 컨트롤**(로그인 버튼, 업로드 input)은 진짜 `:disabled` — `cursor:default; opacity:0.6`(§4.1, §2.7.3).
  - **아직 만들지 않은 셸 항목**(상단바 5종 + 사이드바 "앱"의 할 일 1종, 총 6개)은 `aria-disabled` + `.is-disabled` — `cursor:default; opacity:0.45`, 툴팁에 "(준비 중)". `disabled` 속성을 쓰면 툴팁이 사라져 상태를 알릴 수단이 없어지기 때문이다(§2.2). (캘린더는 `/calendar`(§4.6), 휴지통은 `/trash`(§4.5) 구현과 함께 활성화됐다.)
- **링크:** `a { color: --text-link; text-decoration: none } a:hover { color: --accent-hover }`.
- **키보드:** post-card는 `role="link" tabIndex={0}` + Enter로 이동. IconButton은 `aria-label`=title. 그 외 시맨틱은 기본 `<button>`.
- **툴팁(`title`):** IconButton 전반, `SidebarItem`(항상 `label`), 접힘 상태의 `.sidebar__profile`. 접힌 레일에서 레이블이 없는 아이콘의 이름을 확인하는 수단이다(§3.3.1).
- **토글 상태 노출:** 사이드바 토글은 네이티브 `<button>`(Tab 도달·Enter/Space 활성화) + `aria-label`(상태별 문구) + `aria-expanded`(펼침 여부) + `aria-controls="app-sidebar"`. 접힘 상태에서도 항상 렌더되므로 포커스가 사라지지 않는다.
- **reduced-motion:** `@media (prefers-reduced-motion: reduce)` 대상 6건(전량 열거는 아님 — 아래 목록 이후에도 동일 패턴으로 몇 건 더 있다) — ① 커버 스켈레톤 shimmer는 애니메이션을 끄고 정적 `--surface-hover` 배경으로 대체(§2.7.15, 그 배경도 토큰이라 다크에서 자동으로 따라간다), ② `.sidebar { transition: none }`으로 접기/펼치기 폭 전환을 즉시 적용(§3.3.1), ③ `.modal-card { animation: none }`으로 모달 등장 `mnPop`을 끈다(§2.9 — globals.css 끝의 별도 미디어 블록), ④ `.attach-uploading`(업로드 shimmer, §2.13)도 ①과 같은 정적 대체, ⑤ `.icon-pick { animation: none }`(아이콘 팝오버 mnPop, §4.3), ⑥ `.clr-pop { animation: none }`(색 팝오버 mnPop, §2.16).
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
| `app/globals.css` Primitives(203–290) | btn/icon-btn(+`.is-disabled`)/badge/avatar/input-sm/sidebar-item(+`.is-disabled`)/sidebar-section | §2.1–§2.7 |
| `app/globals.css` App shell(296–353) | app-root/topbar/sidebar(+`is-collapsed` 레일·toolbar)/app-main | §3, §3.3.1 |
| `app/globals.css` Login(358–380) | login-page/card/google-btn/terms | §4.1 |
| `app/globals.css` 목록 | list-page/composer/slash-menu/post-card/empty-state | §4.2, §2.7 |
| `app/globals.css` 상세(472–544) | detail-* | §4.3 |
| `app/globals.css` 마이(549–613) | mypage-*/upload-btn/field-*(input/textarea/readonly)/saved-note/logout-card | §4.4, §2.7 |
| `app/globals.css` 캘린더(615–673)·모달(675–727) | calendar-page/head/weekdays/grid/cell/chip/more + modal-overlay/card/field/check/colors/footer + reduced-motion(모달) | §4.5, §2.9, §7 |
| `components/calendar/CalendarView.tsx` | 월 헤더·요일·42칸 그리드·칩·"+N"·모달 상태·월 범위 조회 | §4.6, §5.9 |
| `components/calendar/EventModal.tsx` | 일정 추가/수정 모달(필드·색상·검증·ESC/오버레이 닫기) | §2.9 |
| `app/(app)/calendar/page.tsx` | 캘린더 화면 진입점 | §4.5 |
| `lib/calendar.ts` | monthGrid(42칸)/eventsByDay/dateKey/datetime-local 변환 | §4.6, §5.9 |
| `lib/events.ts` | events 접근(조회/생성/수정/삭제, A2 0행 throw)·행↔CalendarEvent 매핑 | §5.9 |
| `components/ui/Button.tsx` | Button | §2.1 |
| `components/ui/IconButton.tsx` | IconButton(+sm, +disabled·`pendingLabel`) | §2.2 |
| `components/ui/Badge.tsx` | Badge | §2.3 |
| `components/ui/Avatar.tsx` | Avatar(img/이니셜) | §2.4 |
| `components/ui/SidebarItem.tsx` | SidebarItem(active, disabled) | §2.5 |
| `components/ui/SidebarSection.tsx` | SidebarSection(count/actions/empty) | §2.6 |
| `components/ui/ThemeToggle.tsx` | ThemeToggle(Sun/Moon, aria-pressed) | §2.8 |
| `lib/theme.tsx` | resolveInitialTheme / ThemeProvider / useTheme / 영속화 | §1.1.5 |
| `components/AppShell.tsx` | 셸 구성·네비(홈·캘린더·휴지통)·인증 가드·검색·아이콘·사이드바 접기 토글·미구현 6종 비활성 표시 | §3, §3.3.1, §5.8, §1.7 |
| `app/(app)/page.tsx` | 목록·컴포저·슬래시·카드·빈 상태 | §4.2, §5.1 |
| `app/(app)/posts/[id]/page.tsx` | 상세·자동저장·삭제 | §4.3, §5.2/5.3 |
| `app/(app)/mypage/page.tsx` | 프로필·아바타 업로드·저장 노트·로그아웃 | §4.4, §5 |
| `app/(app)/trash/page.tsx` | 휴지통 목록·복원·영구 삭제·빈 상태 | §4.5, §5.3 |
| `app/login/page.tsx` | 로그인·구글 로고 SVG | §4.1, §1.1.4 |
| `app/(app)/layout.tsx` / `app/layout.tsx` | 셸 래핑 / 폰트·metadata / `data-theme`·FOUC 방지 인라인 스크립트·ThemeProvider | §3, §1.2, §1.1.5, §6.1 |
| `lib/store.tsx` | 상태·세션 연동·낙관적 갱신·날짜포맷·상수·사이드바 접힘 상태 | §5, §5.7, §6.6 |
| `lib/posts.ts` | Supabase `page` 접근(조회/생성/수정/소프트 삭제·복원/영구 삭제/휴지통 조회)·행↔Post 매핑(parent_id 포함) | §5.5, §5.12 |
| `lib/tree.ts` | 페이지 트리 순수 로직(buildTree/descendantIds/ancestorChain — 고아·순환 안전) | §4.7, §5.12 |
| `components/tree/PostTree.tsx` | 사이드바 페이지 트리(들여쓰기·접기 삼각형·hover `+`) | §4.7 |
| `lib/search.ts` | 사이드바 검색 필터 순수 함수(`filterPosts`) | §5.8 |
| `lib/editor/doc.ts` | textToDoc/docToText — 플레인↔블록 변환·손실 제로 불변식 | §5.2 |
| `components/editor/PostEditor.tsx` | 본문 에디터(Tiptap v3, 문단 전용)·buildEditPatch(dual-write) | §4.3, §5.2 |
| `lib/editor/media-nodes.ts` | image·fileBlock 노드 + 업로드 핸들러(handleDrop/handlePaste)·자리표시자 플러그인 | §2.13, §5.13 |
| `lib/attachments.ts` | 첨부 정책(화이트리스트·5/20MB)·경로 규약·업로드·고아 첨부 로깅 | §5.13, §6.9 |
| `components/editor/nodes-media/FileBlockView.tsx` | fileBlock 카드 노드 뷰(파일명·크기·다운로드) | §2.13 |
| `components/icon/PageIconButton.tsx` | 페이지 이모지 아이콘 버튼·팝오버(고정 24종·제거) | §4.3, §5.12 |
| `docs/page-nesting-icon-setup.sql` | `page.parent_id`·`page.icon` DDL 기록(적용 완료) | §5.12 |
| `docs/post-attachments-setup.sql` | `post-attachments` 버킷·RLS DDL 기록(적용 완료) | §5.13 |
| `lib/profile-image.ts` | Storage 업로드·uuidv4 경로·URL 앞/뒤 조립·파일 검사 | §4.4, §5.5 |
| `docs/page-rls-setup.sql` | `page` RLS 정책 4종(소유권 강제) | §5.5 |
| `docs/profile-image-storage-setup.sql` | `profile.image_path` 컬럼 + `profile-image` 버킷·RLS 정책 3종(insert/update/delete, select 없음) | §4.4, §5.5 |
| `03-reference-design.png` | ui:bowl 레퍼런스(다른 제품) | §0 레퍼런스 메모 |
| `02-prd.md`, `README.md` | 제품 맥락·원칙 | §0 |

### 자체 점검 결과

1. `:root` CSS 변수 76개(사이드바 폭 토큰 2개 포함) → §1에 **전부** 열거(미사용 토큰은 "정의만" 표기). 다크 재정의 토큰은 §1.1.5에 전량 열거. ✅
2. `components/ui/` 파일 7개 = 문서 컴포넌트 7개(§2.1–2.6, §2.8) + 화면 컴포넌트 EventModal(§2.9) + CSS 전용 조각 16개(§2.7). 누락 없음. ✅
3. 6개 화면 모두 포함, 빈 상태·슬래시 메뉴·저장 노트·삭제/영구 삭제 확인창·일정 모달까지 포함. ✅
4. 사용자 노출 한국어 문구 → §6에 화면별 전량 인용(placeholder + 테마 토글 라벨 포함). ✅
5. 근사·반올림 값 없음 — hex/px/ms/cubic-bezier 원문 유지. 대비값만 소수 첫째 자리 반올림(계산값). ✅
6. 확정 불가/미완 항목(reduced-motion 커버리지, 레퍼런스 divergence)은 TODO/메모로 표시. 다크모드는 **구현 완료**로 갱신됨. ✅
7. 다크 모드 도입 시 하드코딩·프리미티브 직접 참조 6곳을 토큰화했고, 라이트 최종값은 전부 불변임을 §1.1.4에 명시. ✅

> **미사용(정의만) 토큰 목록**(보존용): `--gray-25`, `--gray-700`(직접 참조 없음, 램프값으로만), `--blue-200`, `--blue-300`, `--blue-400`, `--gold-300`, `--gold-500`, `--accent-soft-fg`, `--status-warning`(및 그 참조원 `--amber-500`), `--radius-xs`, `--dur-slow`. — 삭제하지 말 것(디자인 시스템 원본에서 이식된 완전 램프/스케일의 일부).
> `--surface-inverse`는 다크 모드에서 `.brand-chip`이 사용하기 시작해 목록에서 제외됐다.
> 다크 스코프는 `#93bdf8`·`#66a9ff`처럼 램프에 존재하는 값도 리터럴로 적는다(중성 다크색 대부분이 램프에 대응값이 없어 표기를 통일). 따라서 `--blue-300/400`은 여전히 "정의만" 상태다.
