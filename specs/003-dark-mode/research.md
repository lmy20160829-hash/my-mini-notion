# Phase 0 Research: 다크 모드

모든 미해결 항목(Clarify의 Deferred 2건 포함)을 여기서 해소한다. 형식: 결정 / 근거 / 대안.

## R1. 테마 적용 메커니즘 — 시맨틱 토큰 오버라이드

- **Decision**: `globals.css`의 `:root`(라이트=기본값)는 유지하고, `[data-theme="dark"]` 스코프에서
  **시맨틱 토큰만**(`--text-*`, `--surface-*`, `--border-*`, `--accent-soft*`, 그림자 rgba 기준) 어두운
  값으로 재정의한다. 컴포넌트 CSS(`.btn`, `.sidebar-item`, `.post-card` 등)는 수정하지 않는다.
- **Rationale**: `DESIGN.md §1.1.4`대로 모든 컴포넌트가 시맨틱 토큰을 참조한다. 토큰 한 곳만 바꾸면
  전체 표면이 일관되게 전환된다(FR-003, SC-002). 프리미티브 램프(`--gray-*`, `--blue-*`)는 참조용으로
  보존한다.
- **Alternatives**:
  - 프리미티브 램프 자체를 다크에서 뒤집기 → 램프의 "graphite 밝기 순서" 의미가 깨지고 `#fff` 하드코딩
    참조가 어긋남. 기각.
  - 컴포넌트별 `.dark &` 규칙 추가 → 중복·누락 위험, YAGNI 위반. 기각.

## R2. FOUC 방지 — `<head>` 인라인 스크립트 + `data-theme`

- **Decision**: 루트 `app/layout.tsx`의 `<html>`에 `data-theme="light"`와 `suppressHydrationWarning`을
  두고, `<head>`에 `dangerouslySetInnerHTML` 인라인 스크립트를 넣어 페인트 이전에 저장값/시스템 설정을
  읽어 `document.documentElement.setAttribute("data-theme", …)`로 선칠한다.
- **Rationale**: Next.js 번들 공식 가이드
  `node_modules/next/dist/docs/01-app/02-guides/preventing-flash-before-hydration.md` §Themes가 정확히
  이 패턴을 규정(원칙 IV). 인라인 스크립트는 HTML 파싱 중 동기 실행되어 첫 페인트 전에 DOM을 고친다.
  `useEffect`/`useLayoutEffect`는 하이드레이션 이후라 깜빡임을 못 막는다(문서 §"Why not useEffect").
- **정적 export/CSP**: 앱은 `output:"export"` + CSP 없음이라 `'unsafe-inline'` 제약이 없어 그대로 적용
  가능. basePath(prod)는 클라이언트 localStorage 로직에 영향 없음.
- **Alternatives**: 서버 쿠키 기반 SSR 테마 → 정적 export에는 서버가 없어 불가. 기각.

## R3. React 상태 동기화 — lazy initializer

- **Decision**: `ThemeProvider`의 `useState`를 lazy initializer로 만들어 인라인 스크립트와 **같은 소스**
  (localStorage `mini-notion-theme` → 없으면 `matchMedia('(prefers-color-scheme: dark)')`)를 읽는다.
  토글 시 `setState` → `useEffect`로 `data-theme` 갱신 + localStorage 저장.
- **Rationale**: 공식 문서 §"Syncing with React state" — 스크립트와 lazy 초기화가 같은 값을 읽으면 초기
  상태가 DOM과 항상 일치해 하이드레이션 경고가 없다.
- **Alternatives**: 기본값 후 `useEffect`로 교정 → 깜빡임/재렌더. 기각.

## R4. 첫 방문 기본값 (Deferred 해소) — 시스템 설정 추종

- **Decision**: 저장값이 없으면 `prefers-color-scheme: dark` → dark, 아니면 light. 매체 질의 불가 시 light.
- **Rationale**: 스펙 US3·FR-005. 사용자 설정 없이 익숙한 환경 제공, 표준 관행, 저비용(스크립트 한 줄).
- **Note**: OS 설정 "실시간 변경 추종"(사용자가 명시 선택 안 한 동안 시스템 토글에 반응)은 v1 범위 밖.
  최초 결정 시점에만 시스템 설정을 참조한다(YAGNI). 명시 선택 후에는 시스템 변경 무시(FR-006).

## R5. 저장 범위 (Clarify 확정) — 기기 로컬, 전용 키

- **Decision**: localStorage 키 `mini-notion-theme`(값 `"light"|"dark"`). 기존 앱 상태 키 `mini-notion-v1`과
  분리한다.
- **Rationale**: 인라인 스크립트는 앱 store가 로드되기 전에 실행되므로, 앱 상태 JSON에 끼워 넣으면 파싱
  비용·타이밍 문제가 생긴다. 테마 전용 단일 키가 스크립트에서 읽기 가장 단순하고 빠르다(계정 동기화
  없음 = Clarify 확정).
- **Alternatives**: `mini-notion-v1`에 `theme` 필드 병합 → 스크립트가 전체 JSON 파싱 필요, 결합도↑. 기각.

## R6. 토글 버튼 형태·배치 (Deferred 해소)

- **Decision**: 기존 `.icon-btn` 기반 단일 아이콘 토글 버튼(`ThemeToggle`). 라이트에서 `Moon`(→누르면
  다크), 다크에서 `Sun`(→누르면 라이트) 아이콘(lucide-react, 기존 의존성). `aria-label`/`title`은 상태에
  따라 "다크 모드로 전환"/"라이트 모드로 전환"(FR-008). 배치는 `.topbar`에 `position:relative`를 주고
  토글을 **가로 중앙**에 절대 배치(좌측 워크스페이스·우측 아이콘 그룹과 독립).
- **Rationale**: 사용자 요청 "상단 중앙 토글버튼"을 충족하면서, 기존 컴포넌트/토큰을 재사용해 최소
  구현(YAGNI, 원칙 V). 절대 중앙 배치는 좌우 그룹 폭과 무관하게 진짜 중앙을 보장.
- **Edge(좁은 화면)**: 절대 배치가 좌/우 그룹과 겹칠 수 있음 → 토글에 배경(topbar 배경) 확보 + 좌우
  그룹이 중앙까지 침범하지 않는 폭에서 검증. 스펙 엣지 케이스로 기록됨.
- **Alternatives**: 세그먼트 pill 스위치(☀/☾) → 시각 강조는 크나 신규 컴포넌트·상태 필요. v1은 아이콘
  버튼으로 충분. 기각(추후 확장 가능).

## R7. 다크 팔레트 (신규 디자인 결정 — 구현 시 DESIGN.md 반영)

기존 라이트 시맨틱 값의 다크 대응. 본문 텍스트 대비 ≥ 4.5:1(SC-004)을 기준으로 선정. 페이지 배경
`#191919`(라이트의 `--gray-900`과 동일 톤) 위에서 검증.

| 시맨틱 토큰 | 라이트(현행) | 다크(신규) | 비고 |
|---|---|---|---|
| `--surface-page` | `#ffffff` | `#191919` | 페이지/본문 |
| `--surface-sidebar` | `#ffffff` | `#191919` | 사이드바(페이지와 동일) |
| `--surface-card` | `#ffffff` | `#242424` | 카드/입력/버튼 표면(한 단계 밝게) |
| `--surface-subtle` | `#f7f8f9` | `#202020` | 은은한 배경 |
| `--surface-hover` | `#f1f2f3` | `#2a2a2a` | hover |
| `--surface-active` | `#ebeced` | `#333333` | active/선택 |
| `--surface-inverse` | `#191919` | `#ededed` | 반전 표면(brand-chip 등) |
| `--text-strong` | `#191919` | `#ededed` | 제목 (대비 ~13:1) |
| `--text-body` | `#2c2f34` | `#d4d4d4` | 본문 (대비 ~10:1) |
| `--text-secondary` | `#6b7178` | `#a6a6a6` | 보조 (대비 ~6:1) |
| `--text-muted` | `#8a8f98` | `#8a8f98` | 흐린 텍스트/아이콘(유지, 대비 ~4.9:1) |
| `--text-placeholder` | `#b0b3b8` | `#6b7178` | placeholder |
| `--text-link` | `#3b82d6` | `#66a9ff` | 링크(다크에서 밝은 파랑) |
| `--border-subtle` | `#ebeced` | `#2e2e2e` | 얇은 경계 |
| `--border-default` | `#e2e3e5` | `#3a3a3a` | 기본 경계 |
| `--border-strong` | `#d3d5d8` | `#4d4d4d` | 강조 경계 |
| `--accent` | `#4e97f0` | `#4e97f0` | 파랑 강조(유지) |
| `--accent-hover` | `#3b82d6` | `#66a9ff` | 다크에서 밝게 |
| `--accent-soft` | `#eef4fe` | `rgba(78,151,240,0.16)` | 연파랑 배경(다크 반투명) |
| `--accent-soft-fg` | `#3b82d6` | `#93bdf8` | soft 위 전경 |

추가 처리:
- **color-scheme**: `:root{ color-scheme: light } [data-theme="dark"]{ color-scheme: dark }` — 네이티브
  스크롤바·폼 컨트롤이 테마를 따르게 한다.
- **그림자**: 라이트는 `rgba(25,25,25,…)` 기준. 다크에서는 거의 안 보이므로 `[data-theme="dark"]`에서
  `--shadow-*`를 `rgba(0,0,0,0.4~0.5)` 기준으로 재정의(깊이 유지).
- **하드코딩 색 토큰화**(원칙 III, 문서의 "토큰 아닌 하드코딩 색" 목록 대응):
  - `.brand-chip` `background:var(--gray-900); color:#fff` → `background:var(--surface-inverse); color:var(--surface-page)`
    (다크에서 밝은 칩/어두운 글자로 자동 반전).
  - `.detail-delete-btn:hover` `background:#fdeae9` → 신규 토큰 `--danger-soft`(라이트 `#fdeae9`, 다크
    `rgba(240,72,62,0.16)`).
  - 구글 로고 4색(로그인 SVG)은 브랜드 고정색이라 유지(테마 무관).
- **status(성공/위험/즐겨찾기)**: 텍스트·아이콘 강조로만 쓰여 다크 배경에서도 대비 충분 → 유지.

## R8. 테스트 전략

- **순수 로직**: `resolveInitialTheme(stored, systemPrefersDark)` → `"light"|"dark"`. jsdom 무관, 조합
  테이블 테스트(RED 먼저).
- **컴포넌트**: `ThemeToggle` 렌더/클릭 시 `document.documentElement` `data-theme` 전환, `aria-label`
  상태 반영. `ThemeProvider` lazy 초기화·토글·localStorage 저장·저장 실패(try/catch) 폴백.
- **matchMedia**: jsdom 미제공 → 각 테스트에서 `window.matchMedia`를 최소 목(원칙 II: 외부 경계만 목).
- **불가/E2E**: `<head>` 인라인 스크립트의 페인트 전 동작(FOUC, SC-003)과 async 서버 레이아웃은 유닛
  테스트 불가 → `quickstart.md` 수동 시나리오로 검증(헌법 기술 스택 §async 제약).
