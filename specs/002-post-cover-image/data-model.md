# Phase 1 Data Model: Post Cover Image (Random Cat)

이 기능은 영구 데이터를 추가하지 않는다. `Post` 타입·스토어·localStorage 스키마는 **변경 없음**. 모델링 대상은 커버 컴포넌트의 **일시적(transient) UI 상태**뿐이다.

## Entity: Cover Image (transient, 컴포넌트 로컬 상태)

글 상세 화면 상단에 표시되는 일회성 표시 리소스. 저장·직렬화되지 않으며 마운트 수명 동안만 존재한다.

| 필드 | 타입 | 설명 |
|------|------|------|
| `status` | `"loading" \| "loaded" \| "error"` | 커버 상태 머신. 초기값 `"loading"`. |
| `src` | `string` | 마운트 시 1회 계산되는 이미지 URL. `https://cataas.com/cat/cute` + 캐시버스트 쿼리. 렌더 간 불변. |

**파생/상수**
- `COVER_TIMEOUT_MS = 10000` — 오류 없이 지연 시 실패로 전환하는 상한(FR-009).
- 캐시버스트 토큰: `Date.now().toString(36) + Math.random().toString(36).slice(2, 6)`(앱 uid 관행과 동일).

## State Transitions

```
                 ┌─────────────────────────────────────────┐
                 │                                          │
   (mount) ──▶ loading ──img onLoad──▶ loaded (최종)         │
                 │                                          │
                 ├──img onError────────▶ error (최종)         │
                 │                                          │
                 └──10s timeout 만료────▶ error (최종)         │
```

**규칙 (research D3 반영)**
- `loaded`·`error`는 **최종 상태**: 확정 후에는 다른 이벤트로 덮어쓰지 않는다(늦게 도착한 `onLoad`가 타임아웃 `error`를 되돌리지 않도록 가드).
- 마운트 시 타임아웃 타이머 1개 생성. 상태 확정 또는 언마운트 시 `clearTimeout`으로 정리(누수·경고 방지, 헌법 완료 게이트의 "출력 무결" 요건).
- `src`는 상태와 독립적으로 마운트당 1회 계산되어 재렌더에도 안정(깜빡임 방지, research D2).

## 상태 ↔ 렌더 매핑

| status | 렌더 (모두 동일 `.detail-cover` 박스 점유) |
|--------|-------------------------------------------|
| `loading` | `.detail-cover__skeleton`(shimmer) 표시. `<img>`는 로드 감지를 위해 존재하되 시각적으로 미노출(opacity 0). 스피너 없음(FR-003). |
| `loaded` | `.detail-cover__img`(opacity 1 페이드인) 표시, 스켈레톤 제거(FR-004). |
| `error` | `.detail-cover__fallback`(중립 자리표시자 + `ImageOff`) 표시, 스켈레톤·이미지 제거. 커버 공간은 유지(FR-006). |

## 불변식 (Invariants)

- 어느 상태에서든 커버 박스의 크기·위치는 동일하다 → 레이아웃 이동 없음(FR-005, SC-003).
- 커버의 어떤 상태도 제목·본문 입력을 막지 않는다 → 편집 무영향(FR-007, SC-004). 커버는 형제 요소이며 이벤트를 가로채지 않는다.
- 스피너 UI는 어떤 상태에서도 렌더되지 않는다(FR-003, SC-002).

## 변경 없음(명시)

- `lib/store.tsx`의 `Post`, `AppState`, localStorage 키(`mini-notion-v1`)·스키마: 변경 없음.
- `next.config.ts`: 변경 없음(일반 `<img>` 사용, research D1).
