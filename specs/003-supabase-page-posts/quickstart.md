# Quickstart & Validation: Supabase 페이지 게시글 저장

**Feature**: 003-supabase-page-posts | **Date**: 2026-07-16

이 기능이 엔드투엔드로 동작함을 증명하는 실행·검증 가이드. 구현 세부는 `tasks.md`/구현 단계에서 다룬다.

## 사전 조건 (Prerequisites)

1. **인증 기반(004) 병합**: 이 워크트리(`wt1`, `main` 기준)에는 Supabase 인증 코드가 없다. 먼저 `004-supabase-google-login`을 이 브랜치로 병합(또는 리베이스)한다.
   - 확인: `lib/supabase.ts`, `lib/auth.tsx`, `app/layout.tsx`(AuthProvider/AppProvider 래핑) 존재.
2. **의존성 설치 + 프레임워크 문서 확인(Principle IV)**:
   ```bash
   npm install
   # 코드 작성 전 정적 export 관련 가이드 확인
   ls node_modules/next/dist/docs/
   ```
3. **환경변수**(`.env.local`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` 설정.
4. **RLS 정책 적용**: [`contracts/rls-policies.sql`](./contracts/rls-policies.sql)의 4개 정책을 Supabase 마이그레이션으로 적용.
   - 확인: `page` 테이블 정책이 `page_select_own/insert_own/update_own/delete_own` 4개 존재.

## 자동 테스트 (TDD 게이트)

```bash
npm test               # 전체 (vitest run) — 그린 + 무경고 확인
npm test -- lib/posts.test.ts   # 게시글 데이터 접근·매핑 단위 테스트만
```

**기대**: 순수 함수(`rowToPost`/`sortPosts`/`newInsertPayload`)와 목킹된 데이터 접근(load/create/update/delete) 테스트가 모두 통과. 각 테스트는 구현 전 RED를 목격한 뒤 GREEN이어야 한다(Constitution I).

## 수동 검증 시나리오 (RLS·소유권은 실 계정 필요)

앱 실행:
```bash
npm run dev            # http://localhost:3000
```

### S1 — 로그인 사용자 작성·영속 (US1, FR-001/002/010/011)
1. 로그인(구글) → 목록 화면.
2. `/page 첫 글` 입력 후 Enter(또는 "새 페이지").
3. **기대**: 상세로 이동, 제목·내용 입력 → "자동 저장됨". 새로고침 후에도 목록/상세에 유지.
4. Supabase `page` 테이블에 `user_id`가 내 계정인 행이 생성됨.

### S2 — 자신의 글만 조회 (US2, FR-004/005)
1. 사용자 A로 글 2~3개 작성.
2. 로그아웃 → 목록 화면 접근 시 `/login`으로 유도(게시글 미표시).
3. 사용자 B로 로그인.
4. **기대**: B의 목록에 A의 글이 **하나도** 보이지 않음. B가 A의 글 URL(`/posts/<A의 id>`)로 직접 접근해도 내용 미표시(목록으로 복귀).

### S3 — 자신의 글만 삭제 (US3, FR-006)
1. 사용자 B가 자신의 글 상세에서 "삭제" → confirm.
2. **기대**: 목록/서버에서 제거, 새로고침 후에도 없음.
3. (경계) A의 글 id로 삭제 시도(직접 호출) → 0행 영향, A의 글 유지.

### S4 — 자신의 글 편집 저장 (US4, FR-007)
1. 자신의 글 제목·내용 수정.
2. **기대**: 디바운스 후 서버 저장. 새로고침 시 변경 유지.

### S5 — 즐겨찾기 제거 확인 (FR-012, R10)
1. 목록/상세/사이드바 어디에도 별(즐겨찾기) 버튼이 없음.
2. `DESIGN.md`와 코드에 즐겨찾기 컴포넌트·토큰이 남아있지 않음.

## 성공 기준 매핑

| 시나리오 | Success Criteria |
|---|---|
| S1 | SC-001(영속 100%), SC-005(반영 ≤2s) |
| S2 | SC-002(타인 글 노출 0), SC-003(비로그인 작성 0%) |
| S3 | SC-004(타인 글 삭제 0%) |
| 사전조건 4 | SC-006(테이블 스키마 변경 0 — 정책만 추가) |

## 롤백 안내

- 코드: 브랜치 되돌리기.
- DB: 추가한 4개 정책만 `drop policy ...` 하면 원상복구(테이블 구조는 처음부터 불변).
