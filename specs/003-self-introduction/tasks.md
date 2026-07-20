# Tasks: 자기소개 (Self-Introduction)

**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

각 태스크는 헌법 원칙 I의 TDD 사이클(테스트 작성 → 실패 확인 → 최소 구현 → 통과 확인)을 내포한다.

## Phase 0: 결정

- [x] **T001** 저장소 확정 — Supabase `public.profile.introduction` 읽기 전용 조회로 컬럼 확인
  (text, nullable). 원격 DB 쓰기 없음. → plan.md §1

## Phase 1: 정규화 규칙 (FR-006/007/008) — 모든 스토리의 기반

- [x] **T002 [RED]** `__tests__/introduction.test.ts` — `normalizeIntroduction` / `INTRODUCTION_MAX_LENGTH`:
  앞뒤 공백 제거, 공백만/빈 값 → null, 가운데 줄바꿈 보존, 200자 초과 절단, 정확히 200자 유지.
  → 7개 실패 확인 (`normalizeIntroduction is not a function`)
- [x] **T003 [GREEN]** `lib/profile-sync.ts`에 `INTRODUCTION_MAX_LENGTH`(200) + `normalizeIntroduction` 구현 → 7/7 통과

## Phase 2: 영속화 (US1/US2/US3, FR-002~005/010/012)

- [x] **T004 [RED]** `__tests__/introduction-store.test.ts` — `fetchIntroduction` / `saveIntroduction`.
  Supabase 클라이언트만 가짜로 두고 쿼리 구성·정규화·에러 매핑을 검증. → 13개 실패 확인
- [x] **T005 [GREEN]** `lib/profile-sync.ts`에 `fetchIntroduction`(select…maybeSingle) +
  `saveIntroduction`(update `introduction` 컬럼만, `.eq("user_id", …)`) 구현 → 13/13 통과

## Phase 3: 마이 페이지 UI (US1/US2/US3, FR-001/009 + 엣지 케이스)

- [x] **T006 [RED]** `__tests__/MyPage.introduction.test.tsx` — 가짜 Supabase 클라이언트가 profile 행을
  실제로 보관하는 통합 테스트 11개: US1 등록/빈 값 저장, US2 조회/빈 상태 placeholder,
  US3 수정/삭제, 공백만 입력, 여러 줄 왕복 보존, maxLength 200, 별명만 저장 시 자기소개 유지,
  자기소개만 저장 시 name/email/avatar 불변(SC-005). → 11개 실패 확인 (필드 없음)
- [x] **T007 [GREEN]** `app/(app)/mypage/page.tsx` — `introDraft` 상태, `useEffect([userId])` 로드,
  `saveProfile`에서 `saveIntroduction` 호출, 별명 필드와 이메일 필드 사이에 `자기소개` textarea 추가.
  `app/globals.css`에 `.field-textarea` 추가 → 11/11 통과

## Phase 4: 문서 동기화

- [x] **T008** `DESIGN.md` — §2.7.6b `.field-textarea`, §4.4 자기소개 필드·상호작용, §6.5 문구,
  §1 타이포/치수 표, §7 포커스 링, §8 커버리지 갱신
- [x] **T009** `docs/profile-table-setup.sql` — 기존 `alter table` 블록에
  `add column if not exists introduction text` 사후 문서화(idempotent, DB 변화 없음)
- [x] **T010** `specs/003-self-introduction/` — 저장소 결정 노트 해소, plan.md·tasks.md 기록

## 완료 게이트

- [x] `npm test` 전체 통과 (11 파일 / 69 테스트), 경고·에러 없는 무결한 출력
- [x] `npx tsc --noEmit` 통과
- [x] `npm run build`(정적 export) 통과
- [x] 원격 Supabase DB 쓰기 없음 (읽기 전용 조회만)
