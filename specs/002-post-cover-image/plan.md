# Implementation Plan: Post Cover Image (Random Cat)

**Branch**: `002-post-cover-image` | **Date**: 2026-07-13 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-post-cover-image/spec.md`

## Summary

글 상세 화면(`/posts/[id]`)에서 제목 입력창 바로 위에 커버 이미지 영역을 추가한다. 이미지는 외부 오픈 API(`https://cataas.com/cat/cute`)에서 랜덤 고양이 사진을 가져오며, 로딩 중에는 스피너가 아니라 스켈레톤(자리표시자)을, 실패 시(네이티브 오류 즉시 또는 약 10초 타임아웃)에는 커버 공간을 보존하는 중립 자리표시자를 보여준다. 세 상태(로딩/표시/실패) 모두 동일한 커버 박스를 점유해 레이아웃 이동을 방지한다.

기술 접근: 상세 페이지(이미 Client Component)에 신규 Client Component `PostCover`를 추가하고, 고정 높이 커버 박스 + 일반 `<img>`(네이티브 `onLoad`/`onError`) + `setTimeout` 상한으로 상태를 전환한다. `next/image` 대신 일반 `<img>`를 쓰는 이유는 Phase 0 research에 정리했다.

## Technical Context

**Language/Version**: TypeScript (strict), React 19

**Primary Dependencies**: Next.js 16.2.10 (App Router), `lucide-react`(아이콘). 신규 의존성 없음.

**Storage**: N/A — 커버 이미지는 영구 저장하지 않는 일시적 표시 리소스(로컬 스토리지·스토어 변경 없음).

**Testing**: Vitest 4 + React Testing Library + jsdom (`vitest.config.mts`, `npm test`). PostCover는 동기 Client Component라 유닛 테스트 가능(헌법 Technology Stack의 async Server Component 제약에 해당하지 않음).

**Target Platform**: 웹(브라우저), 라이트 단일 테마.

**Project Type**: 웹 애플리케이션(단일 프로젝트, Next.js App Router).

**Performance Goals**: 스켈레톤 즉시 표시(체감 지연 없음), 이미지 도착 시 레이아웃 이동 없음, 실패/지연 시 최대 약 10초 내 확정 상태.

**Constraints**:
- 커버 로딩/실패와 무관하게 제목·본문 편집 100% 정상 동작(FR-007).
- 커버 실패 시 커버 영역을 숨기지 않음(중립 자리표시자로 공간 보존, FR-006).
- 실패 판정: 네이티브 이미지 오류 즉시 또는 오류 없이 약 10초 타임아웃 초과(FR-009).
- 디자인은 `DESIGN.md` 토큰·패턴 재사용(헌법 III); 신규 토큰은 `DESIGN.md`에 동시 반영.

**Scale/Scope**: 화면 1개(글 상세) + 신규 컴포넌트 1개 + `globals.css` 커버/스켈레톤 스타일 + `DESIGN.md` 갱신. 소규모.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 원칙 | 상태 | 근거 |
|------|------|------|
| I. Test-First (TDD 의무) | PASS | PostCover의 로딩/표시/실패/타임아웃 상태와 "제목 위 배치"·"편집 무영향"을 실패 테스트 → 최소 구현 순으로 진행(§Phase 1, quickstart, tasks에서 강제). |
| II. 테스트 무결성(모킹 규율) | PASS | `next/image` 등 목 없이 실제 `<img>`의 `load`/`error` 이벤트를 `fireEvent`로 발생, 타임아웃은 `vi.useFakeTimers`로 실시간 검증. 목 동작 단언 없음. |
| III. 디자인 시스템 준수 | PASS | `DESIGN.md` 정독 완료. 커버/스켈레톤/폴백은 기존 토큰(`--surface-subtle/-hover`, `--radius-lg`, `--shadow-xs`, `--dur-*`, `--ease-*`, `--text-placeholder`) 재사용. 신규 결정(커버 높이·shimmer 키프레임·reduced-motion 가드)은 globals.css 변경과 **같은 커밋**에서 `DESIGN.md`에 반영(tasks에 태스크로 명시). |
| IV. 프레임워크 문서 우선 | PASS | App Router 이미지 문서(`node_modules/next/dist/docs/01-app/01-getting-started/12-images.md`) 확인. 랜덤·비캐시 외부 엔드포인트라 `next/image` 최적화 이점이 없고 `remotePatterns` 설정만 늘어 일반 `<img>` 채택(research 참조). |
| V. 단순성(YAGNI) | PASS | 신규 의존성·config 변경·스토어 변경 없음. 컴포넌트 1개 + CSS. 커버 편집/업로드/글별 영구 저장은 스펙에서 명시적으로 범위 밖. |

**결과: 위반 없음 → Complexity Tracking 비움.**

## Project Structure

### Documentation (this feature)

```text
specs/002-post-cover-image/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── post-cover.md    # Phase 1 output (UI 컴포넌트 계약 + 외부 API 계약)
├── checklists/
│   └── requirements.md  # /speckit-specify 산출물
└── tasks.md             # /speckit-tasks 산출물 (본 명령이 생성하지 않음)
```

### Source Code (repository root)

```text
app/
├── (app)/
│   └── posts/
│       └── [id]/
│           └── page.tsx          # [수정] 브레드크럼과 .detail-title 사이에 <PostCover key={post.id} /> 삽입
└── globals.css                    # [수정] .detail-cover* 스타일 + mnShimmer 키프레임 + reduced-motion 가드

components/
├── PostCover.tsx                  # [신규] 커버 이미지 Client Component (로딩/표시/실패 상태 + ~10s 타임아웃)
└── CharCount.tsx                  # (기존, 참고: 상세 페이지 자식 컴포넌트 패턴 선례)

__tests__/  또는 소스 콜로케이션 *.test.tsx
├── PostCover.test.tsx             # [신규] 유닛: 초기 스켈레톤/이미지 load/이미지 error/타임아웃
└── post-detail-cover.test.tsx     # [신규] 통합: 커버가 제목 위에 위치 + 커버 실패 시 편집 무영향

DESIGN.md                          # [수정] §2.7 커버/스켈레톤 조각 + §1.5 모션(shimmer) + §4.3 상세 배치 반영
```

**Structure Decision**: 기존 단일 Next.js 앱 구조를 그대로 사용한다. 커버는 상세 화면 전용이므로 `app/(app)/posts/[id]/page.tsx`만 수정하고, 상태 로직은 테스트 가능성과 관심사 분리를 위해 `components/PostCover.tsx`로 분리한다(선례: `components/CharCount.tsx`가 상세 페이지의 자식 표시 컴포넌트로 존재). 스타일은 `app/globals.css`에 기존 `.detail-*` 이웃으로 추가한다.

## Complexity Tracking

> Constitution Check에 위반이 없으므로 비움.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |
