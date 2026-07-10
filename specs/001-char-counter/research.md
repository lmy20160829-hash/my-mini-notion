# Phase 0 Research: 내용 글자 수 카운터

**Feature**: 001-char-counter | **Date**: 2026-07-10

스펙의 Clarifications에서 계산 단위(grapheme)와 배치(sticky)는 이미 확정됨. 남은 기술적 미지수를 해소한다.

---

## R1. grapheme cluster 글자 수 계산 방법

- **Decision**: 런타임 내장 `Intl.Segmenter`를 `granularity: 'grapheme'`으로 사용해 분절 개수를 센다.
  ```ts
  const seg = new Intl.Segmenter('ko', { granularity: 'grapheme' });
  export function countGraphemes(text: string): number {
    let n = 0;
    for (const _ of seg.segment(text)) n++;
    return n;
  }
  ```
- **Rationale**:
  - 스펙 FR-009/Clarification과 정확히 일치 — "사용자가 하나로 인식하는 글자 = 1".
  - **신규 의존성 0** (헌법 V-YAGNI). V8/모던 브라우저·Node에 내장.
  - 실측 검증(Node v24.18.0, jsdom 런타임과 동일 엔진):
    | 입력 | 기대 | 실측 |
    |---|---|---|
    | `""` | 0 | 0 |
    | `"안녕"` | 2 | 2 |
    | `"a b\nc"`(공백·줄바꿈 포함) | 5 | 5 |
    | `"👨‍👩‍👧"`(ZWJ 가족) | 1 | 1 |
    | `"🇰🇷"`(국기) | 1 | 1 |
    | `"👍🏽"`(피부톤 변형) | 1 | 1 |
- **Alternatives considered**:
  - `text.length`(UTF-16 code unit): 이모지를 2+로 셈 → 요구사항 위반. 기각.
  - `[...text].length`(code point): 단일 이모지는 맞지만 ZWJ 결합 이모지(👨‍👩‍👧)를 여러 개로 셈 → 위반. 기각.
  - `grapheme-splitter`/`graphemer` 등 npm 라이브러리: `Intl.Segmenter`로 충분하므로 불필요한 의존성. 기각(YAGNI).
- **주의**: 매 호출 `new Intl.Segmenter()` 대신 모듈 스코프에서 1회 생성해 재사용(경미한 성능/GC 이점). 결과값은 로케일과 무관하므로 `'ko'` 고정으로 충분.

## R2. 테스트 런타임에서 `Intl.Segmenter` 가용성

- **Decision**: 별도 폴리필·모킹 없이 실제 `Intl.Segmenter`로 테스트한다.
- **Rationale**: 테스트 스택은 Vitest + jsdom(= Node 엔진, 현재 v24.18.0). `Intl.Segmenter`는 Node 16+에서 기본 제공되어 유닛/컴포넌트 테스트에서 그대로 동작(위 실측이 곧 테스트 환경 검증). 헌법 II(모킹 규율): 실제 동작을 검증하고 목을 쓰지 않는다.
- **Alternatives considered**: `Intl.Segmenter` 모킹 → 목 동작만 검증하게 되어 무의미. 기각.

## R3. "편집 영역 우측 하단 고정(스티키)" 구현 패턴

- **Decision**: `.app-main`(스크롤 컨테이너, `overflow-y:auto`) 흐름 안, `.detail-page`(max-width 760px 중앙, block)의 **textarea 다음 마지막 자식**으로 카운트 칩을 두고 `position: sticky; bottom: 24px` + `margin-left: auto; width: fit-content`로 우측 하단에 고정한다. `pointer-events: none`으로 아래 본문 편집을 절대 막지 않는다.
- **Rationale**:
  - `.detail-page`는 이미 하단 padding `96px`가 있어 sticky 칩이 본문 마지막 줄을 가리지 않는다.
  - sticky는 스크롤 컨테이너(`.app-main`) 기준으로 뷰포트 하단 근처에 유지 → 긴 글을 스크롤해도 항상 우측 하단에 보임(SC-003, FR-006 충족). Clarification에서 채택한 "편집영역 고정" = 뷰포트 고정(C)이 아니라 편집 컬럼(760px) 내부 우측 하단.
  - `margin-left:auto + width:fit-content`로 760px 컬럼 오른쪽 정렬(block 요소 우정렬 표준 기법).
- **Alternatives considered**:
  - `position: fixed`(뷰포트 우측 하단): Clarification에서 기각한 옵션 C. 사이드바/다른 화면과 무관하게 떠서 편집 맥락과 분리됨.
  - textarea 내부 오버레이: `<textarea>`는 자식을 가질 수 없어 불가.
  - `float: right` + sticky: 조합이 취약. `margin-left:auto`가 더 견고.

## R4. 표시 문구·스타일 토큰 (DESIGN.md 정합)

- **Decision**: 텍스트는 `` `${n}자` ``(예: `128자`, 빈 값 `0자`). 스타일은 기존 토큰만 사용:
  - 컨테이너 칩: `background: var(--surface-card)`, `border: 1px solid var(--border-subtle)`, `box-shadow: var(--shadow-xs)`, `border-radius: var(--radius-pill)`, `padding: 3px 10px`.
  - 텍스트: `font-size: 12px`, `color: var(--text-muted)`, `user-select: none`.
  - 배치: `position: sticky; bottom: 24px; margin-left: auto; width: fit-content; pointer-events: none;`
- **Rationale**:
  - `자`는 한국어에서 글자 수의 관용 단위 → FR-010("글자 수임을 명확히") 충족, 간결.
  - 흰 배경(`--surface-card`) + 얇은 경계선 + 미세 그림자는 본문 위에 떠도 가독성 확보. 12px `--text-muted`는 DESIGN.md에서 카운트/메타에 쓰는 흐린 톤과 일관(§1.1.4, `.detail-meta span`).
  - 신규 원시값(hex/px 임의값) 없음 → 헌법 III 준수. 새 조각은 구현 시 `DESIGN.md` §2.7.x·§4.3에 기록.
- **Alternatives considered**:
  - `--text-placeholder`(#b0b3b8): DESIGN.md가 "카운트" 색으로 언급하나, 본문 위 칩에서는 대비가 약해 `--text-muted`(#8a8f98) 채택.
  - `Badge` 프리미티브 재사용: Badge는 gray-100 배경·11/600으로 본문 위 부유 칩엔 대비/여백이 부족. 별도 `.detail-charcount` 조각이 적합.
  - 모션(등장 애니메이션): 카운트는 빈번히 바뀌는 텍스트라 애니메이션이 오히려 산만. 없음(YAGNI).

## R5. 접근성(a11y) 취급

- **Decision**: 카운트는 보이는 텍스트 노드로 노출하되 `aria-live` 라이브 리전은 두지 않는다. `pointer-events: none`은 유지(포인터 상호작용 없음, a11y 트리에는 남음).
- **Rationale**: 키 입력마다 `aria-live`로 숫자를 읽으면 스크린리더에 소음이 된다. 숫자는 필요 시 읽을 수 있는 정적 텍스트로 충분. 스펙에서 a11y는 저임팩트(Outstanding)로 분류됨. 향후 요구 시 `aria-live="polite"` + 디바운스로 확장 가능(현재는 미도입, YAGNI).
- **Alternatives considered**: `aria-live="polite"` 즉시 도입 → 타건마다 낭독으로 방해. 기각.

---

## 미해결(NEEDS CLARIFICATION) 잔여

없음. 모든 기술 미지수 해소됨 → Phase 1 진행 가능.
