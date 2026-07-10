---
description: "Task list for 내용 글자 수 카운터 (Content Character Counter)"
---

# Tasks: 내용 글자 수 카운터 (Content Character Counter)

**Input**: Design documents from `/specs/001-char-counter/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/count-graphemes.md, contracts/char-count-component.md, quickstart.md

**Tests**: 포함됨 (REQUIRED). TDD는 이 프로젝트 헌법 원칙 I(Test-First, NON-NEGOTIABLE)에서 강제되며 plan.md·quickstart.md가 RED→GREEN 순서를 명시한다. 각 유닛(순수 함수·컴포넌트)의 실패 테스트를 먼저 작성한 뒤 최소 구현으로 통과시킨다.

**Organization**: 태스크는 user story별로 묶여 각 스토리를 독립적으로 구현·검증할 수 있다.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 병렬 실행 가능(다른 파일, 의존성 없음)
- **[Story]**: 해당 user story (US1, US2, US3). Setup/Foundational/Polish에는 라벨 없음
- 설명에 정확한 파일 경로 포함

## Path Conventions

- 단일 Next.js App Router 앱(저장소 루트). 소스: `lib/`, `components/`, `app/`. 테스트: `__tests__/`.
- 신규 파일 2개(`lib/charCount.ts`, `components/CharCount.tsx`) + 기존 파일 2개 수정(`app/(app)/posts/[id]/page.tsx`, `app/globals.css`) + 테스트 2개 + `DESIGN.md` 갱신. **신규 의존성 없음.**

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 착수 전 준비 — 테스트 스택 정상 동작 확인 및 필수 문서 선독(헌법 III·IV, AGENTS.md).

- [X] T001 기존 테스트 러너 baseline 확인: `npm test`(=`vitest run`, 설정 `vitest.config.mts`) 실행 후 `__tests__/setup.smoke.test.tsx`가 통과(green)하는지 확인 — 신규 의존성 설치 불필요
- [X] T002 [P] 코드 작성 전에 번들 Next.js 가이드 `node_modules/next/dist/docs/**/testing/vitest.md`(및 client component 가이드)를 읽는다 — AGENTS.md/헌법 IV(프레임워크 문서 우선)
- [X] T003 [P] 칩 스타일 토큰을 위해 `DESIGN.md`(§2.7 컴포넌트, §4.3 글 상세, §6.4 콘텐츠)를 읽는다 — CLAUDE.md 디자인 규칙/헌법 III(디자인 시스템 준수)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 모든 스토리와 `<CharCount>` 컴포넌트가 의존하는 핵심 계산 로직. 순수 함수 `countGraphemes`.

**⚠️ CRITICAL**: 이 단계 완료 전에는 어떤 user story도 시작할 수 없다.

- [X] T004 `countGraphemes`의 실패 유닛 테스트를 `__tests__/charCount.test.ts`에 작성(RED): contracts/count-graphemes.md 계약표 9행 전부 — `""`→0, `"안녕"`→2, `"hello"`→5, `"a b\nc"`→5, `"   "`→3, `"👨‍👩‍👧"`(ZWJ)→1, `"🇰🇷"`(국기)→1, `"👍🏽"`(피부톤)→1, `"가나다😀"`→4. 모듈 미존재로 **실패함을 확인**
- [X] T005 `lib/charCount.ts`에 `countGraphemes(text: string): number`를 구현하여 T004를 통과(GREEN): 모듈 스코프에서 1회 생성한 `Intl.Segmenter('ko', { granularity: 'grapheme' })`로 분절 개수 계수. `npm test -- __tests__/charCount.test.ts`로 GREEN 확인

**Checkpoint**: `countGraphemes` 검증 완료 — 컴포넌트/전 스토리가 이 위에 구축 가능.

---

## Phase 3: User Story 1 - 입력하면서 실시간으로 글자 수 확인 (Priority: P1) 🎯 MVP

**Goal**: 글 상세 내용칸에 타이핑할 때마다, 편집 컬럼 우측 하단 고정(스티키) 칩에 grapheme 글자 수가 즉시 갱신되어 보인다.

**Independent Test**: 빈 내용칸에 글자를 하나씩 입력하면서 우측 하단 칩이 입력한 글자 수와 정확히 일치하며 실시간 갱신되는지 확인(quickstart.md 단계 3).

### Tests for User Story 1 ⚠️ (먼저 작성 → 실패 확인 후 구현)

- [X] T006 [US1] `<CharCount>` 실패 컴포넌트 테스트를 `__tests__/CharCount.test.tsx`에 작성(RED): contracts/char-count-component.md 렌더 계약 — `"hello"`→`5자`, `"안녕하세요"`→`5자`, 그리고 `text` prop 변경 `"hi"`→`"hiya"` 시 `2자`→`4자` 실시간 갱신(FR-002). 컴포넌트 미존재로 **실패함을 확인**

### Implementation for User Story 1

- [X] T007 [US1] `components/CharCount.tsx`에 props 전용 클라이언트 컴포넌트 `CharCount({ text }: { text: string })` 구현 — `<div className="detail-charcount">{countGraphemes(text)}자</div>` 렌더(스토어·라우터·내부 상태 없음). T006 통과(GREEN)
- [X] T008 [US1] `app/globals.css`의 "글 상세" 섹션에 `.detail-charcount` 조각 추가 — DESIGN.md 토큰만 사용(`--surface-card`, `--border-subtle`, `--radius-pill`, `--shadow-xs`, `--text-muted`) + `position:sticky; bottom:24px; margin-left:auto; width:fit-content; padding:3px 10px; font-size:12px; user-select:none; pointer-events:none`(contracts/char-count-component.md CSS 계약). 신규 hex/그림자 원시값 금지
- [X] T009 [US1] T008과 **같은 변경**에서 `DESIGN.md` 갱신(헌법 III): §2.7에 글자 수 칩 `.detail-charcount` 항목(토큰·상태·마크업), §4.3 "글 상세"에 본문 다음 카운트 칩 추가, §6.4 콘텐츠 인벤토리에 문구 `{n}자` 추가
- [X] T010 [US1] `app/(app)/posts/[id]/page.tsx`에서 내용 `<textarea>`(`.detail-content`) **바로 다음 마지막 자식**으로 `<CharCount text={post.content} />` 통합 — `post.content`만 전달하고 `post.title`은 전달하지 않음(FR-008)

**Checkpoint**: US1 완결 — 글을 열어 타이핑하면 우측 하단 칩이 실시간으로 갱신되는 MVP 동작. 여기서 멈춰 독립 검증/데모 가능.

---

## Phase 4: User Story 2 - 기존 글을 열면 현재 글자 수가 바로 보임 (Priority: P2)

**Goal**: 이미 내용이 저장된 글을 열면 입력 없이도 우측 하단에 현재 글자 수가 즉시 표시되고, 다른 글로 이동하면 새 글 기준으로 갱신된다.

**Independent Test**: 내용이 채워진 글을 연 직후 입력을 하지 않은 상태에서 칩 값이 실제 저장 내용의 글자 수와 일치하는지 확인(quickstart.md 단계 2).

### Tests for User Story 2 ⚠️

- [X] T011 [US2] `__tests__/CharCount.test.tsx`에 초기 마운트 정확성 커버리지 테스트 추가: 비어있지 않은 초기 `text`(예: 120 grapheme 문자열)로 마운트 시 상호작용 없이 `120자` 렌더 확인(FR-003). 공유 컴포넌트에 대해 green 기대 — 실패 시 초기 렌더 결함을 드러냄

### Implementation for User Story 2

- [X] T012 [US2] US2 독립 검증(quickstart.md 단계 2 & FR-011): 내용 있는 글을 열면 칩에 현재 수 즉시 표시, 다른 글로 이동 시 칩이 새 글 `post.content` 기준으로 갱신됨을 확인 — 브라우저 툴링 부재로 수동 대신 자동 페이지 통합 테스트 `__tests__/PostDetailPage.charcount.test.tsx`로 실행(실제 store+page+CharCount, next/navigation만 모킹). FR-003→`5자`, FR-011 전환→`7자` 통과

**Checkpoint**: US1·US2 모두 독립 동작 — 열자마자 정확 + 입력 중 실시간.

---

## Phase 5: User Story 3 - 삭제·붙여넣기·빈 내용까지 정확히 반영 (Priority: P3)

**Goal**: 삭제·붙여넣기·전체 삭제 등 어떤 방식으로 내용이 바뀌어도 칩 값이 항상 현재 grapheme 글자 수와 일치(빈 값 `0자` 포함).

**Independent Test**: 붙여넣기·부분 삭제·전체 삭제로 내용을 바꿔 가며 매 순간 칩 값이 실제 글자 수(빈값 0 포함)와 일치하는지 확인(quickstart.md 단계 4-5).

### Tests for User Story 3 ⚠️

- [ ] T013 [US3] `__tests__/CharCount.test.tsx`에 편집/엣지 커버리지 테스트 추가: `"👨‍👩‍👧"`→`1자`(grapheme, FR-009)와 `text`를 `""`로 갱신 시 `0자`(전체 삭제/빈 내용, FR-005). 공유 컴포넌트에 대해 green 기대 — 실패 시 실제 결함을 드러냄

### Implementation for User Story 3

- [ ] T014 [US3] US3 독립 검증(수동, quickstart.md 단계 4-5): `npm run dev`에서 부분 삭제 시 감소, 전체 삭제 시 `0자`, 여러 줄 붙여넣기 시 그 grapheme 수만큼 반영, `👨‍👩‍👧` 붙여넣기 시 `1자` 증가(2·7 아님)를 `app/(app)/posts/[id]/page.tsx`에서 확인

**Checkpoint**: 세 스토리 모두 독립적으로 동작 — 카운터 정확성 신뢰 완성.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 완료 게이트·문서 정합·전체 회귀·정리.

- [ ] T015 전체 `npm test`(=`vitest run`, `vitest.config.mts`) 실행 — 모든 스위트 통과 + 에러·경고 0(헌법 완료 게이트)
- [ ] T016 [P] `DESIGN.md` ↔ `app/globals.css` 정합 확인: `.detail-charcount`가 기존 토큰만 사용(신규 hex/그림자/라운드 원시값 없음)하고 `DESIGN.md` §2.7/§4.3/§6.4가 CSS와 일치(quickstart.md 단계 3)
- [ ] T017 [P] `specs/001-char-counter/quickstart.md` 수동 검증 1~8 전체 실행(`npm run dev`) — 특히 스크롤 시 스티키 유지(FR-006/SC-003)와 `pointer-events:none` 비방해 편집(FR-007) 관찰
- [ ] T018 리팩터 패스: `lib/charCount.ts`의 `Intl.Segmenter`가 모듈 스코프 1회 생성인지, `components/CharCount.tsx`가 props 전용(스토어·라우터 무의존)인지 확인하며 전체 테스트 green 유지

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 의존성 없음 — 즉시 시작
- **Foundational (Phase 2)**: Setup 이후. **모든 user story를 BLOCK** (`countGraphemes`는 컴포넌트·전 스토리의 입력)
- **User Stories (Phase 3-5)**: 모두 Foundational 완료에 의존. US1 완료 후 US2·US3는 우선순위(P2→P3) 순 또는 병렬 진행 가능
- **Polish (Phase 6)**: 원하는 스토리 완료 후

### User Story Dependencies

- **US1 (P1)**: Foundational(T005) 이후 시작. 다른 스토리에 의존하지 않음 — MVP
- **US2 (P2)**: US1의 컴포넌트·통합(T007·T010) 위에서 초기 렌더/네비게이션을 검증. 독립 테스트 가능
- **US3 (P3)**: US1의 컴포넌트·통합 위에서 편집/grapheme 엣지를 검증. 독립 테스트 가능

### Within Each User Story

- 테스트를 먼저 작성해 **실패(RED)를 확인**한 뒤 최소 구현으로 통과(GREEN) — 헌법 I
- 컴포넌트(T007) → CSS(T008) → DESIGN.md 동시 반영(T009) → 페이지 통합(T010)
- 스토리 완결 후 다음 우선순위로 이동

### Parallel Opportunities

- Setup의 T002·T003([P])는 병렬 — 서로 다른 읽기 전용 문서
- Polish의 T016·T017([P])는 병렬 — 문서 정합 확인 vs 실제 앱 수동 검증
- US1 완료 후 US2·US3는 서로 다른 관심사로 병렬 진행 가능. **단** 자동 테스트 T011·T013은 동일 파일 `__tests__/CharCount.test.tsx`를 수정하므로 서로 [P] 불가(파일 충돌). 수동 검증 T012·T014는 병렬 가능

---

## Parallel Example: Setup

```bash
# Setup의 병렬 준비 읽기 (T002, T003):
Task: "번들 Next.js 테스트 가이드 node_modules/next/dist/docs/**/testing/vitest.md 읽기"
Task: "DESIGN.md §2.7/§4.3/§6.4 토큰 읽기"
```

## Parallel Example: Polish

```bash
# 서로 다른 관심사 (T016, T017):
Task: "DESIGN.md ↔ app/globals.css 토큰 정합 확인 (quickstart 단계 3)"
Task: "quickstart.md 수동 검증 1~8 실행 (npm run dev)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: Setup 완료(T001-T003)
2. Phase 2: Foundational 완료(T004-T005) — `countGraphemes` (CRITICAL, 전 스토리 BLOCK)
3. Phase 3: User Story 1 완료(T006-T010)
4. **STOP & VALIDATE**: US1 독립 검증 — 타이핑하면 우측 하단 칩 실시간 갱신
5. 준비되면 데모/배포

### Incremental Delivery

1. Setup + Foundational → 기반 준비
2. US1 추가 → 독립 검증 → 데모(MVP: 실시간 카운트)
3. US2 추가 → 독립 검증(열자마자 정확 + 글 전환 갱신)
4. US3 추가 → 독립 검증(삭제·붙여넣기·빈값·grapheme 정확)
5. 각 스토리는 이전 스토리를 깨지 않고 가치를 더함

### TDD Discipline (헌법 I)

- 프로덕션 코드 작성 전 실패하는 테스트가 먼저 존재해야 함
- `countGraphemes`(T004→T005), `<CharCount>`(T006→T007)는 각각 RED→GREEN→Refactor
- 목 사용 없음 — 실제 `Intl.Segmenter`·실제 컴포넌트를 검증(헌법 II)
- US2·US3의 자동 테스트는 공유 구현에 대한 커버리지/회귀 검증(green 기대) — 신규 프로덕션 코드를 추가하지 않으므로 각 스토리의 실질 독립 테스트는 수동 검증(T012·T014)

---

## Notes

- [P] = 다른 파일, 의존성 없음
- [Story] 라벨은 태스크를 스토리에 매핑(추적성)
- 각 user story는 독립적으로 완결·검증 가능
- 구현 전 테스트 실패(RED) 확인
- 태스크/논리적 그룹마다 커밋
- 체크포인트에서 멈춰 스토리 독립 검증 가능
- 회피: 모호한 태스크, 동일 파일 충돌, 스토리 독립성을 깨는 교차 의존
