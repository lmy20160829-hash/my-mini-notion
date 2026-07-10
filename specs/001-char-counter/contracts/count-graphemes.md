# Contract: `countGraphemes` (순수 함수)

**File**: `lib/charCount.ts`

## Signature

```ts
export function countGraphemes(text: string): number
```

## Semantics

- 입력 문자열의 **grapheme cluster**(사용자가 하나로 인식하는 글자) 개수를 반환한다.
- 구현: 모듈 스코프에서 1회 생성한 `Intl.Segmenter('ko', { granularity: 'grapheme' })`로 분절한 개수.
- 순수·결정적: 동일 입력 → 동일 출력. 부수효과 없음.

## Contract table

| # | 입력 | 반환 | 근거(FR) |
|---|---|---|---|
| 1 | `""` | `0` | FR-005 |
| 2 | `"안녕"` | `2` | FR-009 |
| 3 | `"hello"` | `5` | FR-009 |
| 4 | `"a b\nc"` (공백+줄바꿈 포함) | `5` | FR-009 |
| 5 | `"   "` (공백 3) | `3` | FR-009 (공백 포함) |
| 6 | `"👨‍👩‍👧"` (ZWJ 가족 이모지) | `1` | FR-009 (grapheme) |
| 7 | `"🇰🇷"` (국기) | `1` | FR-009 (grapheme) |
| 8 | `"👍🏽"` (피부톤 변형) | `1` | FR-009 (grapheme) |
| 9 | `"가나다😀"` | `4` | FR-009 (한글 각1 + 이모지 1) |

## Notes

- 로케일은 결과에 영향 없음(`'ko'` 고정으로 충분).
- 매우 긴 입력에도 O(n) 단일 순회 — 별도 최적화 불필요(Performance Goal 충족).

## TDD

위 표의 각 행이 실패 테스트 → 최소 구현(Iron Law) 대상. `__tests__/charCount.test.ts`에서 검증.
