# Contract: `<CharCount>` 컴포넌트 + UI/CSS

**File**: `components/CharCount.tsx` (클라이언트 컴포넌트), 스타일 `app/globals.css` `.detail-charcount`

## Component signature

```tsx
export function CharCount({ text }: { text: string }): JSX.Element
```

- props 전용·프레젠테이션 컴포넌트. 내부 상태·스토어·라우터 의존 없음.
- 렌더: `<div className="detail-charcount">{countGraphemes(text)}자</div>`
- `text` prop이 바뀌면 표시 숫자도 즉시 갱신(부모 리렌더로 전달).

## Rendering contract

| # | `text` | 렌더 텍스트 | 근거 |
|---|---|---|---|
| 1 | `""` | `0자` | FR-005 |
| 2 | `"hello"` | `5자` | FR-001, FR-009 |
| 3 | `"안녕하세요"` | `5자` | FR-009 |
| 4 | `"👨‍👩‍👧"` | `1자` | FR-009 |
| 5 | `"hi"` → 리렌더 `"hiya"` | `2자` → `4자` | FR-002 (갱신) |

## CSS contract — `.detail-charcount` (신규, DESIGN.md 토큰만 사용)

```css
.detail-charcount {
  position: sticky;
  bottom: 24px;
  margin-left: auto;          /* 760px 컬럼 우측 정렬 */
  width: fit-content;
  padding: 3px 10px;
  background: var(--surface-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-pill);
  box-shadow: var(--shadow-xs);
  font-size: 12px;
  color: var(--text-muted);
  user-select: none;
  pointer-events: none;        /* 아래 본문 편집을 막지 않음 (FR-007) */
}
```

- **배치**: `.detail-page` 안 `.detail-content`(textarea) **다음** 마지막 자식. `.app-main` 스크롤 시 뷰포트 하단 근처에 sticky 고정 → 긴 글에서도 우측 하단 항상 노출(FR-006, SC-003).
- **토큰 검증**: 모든 값이 기존 토큰(`--surface-card`, `--border-subtle`, `--radius-pill`, `--shadow-xs`, `--text-muted`) 또는 DESIGN.md에 이미 쓰인 원시값(12px, sticky offset)만 사용. 신규 색/그림자 원시값 없음.

## 통합 지점 — `app/(app)/posts/[id]/page.tsx`

```tsx
// ...textarea(.detail-content) 바로 다음
<CharCount text={post.content} />
```

- `post.content`만 전달(제목 `post.title` 미전달) → FR-008.

## DESIGN.md 반영 의무 (헌법 III)

`.detail-charcount` 조각은 CSS 구현과 **같은 변경**에서 `DESIGN.md`에 기록한다:
- §2.7에 "글자 수 칩 `.detail-charcount`" 항목 추가(토큰·상태·마크업).
- §4.3 "글 상세" 구성 목록에 본문 다음 항목으로 카운트 칩 추가.
- §6.4 콘텐츠 인벤토리에 문구 `{n}자` 추가.

## 상태

| 상태 | 표시 |
|---|---|
| 빈 내용 | `0자` (숨기지 않음) |
| 입력/삭제/붙여넣기 중 | 현재 grapheme 수 실시간 |
| 다른 글로 이동 | 새 글 `content` 기준으로 갱신(부모가 새 `text` 전달) |
