# Contract: 테마 UI 인터페이스

앱이 노출하는 테마 관련 인터페이스 계약. 구현은 이 계약을 만족해야 한다(테스트가 이를 검증).

## 1. `lib/theme.tsx`

### `resolveInitialTheme(stored, systemPrefersDark) → "light" | "dark"`

- 순수 함수. 입력·반환은 [data-model.md](../data-model.md) §순수 함수 계약 표를 따른다.
- 부수효과 없음(localStorage/DOM 접근 금지 — 값만 계산).

### `<ThemeProvider>` (Client Component)

- 자식을 감싸는 Context Provider. 앱 전역(루트 레이아웃)에서 1회 마운트.
- **초기화**: lazy `useState`로 `resolveInitialTheme(localStorage.getItem("mini-notion-theme"), matchMedia("(prefers-color-scheme: dark)").matches)` 계산. SSR/비브라우저 환경에서는 `"light"` 반환(가드).
- **부수효과(useEffect, theme 변화 시)**: `document.documentElement.setAttribute("data-theme", theme)`.
- **영속화**: 사용자 토글로 값이 바뀔 때 `localStorage.setItem("mini-notion-theme", theme)`. 접근 실패는 무시(try/catch, FR-010).

### `useTheme() → { theme, toggle, setTheme }`

| 멤버 | 시그니처 | 동작 |
|---|---|---|
| `theme` | `"light" \| "dark"` | 현재 테마 |
| `toggle()` | `() => void` | light↔dark 전환 + 영속화 |
| `setTheme(t)` | `(t: "light"\|"dark") => void` | 특정 테마 지정 + 영속화 |

- Provider 밖에서 호출 시 에러(기존 `useApp`/`useAuth` 규약과 동일).

## 2. `components/ui/ThemeToggle.tsx` (Client Component)

- `.icon-btn` 기반 버튼 1개. `useTheme()`의 `theme`/`toggle` 사용.
- **아이콘**: `theme === "light"`이면 `Moon`(다크로 전환 예고), `"dark"`이면 `Sun`. lucide-react.
- **접근성(FR-008)**:
  - `aria-label`/`title` = `theme === "light" ? "다크 모드로 전환" : "라이트 모드로 전환"`.
  - `type="button"`. 키보드 포커스·Enter/Space로 동작(네이티브 button).
  - 눌린 테마 상태 표현을 위해 `aria-pressed={theme === "dark"}` 부여.
- **클릭**: `toggle()` 호출 → 전체 UI가 즉시 전환(FR-002, SC-001, SC-005).

## 3. DOM/CSS 계약

- `<html data-theme="light|dark" suppressHydrationWarning>` — 인라인 스크립트가 페인트 전 갱신.
- `<head>` 인라인 스크립트(문자열): localStorage `mini-notion-theme` 없으면 `prefers-color-scheme`로 해석 후 `data-theme` 설정. try/catch로 실패 무시.
- `app/globals.css`:
  - `:root { color-scheme: light; /* 라이트 시맨틱 토큰(현행) */ }`
  - `[data-theme="dark"] { color-scheme: dark; /* research.md §R7 다크 토큰 */ }`
  - 컴포넌트 규칙은 변경 없음(시맨틱 토큰 경유). 단, `.brand-chip`·`.detail-delete-btn:hover`는 하드코딩 색을 토큰으로 교체.

## 4. 배치 계약 (상단 중앙, US1)

- `.topbar { position: relative }`.
- `ThemeToggle`는 상단바 가로 **중앙**에 배치(`position:absolute; left:50%; transform:translateX(-50%)`), 좌측 워크스페이스 그룹·우측 아이콘 그룹과 독립.
- 앱 셸(`AppShell`) 상단바에만 렌더(로그인 화면에는 토글 없음, 테마 자체는 적용됨).

## 불변식 (테스트로 보장)

1. 토글 클릭 후 `document.documentElement.getAttribute("data-theme")`가 반대 값으로 바뀐다.
2. 토글 클릭 후 `localStorage["mini-notion-theme"]`가 새 값과 같다.
3. 저장값 `"dark"`로 Provider 마운트 시 초기 `theme === "dark"`, `data-theme === "dark"`.
4. 저장값 없음 + 시스템 다크 → 초기 `theme === "dark"`.
5. localStorage 접근이 던져도 렌더/토글이 예외 없이 동작(세션 내 상태 유지).
6. `aria-label`이 현재 테마에 따라 두 문구 중 하나로 정확히 표시된다.
