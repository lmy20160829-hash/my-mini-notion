# Implementation Plan: 내용 글자 수 카운터 (Content Character Counter)

**Branch**: `001-char-counter` | **Date**: 2026-07-10 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-char-counter/spec.md`

## Summary

글 상세 화면(`/posts/[id]`)의 내용 입력칸(`.detail-content` textarea)에 입력된 글자 수를, 내용 편집 영역 우측 하단에 고정(스티키)된 작은 칩으로 실시간 표시한다. 글자 수는 **사용자가 하나로 인식하는 글자(grapheme cluster)** 단위로 세며(결합 이모지·국기·한글 음절 각 1글자), 표시 전용(길이 제한 없음)이다.

**기술 접근**: 순수 함수 `countGraphemes(text)`(브라우저·Node 내장 `Intl.Segmenter` 사용, 신규 의존성 없음) + 프레젠테이션 클라이언트 컴포넌트 `<CharCount text>`로 관심사를 분리한다. 순수 함수와 컴포넌트를 각각 TDD로 독립 검증하고(스토어·라우터 목 불필요), 상세 페이지는 이미 존재하는 `post.content`를 `<CharCount>`에 넘겨 렌더한다. 위치·스타일은 `DESIGN.md` 토큰만 재사용하고, 신규 `.detail-charcount` 조각은 구현과 동시에 `DESIGN.md`에 반영한다.

## Technical Context

**Language/Version**: TypeScript 5 (strict), React 19.2.4

**Primary Dependencies**: Next.js 16.2.10 (App Router), lucide-react(기존) — **신규 의존성 없음**. grapheme 계산은 런타임 내장 `Intl.Segmenter`(V8/모던 브라우저·Node) 사용.

**Storage**: N/A — 글자 수는 저장하지 않는 파생 값. 내용 원본은 기존 store(`lib/store.tsx`) → `localStorage("mini-notion-v1")`로 이미 관리됨.

**Testing**: Vitest 4 + React Testing Library + jsdom (`vitest.config.mts`, 헌법 확정 스택). `npm test`(=`vitest run`)로 RED/GREEN 확인.

**Target Platform**: 데스크톱 웹(모던 브라우저). `Intl.Segmenter` 미지원 극노후 브라우저는 범위 밖.

**Project Type**: Web application (단일 Next.js App Router 앱).

**Performance Goals**: 키 입력마다 글자 수 갱신이 지각 지연 없이(사실상 <16ms/프레임) 반영. grapheme 분절은 O(n)이며 일반 메모 길이(수천 자)에서 무시할 수준.

**Constraints**: (1) 내용 입력칸만 대상(제목 제외), (2) 표시 전용·길이 제한 없음, (3) 편집 영역 우측 하단 sticky·스크롤 무관 항상 노출·편집 비방해(`pointer-events:none`), (4) `DESIGN.md` 토큰만 사용(신규 원시값 금지), (5) grapheme cluster 단위 계산.

**Scale/Scope**: 화면 1개(글 상세)에 소형 컴포넌트 1개 추가. 개인용 단일 사용자 도구. 신규 파일 2개 + 기존 파일 2개 수정 + 테스트 2개 + `DESIGN.md` 갱신.

## Constitution Check

*GATE: Phase 0 전 통과 필수. Phase 1 설계 후 재점검.*

| 원칙 | 판정 | 근거 |
|---|---|---|
| **I. Test-First (TDD, NON-NEGOTIABLE)** | ✅ PASS | `countGraphemes`는 순수 함수라 실패 테스트→최소 구현이 자연스럽다. `<CharCount>`는 props 전용 프레젠테이션 컴포넌트라 스토어/라우터 없이 RTL로 렌더·갱신을 검증 가능. 각 태스크는 RED→GREEN→Refactor 순서를 내포한다. |
| **II. 테스트 무결성 — 모킹 규율** | ✅ PASS | 목 없이 실제 함수·실제 컴포넌트를 검증한다. 스토어/라우터/`Intl.Segmenter` 어느 것도 모킹하지 않는다(모두 실제 사용). |
| **III. 디자인 시스템 준수** | ✅ PASS | 계획 전 `DESIGN.md` 완독함. `.detail-charcount`는 기존 토큰(`--surface-card`, `--border-subtle`, `--shadow-xs`, `--radius-pill`, `--text-muted`, font 12)만 재사용. 신규 조각은 구현과 **동시에** `DESIGN.md` §2.7/§4.3에 반영(문서-코드 불일치 방지). |
| **IV. 프레임워크 문서 우선** | ✅ PASS | 클라이언트 컴포넌트/유닛 테스트는 번들 문서(`node_modules/next/dist/docs/.../testing/vitest.md`) 기준. 구현 착수 시 관련 가이드 확인. async Server Component 제약은 해당 없음(클라이언트 컴포넌트). |
| **V. 단순성 (YAGNI)** | ✅ PASS | 내용칸 전용·표시 전용만 구현. 최대 길이·경고·설정·단어 수 등 미요구 기능 추가 안 함. 신규 의존성 없음. 컴포넌트 분리는 추측이 아니라 **TDD 테스트 용이성** 확보를 위한 최소 구조(원칙 I·II 충족 수단). |

**결과: 위반 없음 → Complexity Tracking 비움.**

## Project Structure

### Documentation (this feature)

```text
specs/001-char-counter/
├── plan.md              # This file (/speckit-plan output)
├── spec.md              # Feature spec (+ Clarifications)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── count-graphemes.md      # 순수 함수 계약
│   └── char-count-component.md # 컴포넌트 + UI/CSS 계약
├── checklists/
│   └── requirements.md  # 스펙 품질 체크리스트(기존, 16/16)
└── tasks.md             # /speckit-tasks 출력 (이 명령이 생성하지 않음)
```

### Source Code (repository root)

```text
lib/
├── store.tsx            # (기존, 변경 없음) Post 타입·자동저장
└── charCount.ts         # [신규] countGraphemes(text: string): number  ─ 순수 함수

components/
├── ui/…                 # (기존, 변경 없음)
└── CharCount.tsx        # [신규] <CharCount text> ─ .detail-charcount 렌더(클라이언트, props 전용)

app/(app)/posts/[id]/
└── page.tsx             # [수정] textarea 뒤에 <CharCount text={post.content} /> 추가

app/
└── globals.css          # [수정] "글 상세" 섹션에 .detail-charcount 조각 추가

__tests__/
├── setup.smoke.test.tsx # (기존)
├── charCount.test.ts    # [신규] countGraphemes 유닛 테스트
└── CharCount.test.tsx   # [신규] <CharCount> 렌더/갱신 테스트

DESIGN.md                # [수정] §2.7.x + §4.3에 .detail-charcount 컴포넌트 명세 반영(구현과 동시에)
```

**Structure Decision**: 기존 단일 Next.js App Router 앱 구조를 그대로 따른다. 계산 로직(`lib/charCount.ts`)과 표시(`components/CharCount.tsx`)를 분리해 헌법 원칙 I·II(순수 함수·컴포넌트 각각 목 없이 독립 테스트)를 충족한다. 신규 디렉터리는 만들지 않고 기존 `lib/`·`components/`·`__tests__/`에 파일을 추가한다.

## Complexity Tracking

> Constitution Check 위반 없음 — 비움.
