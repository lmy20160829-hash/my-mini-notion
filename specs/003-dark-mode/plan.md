# Implementation Plan: 다크 모드 (Dark Mode)

**Branch**: `003-dark-mode` | **Date**: 2026-07-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-dark-mode/spec.md`

## Summary

상단 바 중앙의 토글 버튼으로 밝은/어두운 테마를 전환하고(P1), 선택을 기기 단위 로컬에 유지하며(P2),
저장값이 없으면 시스템 색상 설정을 따른다(P3). 기술 접근은 **시맨틱 CSS 변수 재정의**다: 기존
디자인 시스템이 이미 `--surface-*`·`--text-*`·`--border-*`·`--accent-*` 시맨틱 토큰으로 구성되어
있으므로, 컴포넌트 CSS는 그대로 두고 `[data-theme="dark"]` 스코프에서 이 시맨틱 토큰만 어두운 값으로
재정의한다. `<html>`의 `data-theme` 속성은 (1) 페인트 이전 실행되는 `<head>` 인라인 스크립트가
localStorage/시스템 설정을 읽어 선칠하고(FOUC 방지, FR-007), (2) 런타임에는 `ThemeProvider`가
토글에 따라 갱신·영속화한다. 인라인 스크립트와 Provider의 lazy 초기화가 같은 소스를 읽어
하이드레이션 불일치를 방지한다(Next.js 공식 "preventing-flash-before-hydration" 패턴).

## Technical Context

**Language/Version**: TypeScript 5 (strict), React 19, Next.js 16.2.10 (App Router)

**Primary Dependencies**: 신규 의존성 없음. 아이콘은 기존 `lucide-react`(`Sun`/`Moon`) 재사용.

**Storage**: 브라우저 `localStorage` — 신규 키 `mini-notion-theme` = `"light" | "dark"` (기존 `mini-notion-v1` 앱 상태와 분리). 계정/서버 동기화 없음(Clarify 확정).

**Testing**: Vitest 4 + React Testing Library + jsdom (`npm test`). `window.matchMedia`는 jsdom 미제공 → 시스템 설정 관련 테스트에서 per-test 목 필요.

**Target Platform**: 정적 export(`output: "export"`) → GitHub Pages. 서버 런타임 없음, CSP 없음(인라인 스크립트 허용).

**Project Type**: 단일 Next.js 웹 앱(프론트엔드 전용).

**Performance Goals**: 토글 전환 300ms 이내·레이아웃 이동 없음(SC-005). 재방문 시 첫 페인트부터 올바른 테마(SC-003, 인라인 스크립트).

**Constraints**: 본문 텍스트 대비 ≥ 4.5:1(두 테마, SC-004). 저장 실패해도 세션 내 토글 동작(FR-010). 정적 export 환경에서 basePath(prod) 영향 없음(클라이언트 전용 로직).

**Scale/Scope**: 앱 셸 + 4개 화면(로그인/목록/상세/마이). 신규 파일 소수(`lib/theme.tsx`, `components/ui/ThemeToggle.tsx`), `globals.css` 다크 스코프 추가, `layout.tsx` 인라인 스크립트·Provider 배선.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Test-First (TDD 의무)**: PASS(계획). 테스트 가능한 순수 로직(`resolveInitialTheme(stored, systemDark)`)과 컴포넌트(`ThemeToggle`)·Provider를 RED→GREEN→Refactor로 구현. 인라인 `<head>` 스크립트와 async 서버 레이아웃은 유닛 테스트 불가(헌법 기술 스택 §"async Server Component 미지원") → quickstart/수동 E2E로 검증(FOUC). 이 예외는 헌법이 허용하는 범위이며 나머지 로직은 전부 TDD.
- **II. 테스트 무결성(모킹 규율)**: PASS(계획). `window.matchMedia`·`localStorage`는 외부/브라우저 경계이므로 최소 목만 사용. 목 요소가 아니라 실제 `data-theme` 속성·실제 컴포넌트 동작을 단언.
- **III. 디자인 시스템 준수**: PASS. 계획 전 `DESIGN.md` 통독 완료. 다크는 신규 임의값이 아니라 기존 시맨틱 토큰의 다크 대응값으로 정의. 신규 디자인 결정(다크 팔레트, 중앙 토글 배치, brand-chip 토큰화)은 구현 시 `globals.css`와 함께 `DESIGN.md`에 반영(§1.1 다크 컬럼 + §3.2 토글 + §7 상태). → tasks에 "DESIGN.md 동기화" 태스크 포함 예정.
- **IV. 프레임워크 문서 우선**: PASS. FOUC 방지·인라인 스크립트 패턴을 번들 문서 `01-app/02-guides/preventing-flash-before-hydration.md`에서 확인하고 그대로 채택(`data-theme` + `suppressHydrationWarning` + lazy `useState`).
- **V. 단순성(YAGNI)**: PASS. 테마는 light/dark 2종만. "system" 3-상태 옵션·다중 팔레트·계정 동기화는 범위 밖(Assumptions). 토글은 기존 `.icon-btn` 기반 단일 아이콘 버튼으로 최소 구현.

**결과**: 위반 없음 → Complexity Tracking 불필요.

## Project Structure

### Documentation (this feature)

```text
specs/003-dark-mode/
├── plan.md              # 이 파일 (/speckit-plan)
├── research.md          # Phase 0 — 접근/팔레트 결정
├── data-model.md        # Phase 1 — ThemePreference·토큰 매핑
├── quickstart.md        # Phase 1 — 검증 시나리오
├── contracts/
│   └── theme-ui.md      # Phase 1 — ThemeProvider·useTheme·ThemeToggle·data-theme 계약
├── checklists/
│   └── requirements.md  # (기존) 스펙 품질 체크리스트
└── tasks.md             # /speckit-tasks 출력 (이 명령에서는 생성 안 함)
```

### Source Code (repository root)

```text
app/
├── layout.tsx              # [수정] <html data-theme suppressHydrationWarning> + <head> 인라인 테마 스크립트 + <ThemeProvider>
└── globals.css             # [수정] :root(라이트=기본) 유지 + [data-theme="dark"] 시맨틱 토큰 오버라이드, color-scheme, brand-chip/delete-hover 토큰화

components/
├── AppShell.tsx            # [수정] 상단바 중앙에 <ThemeToggle/> 배치(.topbar position:relative + 중앙 정렬)
└── ui/
    └── ThemeToggle.tsx     # [신규] Client 토글 버튼 (Sun/Moon, aria-label, useTheme().toggle)

lib/
└── theme.tsx               # [신규] ThemeProvider + useTheme + resolveInitialTheme(순수 함수) + localStorage 영속화

__tests__/
├── theme-resolve.test.ts   # [신규] resolveInitialTheme 순수 로직 (stored/system 조합)
├── ThemeToggle.test.tsx    # [신규] 렌더·클릭 시 data-theme 전환·aria-label 상태
└── ThemeProvider.test.tsx  # [신규] lazy 초기화·토글·localStorage 영속화·저장 실패 폴백
```

**Structure Decision**: 기존 단일 Next.js 앱 구조를 그대로 사용. 테마 상태는 기존 `lib/store.tsx`(앱 데이터)·`lib/auth.tsx`(세션)와 동일한 Context Provider 패턴으로 `lib/theme.tsx`에 분리한다(관심사 분리). 스타일은 `globals.css` 단일 파일 규약을 유지하고 다크 스코프만 추가한다.

## Complexity Tracking

> Constitution Check 위반이 없으므로 비워 둔다.
