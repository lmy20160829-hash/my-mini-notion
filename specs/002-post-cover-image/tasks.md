---
description: "Task list for Post Cover Image (Random Cat)"
---

# Tasks: Post Cover Image (Random Cat)

**Input**: Design documents from `/specs/002-post-cover-image/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/post-cover.md](./contracts/post-cover.md), [quickstart.md](./quickstart.md)

**Tests**: 이 저장소 헌법 원칙 I(TDD 의무, NON-NEGOTIABLE)에 따라 테스트는 **필수**다. 모든 구현 태스크는 대응하는 실패 테스트를 먼저 작성·확인(RED)한 뒤 최소 구현(GREEN)한다.

**Organization**: 태스크는 사용자 스토리별로 묶어 독립적으로 구현·테스트할 수 있게 한다. 단, 세 스토리가 동일한 `components/PostCover.tsx`·`app/globals.css`를 공유하므로 파일 단위로는 순차 실행된다(스토리는 독립적으로 *테스트 가능*하나 구현은 같은 파일을 직렬로 편집).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 서로 다른 파일 + 선행 의존 없음 → 병렬 가능
- **[Story]**: US1/US2/US3 (spec.md 사용자 스토리 매핑). Setup/Foundational/Polish는 라벨 없음.

## Path Conventions

Next.js App Router 단일 프로젝트. 컴포넌트 `components/`, 스타일 `app/globals.css`, 페이지 `app/(app)/posts/[id]/page.tsx`, 테스트 `__tests__/*.test.tsx`(기존 관행), 디자인 문서 `DESIGN.md`.

**공유 계약(테스트·구현 공통, [contracts/post-cover.md](./contracts/post-cover.md) 참조)**:
- 상태 식별 훅: 커버 노드에 `data-cover="skeleton" | "image" | "fallback"` 속성 노출(테스트는 클래스가 아니라 이 속성에 결합).
- 타임아웃 상수: `COVER_TIMEOUT_MS = 10000`.
- 프레임워크 경계(`next/navigation`)만 최소 모킹, 스토어·페이지·컴포넌트는 실제 코드 사용(헌법 II). 선례: `__tests__/PostDetailPage.charcount.test.tsx`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 기준선 확인 및 공유 계약 확정. 신규 의존성·설정 변경 없음(research D1).

- [ ] T001 기준선 `npm test`가 그린인지 확인하고, 본 기능은 신규 의존성·`next.config.ts` 변경이 없음을 확정한다(일반 `<img>` 사용). 테스트/구현이 공유할 계약값 `data-cover`(`skeleton|image|fallback`)와 `COVER_TIMEOUT_MS=10000`을 [contracts/post-cover.md](./contracts/post-cover.md) 기준으로 확정한다.

**Checkpoint**: 기준선 그린 + 공유 계약 확정.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 세 스토리가 모두 올라탈 공유 기반 — 커버 박스가 제목 입력창 **위**에 존재하도록 컴포넌트를 만들고 페이지에 연결한다. 이 단계 자체로는 어떤 스토리의 시각 상태(이미지/스켈레톤/폴백)도 완성하지 않는다.

**⚠️ CRITICAL**: 이 단계 완료 전에는 US1/US2/US3 작업을 시작할 수 없다.

- [ ] T002 실패 테스트 작성(RED): 글 상세 렌더 시 커버 컨테이너가 `.detail-title`보다 **앞(위)** 에 존재함을 DOM 순서로 검증 — `__tests__/PostDetailPage.cover.test.tsx` (quickstart V7 / FR-001). `next/navigation`만 모킹, 스토어·페이지 실제 사용.
- [ ] T003 T002를 통과시키는 최소 구현: `components/PostCover.tsx` 신규 생성(`"use client"`, `postId: string` prop, `status` 상태 기본 `"loading"`, 마운트 1회 캐시버스트 `src` 계산, 로드 감지용 `<img>` + `onLoad`/`onError` 핸들러 및 `COVER_TIMEOUT_MS` 타이머 배선·언마운트 정리 — 시각 상태는 이후 스토리에서 채움). `app/(app)/posts/[id]/page.tsx`의 `.detail-breadcrumb`와 `<input class="detail-title">` 사이에 `<PostCover key={post.id} postId={post.id} />` 삽입. `app/globals.css`에 기반 `.detail-cover` 박스 스타일(고정 높이 200px, `--radius-lg`, `overflow:hidden`, `--surface-subtle` 배경, `--shadow-xs`, `margin 0 0 20px`, `aria-hidden`) 추가. **같은 변경에서** `DESIGN.md` §2.7·§4.3에 커버 박스 기반 항목을 반영(헌법 III).

**Checkpoint**: 커버 박스가 제목 위에 렌더되고 페이지가 정상 동작. 상태별 시각 표현은 아직 없음.

---

## Phase 3: User Story 1 - 글 상세에서 커버 이미지를 본다 (Priority: P1) 🎯 MVP

**Goal**: 글 상세를 열면 제목 입력창 위에서 랜덤 고양이 사진이 표시된다.

**Independent Test**: 커버 `<img>`에 로드가 발생하면 이미지가 노출되고, 커버가 제목보다 위에 위치한다(T002 배치 + 아래 로드 표시).

- [ ] T004 [US1] 실패 테스트 작성(RED): 커버 `<img>`에 `fireEvent.load` 발생 시 이미지 노출(`[data-cover="image"]`)·스켈레톤 제거를 검증 — `__tests__/PostCover.test.tsx` (V2 / FR-004, US1). RED 직접 확인.
- [ ] T005 [US1] T004 통과 최소 구현: `PostCover`의 `loaded` 상태에서 `.detail-cover__img`(`object-fit:cover`, 로드 시 opacity 페이드인 `--dur-normal --ease-standard`) 렌더. `app/globals.css`에 `.detail-cover__img` 추가 + **같은 변경에서** `DESIGN.md` §2.7 반영. 전체 `npm test` 그린 확인.

**Checkpoint**: 글을 열고 이미지가 도착하면 제목 위에 고양이 사진이 보인다 = **MVP 동작**. 독립 배포/데모 가능.

---

## Phase 4: User Story 2 - 로딩 중에는 스켈레톤으로 자리를 채운다 (Priority: P2)

**Goal**: 이미지 도착 전에는 스피너가 아니라 스켈레톤(shimmer)이 커버 자리를 채운다.

**Independent Test**: 초기 마운트 시 스켈레톤 노드가 보이고 스피너는 없으며, 로드되면 이미지로 대체된다(T005 재사용).

- [ ] T006 [US2] 실패 테스트 작성(RED): 초기 마운트에서 스켈레톤(`[data-cover="skeleton"]`)이 존재하고 스피너가 없음을 검증 — `__tests__/PostCover.test.tsx` (V1 / FR-003, SC-002, US2). RED 직접 확인.
- [ ] T007 [US2] T006 통과 최소 구현: `PostCover`의 `loading` 상태에서 `.detail-cover__skeleton`(shimmer, 스피너 아님) 렌더. `app/globals.css`에 `.detail-cover__skeleton` + `@keyframes mnShimmer` + `@media (prefers-reduced-motion: reduce)` 정적 폴백 추가 + **같은 변경에서** `DESIGN.md` §1.5(모션)·§2.7·§7(스켈레톤 한정 첫 reduced-motion 대응) 반영. 전체 `npm test` 그린 확인.

**Checkpoint**: US1 + US2 모두 독립 동작 — 로딩 시 스켈레톤 → 도착 시 이미지, 레이아웃 이동 없음(FR-005).

---

## Phase 5: User Story 3 - 이미지를 못 불러와도 화면이 깨지지 않는다 (Priority: P3)

**Goal**: 네이티브 오류(즉시) 또는 약 10초 타임아웃 시, 깨진 이미지 없이 커버 공간을 보존하는 중립 자리표시자를 보여주고 편집 흐름을 막지 않는다.

**Independent Test**: 커버 `error` 발생/타임아웃 시 폴백이 보이고 커버 박스가 유지되며, 그 상태에서 제목·본문 편집이 정상 동작한다.

- [ ] T008 [P] [US3] 실패 테스트 작성(RED): `__tests__/PostCover.test.tsx`에 유닛 테스트 추가 — (a) `fireEvent.error` → 폴백(`[data-cover="fallback"]`) 노출·스켈레톤 제거·깨진 이미지 아이콘 없음(V3/FR-006), (b) `vi.useFakeTimers` + `advanceTimersByTime(10000)` → 폴백(V4/FR-009,SC-005), (c) 타임아웃 확정 후 늦은 `fireEvent.load` 무시(V5/불변식), (d) 언마운트 후 타이머 진행 시 act·setState 경고 없음(V6/출력 무결). RED 직접 확인.
- [ ] T009 [P] [US3] 실패 테스트 작성(RED): 커버가 `error` 상태일 때 제목(`.detail-title`)·본문(`.detail-content`) 입력이 정상 변경됨을 검증 — `__tests__/PostDetailPage.cover.test.tsx` (V8 / FR-007, SC-004). RED 직접 확인.
- [ ] T010 [US3] T008·T009 통과 최소 구현: `PostCover`에 `error` 상태 추가 — `<img>` `onError` 즉시 전환 + `COVER_TIMEOUT_MS` 만료 전환 + `clearTimeout` 정리 + 최종 상태 가드(늦은 이벤트 무시). `.detail-cover__fallback`(중앙 `<ImageOff size={28}>` muted, `--surface-subtle`) 렌더. `app/globals.css`에 `.detail-cover__fallback` 추가 + **같은 변경에서** `DESIGN.md` §2.7 반영. 전체 `npm test` 그린 확인.

**Checkpoint**: 세 스토리 모두 독립 동작. 실패/지연에도 레이아웃 안정 + 편집 무영향.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 스토리 전반에 걸친 마무리.

- [ ] T011 [P] `DESIGN.md` 일관성 점검: §1.5(`mnShimmer`·`--dur-normal` 최초 사용), §2.7(커버/이미지/스켈레톤/폴백 조각), §4.3(상세 배치: 브레드크럼→커버→제목), §7(스켈레톤 reduced-motion) 항목이 실제 `globals.css`/`PostCover.tsx` 구현과 일치하는지 확인·정정.
- [ ] T012 완료 게이트: 전체 `npm test` 실행 → 전 시나리오(V1–V8) 그린, 에러·경고 없음(출력 무결). [quickstart.md](./quickstart.md) 수동 검증 4단계 확인.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (T001)**: 선행 없음.
- **Foundational (T002→T003)**: Setup 이후. **모든 스토리를 차단**.
- **US1 (T004→T005)**, **US2 (T006→T007)**, **US3 (T008/T009→T010)**: Foundational 이후. 논리적으로 상호 독립이나, 공유 파일(`PostCover.tsx`·`globals.css`) 때문에 파일 편집은 우선순위 순(US1→US2→US3)으로 직렬화 권장.
- **Polish (T011, T012)**: 원하는 스토리 완료 이후.

### Within Each Story (헌법 I)

- 테스트를 먼저 작성하고 **실패를 직접 확인(RED)** 한 뒤 최소 구현(GREEN). RED 확인 생략 금지.
- 각 구현 태스크의 CSS 변경은 **같은 변경에서 `DESIGN.md` 갱신**(헌법 III).

### Parallel Opportunities

- T008(유닛, `PostCover.test.tsx`)과 T009(통합, `PostDetailPage.cover.test.tsx`)는 서로 다른 파일 → **[P] 병렬 작성 가능**.
- 그 외 대부분은 `PostCover.tsx`·`globals.css`를 공유해 직렬. (소규모 단일 컴포넌트 기능이라 병렬 여지가 제한적 — 과장하지 않음.)
- 다인 개발 시: Foundational 완료 후 US2/US3 테스트 작성을 병렬 착수하되, 구현 병합은 파일 충돌 회피를 위해 순차 리베이스.

---

## Parallel Example: User Story 3

```bash
# US3의 두 테스트는 서로 다른 파일이라 동시 작성 가능:
Task: "T008 유닛 테스트(에러/타임아웃/늦은 로드/정리) in __tests__/PostCover.test.tsx"
Task: "T009 통합 테스트(폴백 상태에서 편집 무영향) in __tests__/PostDetailPage.cover.test.tsx"
# 두 테스트가 모두 RED임을 확인한 뒤 T010(구현)으로 GREEN.
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Phase 1 Setup(T001) → Phase 2 Foundational(T002–T003) → Phase 3 US1(T004–T005).
2. **STOP & VALIDATE**: 글을 열면 제목 위에 고양이 이미지가 보인다. 독립 데모 가능.

### Incremental Delivery

1. Setup + Foundational → 커버 박스가 제목 위에 존재.
2. US1 추가 → 이미지 표시(MVP) → 검증/데모.
3. US2 추가 → 스켈레톤 로딩 → 검증/데모.
4. US3 추가 → 실패 폴백 + 편집 무영향 → 검증/데모.
5. Polish → DESIGN.md 일관성 + 완료 게이트.

---

## Notes

- [P] = 서로 다른 파일 + 선행 의존 없음.
- 각 스토리는 독립적으로 테스트 가능(각 상태 전이가 독립 검증).
- **RED를 직접 목격**한 뒤 구현(헌법 I). 즉시 통과하는 테스트는 무효.
- CSS를 만지는 태스크는 `DESIGN.md`를 같은 변경에서 갱신(헌법 III) — 정답 기준은 실제 코드.
- 태스크 또는 논리적 묶음 완료마다 커밋.
- 지양: 모호한 태스크, 같은 파일 동시 편집, 스토리 독립성을 깨는 교차 의존.
