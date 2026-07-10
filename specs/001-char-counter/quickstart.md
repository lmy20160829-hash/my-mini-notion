# Quickstart & Validation: 내용 글자 수 카운터

**Feature**: 001-char-counter | **Date**: 2026-07-10

기능이 end-to-end로 동작함을 증명하는 실행 가능한 검증 절차. 구현 상세(함수/컴포넌트 본문)는 [contracts/](./contracts/)와 tasks.md 참조.

## Prerequisites

- 의존성 설치됨(`npm install` 이미 완료). **신규 패키지 없음.**
- 대상 파일: `lib/charCount.ts`, `components/CharCount.tsx`, `app/(app)/posts/[id]/page.tsx`, `app/globals.css`.

## 1. 자동 검증 (TDD / Vitest)

```bash
npm test
```

**기대**: 전체 통과, 에러·경고 없음(헌법 완료 게이트). 포함 스위트:
- `__tests__/charCount.test.ts` — [count-graphemes 계약표](./contracts/count-graphemes.md) 9행 전부 검증(빈값·공백·줄바꿈·한글·ZWJ 가족 이모지·국기·피부톤).
- `__tests__/CharCount.test.tsx` — [컴포넌트 계약표](./contracts/char-count-component.md): `""`→`0자`, `"hello"`→`5자`, prop 변경 시 `2자`→`4자` 갱신.

> TDD 순서(헌법 I): 각 테스트를 **먼저 작성해 실패(RED)를 확인**한 뒤 최소 구현으로 통과(GREEN).

특정 파일만:
```bash
npm test -- __tests__/charCount.test.ts
```

## 2. 수동 검증 (실제 앱)

```bash
npm run dev    # http://localhost:3000
```

1. 로그인 → 글 목록에서 아무 글이나 열기(`/posts/[id]`).
2. **초기 정확성(US2/FR-003)**: 내용이 있는 글을 열면 입력 없이도 우측 하단 칩에 현재 글자 수(예: `120자`)가 즉시 보인다.
3. **실시간(US1/FR-002)**: 내용칸에 타이핑하면 한 글자마다 칩 숫자가 즉시 증가.
4. **편집 반영(US3/FR-004)**: 일부 삭제 시 감소, 전체 삭제 시 `0자`, 여러 줄 붙여넣기 시 그 수만큼 반영.
5. **grapheme(FR-009)**: 이모지 `👨‍👩‍👧` 붙여넣기 → 칩이 `1자` 증가(2·7이 아님).
6. **위치·스티키(FR-006/SC-003)**: 긴 글로 스크롤해도 칩이 편집 컬럼 우측 하단에 계속 보인다.
7. **비방해(FR-007)**: 칩이 덮은 지점의 본문도 클릭·편집된다(`pointer-events:none`).
8. **범위(FR-008)**: 제목칸에 타이핑해도 칩 숫자는 바뀌지 않는다.

## 3. 디자인 정합 확인 (헌법 III)

- 칩 스타일이 `DESIGN.md` 토큰만 사용하는지 확인(신규 hex/그림자 없음).
- `DESIGN.md`가 `.detail-charcount`를 반영하도록 **같은 변경에서** 갱신되었는지 확인(§2.7·§4.3·§6.4).

## Done 기준

- [ ] `npm test` 전체 통과(무경고).
- [ ] 수동 검증 1~8 모두 관찰됨.
- [ ] `DESIGN.md`와 CSS 일치.
