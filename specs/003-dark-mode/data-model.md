# Phase 1 Data Model: 다크 모드

이 기능의 "데이터"는 단일 클라이언트 선호값이다. 서버/DB 엔터티는 없다(계정 동기화 없음).

## Entity: ThemePreference

사용자가 선택했거나 시스템에서 유래한 현재 색상 테마.

| 속성 | 타입 | 값 | 설명 |
|---|---|---|---|
| `theme` | enum | `"light" \| "dark"` | 현재 적용 테마(해석된 값) |
| `source` | enum(파생) | `"explicit" \| "system" \| "default"` | 어떻게 정해졌는지. 저장 여부 판단·문서화용(런타임 필수 아님) |

- **저장 표현**: localStorage 키 `mini-notion-theme` 에 문자열 `"light"` 또는 `"dark"`만 저장.
  값이 없으면(=미저장) 명시 선택이 없었다는 뜻.
- **명시 선택만 저장**: 토글로 사용자가 바꿀 때만 localStorage에 기록한다. 시스템 설정에서 유래한
  초기값은 저장하지 않는다(그래야 이후 시스템 설정 변경이 첫 방문자에게 반영될 여지가 남고, "명시
  선택 우선" FR-006 의미가 명확해진다).
- **적용 표현**: `document.documentElement`의 `data-theme` 속성(`"light"|"dark"`). CSS는 이 속성으로
  스코프된다.

### 검증 규칙

- 저장값이 `"light"|"dark"` 이외이면 무효로 간주 → 미저장과 동일하게 시스템 설정으로 해석.
- localStorage 접근 실패(예외)는 무저장으로 간주하고 세션 메모리 상태만 사용(FR-010).

### 상태 전이

```
초기 해석: resolveInitialTheme(stored, systemPrefersDark)
  stored === "dark"            → dark   (source: explicit)
  stored === "light"           → light  (source: explicit)
  stored 없음/무효 & systemDark → dark   (source: system)
  stored 없음/무효 & !systemDark→ light  (source: default/system)

토글(현재 t):
  t === "light" → "dark",  localStorage.set("dark"),  data-theme="dark"
  t === "dark"  → "light", localStorage.set("light"), data-theme="light"
```

- 재방문/새로고침: 저장값이 있으면 그대로 복원(FR-004). 저장값이 명시 선택이면 시스템 설정과 무관하게
  우선(FR-006).

## 순수 함수 계약 (테스트 대상)

```
resolveInitialTheme(
  stored: string | null,          // localStorage.getItem("mini-notion-theme")
  systemPrefersDark: boolean       // matchMedia('(prefers-color-scheme: dark)').matches
): "light" | "dark"
```

| stored | systemPrefersDark | 반환 |
|---|---|---|
| `"dark"` | (무관) | `"dark"` |
| `"light"` | (무관) | `"light"` |
| `null` | `true` | `"dark"` |
| `null` | `false` | `"light"` |
| `"garbage"` | `true` | `"dark"` |
| `"garbage"` | `false` | `"light"` |

## 토큰 매핑(스타일 "데이터")

다크 스코프에서 재정의되는 시맨틱 토큰의 최종 값은 [research.md](./research.md) §R7 표를 단일 출처로 한다.
구현 시 동일 값을 `app/globals.css`의 `[data-theme="dark"]`와 `DESIGN.md §1.1`(신규 다크 컬럼)에 함께
기입한다(원칙 III: 문서-코드 일치).

## 관계·영향 범위

- **소비자**: `app/globals.css`의 모든 컴포넌트 규칙(시맨틱 토큰 경유, 자동 반영).
- **비저장 경계**: 인증 세션(`lib/auth`), 앱 데이터(`lib/store`, 키 `mini-notion-v1`)와 독립. 테마는
  로그인 여부와 무관하게 로그인 화면에도 적용(토글 버튼은 앱 셸에만).
