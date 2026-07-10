# Phase 1 Data Model: 내용 글자 수 카운터

**Feature**: 001-char-counter | **Date**: 2026-07-10

이 기능은 **새로운 영속 데이터를 만들지 않는다.** 글자 수는 기존 내용 문자열에서 매 렌더 파생되는 표시 전용 값이다.

## Entities

### Note Content (기존 — 변경 없음)
- **출처**: `lib/store.tsx`의 `Post.content: string` (localStorage `mini-notion-v1`에 자동 저장).
- **역할**: 글자 수 계산의 **입력**. 이 기능은 `content`를 읽기만 하며 쓰지 않는다.
- **관계**: 글 상세 화면이 `post.content`를 `<CharCount text={post.content} />`에 전달.

### Character Count (파생 — 신규, 비영속)
- **정의**: `content`에서 `countGraphemes`로 계산한 grapheme cluster 개수(정수).
- **속성**:
  | 속성 | 타입 | 규칙 |
  |---|---|---|
  | value | integer | `>= 0`. 빈 문자열 → `0`. |
  | 단위 | — | 사용자가 하나로 인식하는 글자(grapheme cluster) 1개 = 1. 공백·줄바꿈 포함. 결합 이모지·국기·피부톤 변형·한글 음절 각 1. |
  | 표시 | string | `` `${value}자` `` (예: `0자`, `128자`). |
- **생명주기**: 저장·캐시 없음. `content`가 바뀔 때마다 재계산되어 렌더에 반영. 화면 전환·언마운트 시 소멸.
- **관계**: `content`(입력) → `countGraphemes`(변환) → `<CharCount>`(표시).

## Validation Rules (요구사항 매핑)

| 규칙 | 출처 | 검증 방식 |
|---|---|---|
| 빈 내용 → `0자` | FR-005 | `countGraphemes("") === 0` |
| 공백·줄바꿈도 계수 | FR-009 | `countGraphemes("a b\nc") === 5` |
| grapheme 단위 계수 | FR-009 | `countGraphemes("👨‍👩‍👧") === 1`, `countGraphemes("🇰🇷") === 1` |
| 내용칸만 대상(제목 제외) | FR-008 | `<CharCount>`에 `post.content`만 전달(제목 미전달) |
| 값이 곧 내용 길이(어긋남 0) | SC-002 | 다양한 입력에 대해 `countGraphemes` 반환 == 기대 grapheme 수 |

## State Transitions

해당 없음 — 상태 기계 아님. 단방향 파생(`content` → count) 뿐.
