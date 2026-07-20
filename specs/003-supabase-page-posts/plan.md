# Implementation Plan: Supabase 페이지 게시글 저장

**Branch**: `003-supabase-page-posts` (worktree `wt1`) | **Date**: 2026-07-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/003-supabase-page-posts/spec.md`

## Summary

기존 localStorage 기반 게시글 저장(`lib/store.tsx`)을 사용자가 만든 Supabase `public.page` 테이블로 전환한다. 정적 export SPA라 서버 런타임이 없으므로, 게시글 CRUD는 브라우저 Supabase SDK로 수행하고 접근 제어(로그인 사용자만 작성·자신의 글만 조회/수정/삭제)는 **Postgres RLS 정책**으로 강제한다. 테이블 구조는 변경하지 않는다(정책만 추가). 즐겨찾기(favorite)는 테이블에 컬럼이 없고 테이블 변경이 금지되므로 기능·UI를 제거한다(Clarify 결정). 인증은 `004-supabase-google-login`에서 구축된 `lib/auth.tsx`/`lib/supabase.ts`를 재사용한다.

## Technical Context

**Language/Version**: TypeScript 5 (strict), React 19, Next.js 16.2.10 (App Router)

**Primary Dependencies**: `@supabase/supabase-js` ^2.110.5 (004 브랜치에서 이미 추가), `lucide-react`

**Storage**: Supabase Postgres — 기존 `public.page` 테이블. 컬럼: `id bigint(identity, PK)`, `created_at timestamptz default now()`, `title text`, `content text`, `user_id uuid → auth.users.id`. RLS 활성화됨(현재 정책 0개 = 기본 거부). **구조 변경 금지 — 정책만 추가.**

**Testing**: Vitest 4 + React Testing Library + jsdom (`npm test`). 순수 매핑 함수는 유닛 테스트, 데이터 접근은 Supabase 클라이언트를 경계에서 목킹.

**Target Platform**: 정적 export SPA(`output: "export"`, GitHub Pages, `basePath` in prod), 모던 브라우저

**Project Type**: 단일 웹 프런트엔드(Next.js App Router, 클라이언트 컴포넌트 중심)

**Performance Goals**: 작성 후 화면 반영 p95 ≤ 2초(SC-005). 편집 자동저장은 디바운스로 쓰기 횟수 억제

**Constraints**: 서버 런타임 없음 → 보안은 RLS로 강제(클라이언트 우회 불가). `page` 테이블 구조 고정. 기존 인증(004) 재사용. 데모/시드 데이터 제거

**Scale/Scope**: 개인용 노션 클론, 사용자당 소량 게시글. 변경 범위 — `lib/store.tsx`(posts 계층), 목록 화면, 상세/편집 화면, 사이드바, DESIGN.md, RLS 마이그레이션

### ⚠️ 선행 조건 (구현 전 필수)

1. **인증 기반(004) 병합**: 현재 워크트리 `wt1`은 `main` 기준이라 `lib/supabase.ts`, `lib/auth.tsx`, `lib/profile.ts`와 004 버전의 `app/layout.tsx`·`AppShell.tsx`·화면들이 없다. 구현 착수 전에 `004-supabase-google-login`을 이 브랜치로 병합(또는 이 브랜치를 004 위로 리베이스)해야 한다.
2. **RLS 정책 적용**: `page` 테이블에 SELECT/INSERT/UPDATE/DELETE own 정책 4개를 적용해야 기능이 동작한다(현재 정책 0개 → 기본 거부). 이는 **테이블 구조 변경이 아니라 접근 제어 추가**다. `profile` 테이블의 기존 정책 패턴을 그대로 미러링한다.
3. **환경변수**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (004의 `.env.example` 기준).

## Constitution Check

*GATE: Phase 0 이전 통과 필수, Phase 1 이후 재점검.*

| 원칙 | 판정 | 근거 / 준수 방법 |
|---|---|---|
| **I. TDD (NON-NEGOTIABLE)** | ✅ PASS | 순수 함수(`rowToPost`, 정렬, insert 페이로드 빌더)를 먼저 실패 테스트로 작성 후 구현. 데이터 접근 모듈은 목킹된 Supabase 클라이언트로 RED→GREEN. `npm test` 그린 확인 후 완료. |
| **II. 테스트 무결성(모킹 규율)** | ✅ PASS | Supabase는 외부 I/O이므로 경계에서만 목킹하고, 목 응답은 실제 `{ data, error }` 구조·행 형태를 완전히 반영. 목 자체를 검증하지 않는다. |
| **III. 디자인 시스템 준수** | ✅ PASS (약속) | 즐겨찾기 UI 제거 + 비동기 로딩 상태는 UI 변경 → **착수 전 `DESIGN.md` 읽고**, 즐겨찾기 컴포넌트(`.fav-btn`/`.detail-fav-btn`/`.sidebar-item__star`)·토큰(`--status-favorite`) 제거를 코드와 `DESIGN.md` 양쪽에 반영해 불일치 방지. |
| **IV. 프레임워크 문서 우선** | ✅ PASS (약속) | 코드 작성 전 `npm install` 후 `node_modules/next/dist/docs/`의 정적 export 가이드 확인. 본 기능은 새 Next.js 서버 API를 도입하지 않음(모든 데이터 접근은 브라우저 SDK) → 프레임워크 리스크 낮음. |
| **V. 단순성(YAGNI)** | ✅ PASS | posts 계층만 전환하고 `nickname`/`avatar`(프로필 오버라이드)는 건드리지 않음. 얇은 posts 데이터 모듈 외 추상화 없음. 즐겨찾기 제거로 표면적 감소. |

**Gate 결과**: 통과. 정당화가 필요한 위반 없음 → Complexity Tracking 비움.

## Project Structure

### Documentation (this feature)

```text
specs/003-supabase-page-posts/
├── plan.md              # This file
├── research.md          # Phase 0 — 기술 결정
├── data-model.md        # Phase 1 — 엔티티·테이블 매핑·RLS
├── quickstart.md        # Phase 1 — 검증 시나리오
├── contracts/
│   ├── posts-store.md    # 게시글 데이터 접근(store) 인터페이스 계약
│   └── rls-policies.sql  # 적용할 RLS 정책 DDL 계약
└── tasks.md             # /speckit-tasks 산출물 (이 명령에서는 생성 안 함)
```

### Source Code (repository root)

```text
lib/
├── supabase.ts          # (004, 재사용) 브라우저 Supabase 싱글턴
├── auth.tsx             # (004, 재사용) useAuth: ready/session/user
├── posts.ts             # (신규) 순수 매핑/정렬 + Supabase 게시글 데이터 접근
└── store.tsx            # (변경) posts 계층을 posts.ts + auth 세션 기반으로 교체, favorite 제거

app/(app)/
├── page.tsx             # (변경) createPage await 처리, favorite 별 버튼 제거, 로딩/빈 상태
└── posts/[id]/
    └── PostDetailClient.tsx  # (변경) 편집 자동저장 디바운스, favorite 별 버튼 제거

components/
├── AppShell.tsx         # (변경) 사이드바 favorite prop 제거, app.loaded 게이트 유지
└── ui/SidebarItem.tsx   # (변경) favorite prop·별 렌더 제거

app/globals.css          # (변경) .fav-btn/.detail-fav-btn/.sidebar-item__star/--status-favorite 제거
DESIGN.md                # (변경) 즐겨찾기 컴포넌트·토큰·플로우 문서 제거 (코드와 동기화)

__tests__/ (또는 콜로케이션)
└── posts.test.ts        # (신규) rowToPost/정렬/페이로드 + 목킹된 데이터 접근 테스트

supabase (원격)
└── RLS 정책 마이그레이션  # page_select_own / page_insert_own / page_update_own / page_delete_own
```

**Structure Decision**: 기존 단일 프런트엔드 구조를 유지한다. 데이터 접근은 `lib/store.tsx`가 이미 담당하는 계약(`createPost`/`updatePost`/`deletePost`/`posts`/`loaded`)을 그대로 두되 내부 구현을 localStorage→Supabase로 교체하고, 테스트 가능한 순수 로직과 Supabase 호출을 `lib/posts.ts`로 분리한다. 화면 컴포넌트는 store 계약을 통해 접근하므로 변경이 국소화된다.

## Complexity Tracking

> 해당 없음 — Constitution Check 위반 없음.
