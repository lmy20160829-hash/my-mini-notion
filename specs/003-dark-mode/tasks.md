# Tasks: 다크 모드 (Dark Mode)

**Branch**: `worktree-wt2` | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

`/speckit-tasks`가 실행되지 않아 `spec.md` + `plan.md` + `research.md` + `contracts/theme-ui.md`에서
직접 유도한 순서 있는 태스크 목록. 헌법 원칙 I(TDD)에 따라 각 구현 태스크는 **RED 테스트 선행**이다.

## Phase 1 — 순수 로직 (US2/US3 기반)

- [x] **T001 (RED)** `__tests__/theme-resolve.test.ts` 작성 — `resolveInitialTheme`의 6개 조합
      (data-model.md §순수 함수 계약 표). 모듈 부재로 실패 확인.
- [x] **T002 (GREEN)** `lib/theme.tsx`에 `resolveInitialTheme` + `THEME_STORAGE_KEY` 구현(최소).

## Phase 2 — Provider / 상태 (US1 + US2 + FR-010)

- [x] **T003 (RED)** `__tests__/ThemeProvider.test.tsx` 작성 — 저장값 lazy 초기화, 시스템 설정
      폴백, 토글 시 `data-theme`·localStorage 반영, 저장 실패 폴백, Provider 밖 `useTheme` 에러.
- [x] **T004 (GREEN)** `lib/theme.tsx`에 `ThemeProvider` + `useTheme` 구현.
      토글은 함수형 업데이트로 연속 토글 일관성 보장(스펙 엣지 케이스).

## Phase 3 — 토글 버튼 (US1 / FR-001, FR-002, FR-008)

- [x] **T005 (RED)** `__tests__/ThemeToggle.test.tsx` 작성 — 렌더/아이콘 전환/`aria-label`·
      `aria-pressed` 상태/클릭 시 `data-theme` 전환.
- [x] **T006 (GREEN)** `components/ui/ThemeToggle.tsx` 구현(`.icon-btn` 재사용, lucide `Sun`/`Moon`).

## Phase 4 — 디자인 토큰 (FR-003, FR-009 / SC-002, SC-004)

- [x] **T007** `app/globals.css`에 `[data-theme="dark"]` 시맨틱 토큰 스코프 추가
      (research.md §R7 표) + `color-scheme` + 다크 그림자 재정의.
- [x] **T008** 하드코딩·프리미티브 직접 참조 색을 토큰화(라이트 값 불변):
      `.brand-chip`, `.detail-delete-btn:hover`(`--danger-soft`), `.badge`, `.avatar`,
      `.detail-meta__dot`, `.mn-scroll`.

## Phase 5 — 배선 (FR-007 / SC-003)

- [x] **T009** `app/layout.tsx` — `<html data-theme="light" suppressHydrationWarning>` +
      `<head>` 인라인 테마 스크립트 + `<ThemeProvider>` 마운트.
      (Next.js 번들 문서 `01-app/02-guides/preventing-flash-before-hydration.md` §Themes 패턴)
- [x] **T010** `components/AppShell.tsx` — 상단바 가로 중앙에 `<ThemeToggle/>` 배치
      (`.topbar` `position:relative` + `.topbar__theme` 절대 중앙).

## Phase 6 — 문서 동기화 · 검증 (헌법 원칙 III)

- [x] **T011** `DESIGN.md` 동기화 — §1.1 다크 컬럼/토큰, §1.4 다크 그림자, §2.x 토큰화 반영,
      §3.2 상단바 중앙 토글, §7 테마·대비·포커스, §8 커버리지.
- [x] **T012** `npm test` 전체 통과 확인 후 커밋(구현 + `specs/003-dark-mode/`).

## 유닛 테스트 불가 — 수동 검증 필요

- FOUC(첫 페인트 전 테마, FR-007/SC-003) — `quickstart.md` S4.
- 상단 중앙 배치의 좁은 화면 겹침(스펙 엣지 케이스) — `quickstart.md` S1.
- 실제 대비·가독성 육안 확인 — `quickstart.md` S6.
