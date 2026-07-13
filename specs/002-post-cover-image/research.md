# Phase 0 Research: Post Cover Image (Random Cat)

명세와 명확화(Clarifications)에 남은 기술 미결정 사항을 해소한다. 근거 기준: 헌법(III 디자인, IV 프레임워크 문서), `DESIGN.md`, 번들된 Next.js App Router 문서.

---

## D1. 이미지 렌더링 방식 — `next/image` vs 일반 `<img>`

**Decision**: 고정 높이 커버 박스 안에 일반 `<img>`(`object-fit: cover`)를 사용한다. `next/image`는 쓰지 않는다.

**Rationale**:
- 엔드포인트 `https://cataas.com/cat/cute`는 요청마다 **랜덤** 이미지를 반환하는 비캐시성 리소스다. `next/image` 최적화 파이프라인은 URL을 키로 결과를 캐시하므로, 매번 다른 이미지를 원하는 이 케이스에서는 최적화 이점이 사실상 없고 옵티마이저 프록시 왕복만 늘어난다.
- 번들 문서(`01-app/01-getting-started/12-images.md`)에 따르면 원격 이미지에는 `next.config`의 `images.remotePatterns` 등록이 **필수**다. 랜덤 엔드포인트를 위해 설정을 추가하는 것은 YAGNI(헌법 V)에 반한다 — 일반 `<img>`는 설정이 필요 없다.
- 상세 페이지는 이미 `"use client"`이며, 로딩/오류/타임아웃 상태 전이는 본질적으로 클라이언트 로직이다. 일반 `<img>`의 네이티브 `onLoad`/`onError`로 충분하다.
- **선례 재사용(헌법 III)**: 기존 `components/ui/Avatar.tsx`(`DESIGN.md` §2.4)가 이미 일반 `<img>` + `object-fit: cover`로 원격/데이터 URL 이미지를 렌더한다. 동일 패턴을 따른다.
- 레이아웃 안정성(FR-005)은 `next/image`의 intrinsic sizing이 아니라 **고정 높이 커버 박스 + `object-fit: cover`**로 확보한다. 스켈레톤·폴백이 같은 박스를 점유하므로 상태 전환 시 이동이 없다.

**Alternatives considered**:
- *`next/image` + `remotePatterns` + 마운트별 캐시버스트 쿼리*: 랜덤 엔드포인트에 옵티마이저 캐시가 무의미하고, 설정·프록시 복잡도만 증가. 기각.
- *배경 이미지(`background-image`)*: `onLoad`/`onError` 훅이 없어 상태 전이·타임아웃 구현이 번거로움. 기각.

---

## D2. "매번 새 랜덤" 보장 & 재렌더 안정성

**Decision**: 커버 컴포넌트를 `<PostCover key={post.id} />`로 렌더해 **글(id)별로 마운트**하고, `src`는 마운트 시 1회 계산해 고정한다. `src`에는 브라우저 HTTP 캐시 재사용을 막는 유니크 쿼리(캐시버스트)를 붙인다.

**Rationale**:
- 상세 페이지는 제목/본문 입력마다 재렌더된다(자동 저장). `src`가 매 렌더 바뀌면 이미지가 재요청되어 깜빡인다 → `src`는 마운트당 1회만 계산해 안정화한다(예: `useState(() => buildSrc(id))`).
- 라우트 `/posts/A` → `/posts/B` 이동 시 페이지 컴포넌트는 유지되고 `id`만 바뀐다. `key={post.id}`를 주면 글이 바뀔 때 PostCover가 remount되어 새 랜덤을 가져온다 → 명세 Assumptions("열 때마다 새로, 다시 열면 다를 수 있다") 충족.
- 같은 글을 연속 편집하는 동안에는 같은 커버 유지(불필요한 재요청·깜빡임 방지). 마운트당 1회 요청.
- 캐시버스트 토큰은 앱의 기존 uid 방식(`lib/store` uid: `Date.now().toString(36) + Math.random().toString(36).slice(2,6)`)과 동일 스타일로 생성. (앱 런타임 코드이므로 `Date.now()`/`Math.random()` 사용에 제약 없음.)

**Alternatives considered**:
- *캐시버스트 없이 고정 URL*: 브라우저가 동일 URL 응답을 캐시해 "매번 새 랜덤"이 깨질 수 있음. 기각.
- *일정 간격 자동 교체/새로고침 버튼*: 스펙 범위 밖(표시 전용). 기각.

---

## D3. 실패 판정 로직 (FR-009, Clarification Q1)

**Decision**: 상태 머신 `loading → loaded | error`.
- `<img>`의 `onError` 발생 → 즉시 `error`.
- 마운트 시 `setTimeout(COVER_TIMEOUT_MS = 10000)` 설정. `loaded`/`error` 확정 전에 타이머가 만료되면 `error`로 전환.
- `loaded`/`error` 확정 또는 언마운트 시 타이머 정리(`clearTimeout`), 확정 후 상태 변경 금지(늦게 온 `onLoad`가 실패 상태를 덮지 않도록 가드).

**Rationale**: 네이티브 오류(끊김/404 등)는 즉시, "느리기만 한" 무응답은 상한 타임아웃으로 처리해 무한 스켈레톤을 방지(SC-005). 10초는 느린 네트워크 관용과 테스트 가능성의 균형(Q1에서 사용자 승인).

**Testing note(헌법 II)**: `vi.useFakeTimers()`로 10초 경과를 실시간 없이 검증. `fireEvent.load`/`fireEvent.error(img)`로 네이티브 이벤트를 실제 발생시켜 목 없이 검증.

---

## D4. 커버 배치 위치

**Decision**: `app/(app)/posts/[id]/page.tsx`에서 **브레드크럼(`.detail-breadcrumb`)과 제목 입력창(`.detail-title`) 사이**에 커버를 삽입한다. 순서: 툴바(뒤로/즐겨찾기/삭제) → **커버** → 제목 → 메타 → 본문 → 글자수 칩.

**Rationale**: 사용자 요구 "제목 입력창 **위에**"를 문자 그대로 만족하는 가장 단순하고 모호하지 않은 배치. 브레드크럼은 액션 툴바 성격이라 최상단에 두는 편이 자연스럽고, 커버가 제목 바로 위에 놓여 노션식 "커버→제목" 흐름과도 일치. `.detail-page`(760px 컬럼) 안의 라운드 배너로 렌더되어 앱의 정돈된 카드 미감과 일관.

**Alternatives considered**: *브레드크럼보다 위(최상단)*: 액션 툴바가 커버 아래로 밀려 어색. 기각.

---

## D5. 디자인 토큰 · 스켈레톤 · 폴백 (헌법 III)

기존 토큰 재사용을 원칙으로 하고, 문서에 없는 신규 결정만 아래로 확정한다. **이 결정들은 `globals.css` 구현과 같은 커밋에서 `DESIGN.md`에 반영한다.**

**커버 박스 `.detail-cover`** (신규):
- 크기: `width: 100%`, 높이 `200px`(고정, 배너). `.detail-content min-height:340px`처럼 고정값 패턴 재사용.
- 모양: `border-radius: var(--radius-lg)`(12px, 카드류와 동일), `overflow: hidden`, `background: var(--surface-subtle)`(로딩/폴백 베이스), `box-shadow: var(--shadow-xs)`(post-card와 동일한 미세 그림자).
- 간격: `margin: 0 0 20px`(제목과 분리; 브레드크럼 `margin-bottom:22px` 이웃과 조화).
- 접근성: 장식 요소이므로 컨테이너에 `aria-hidden="true"`(랜덤 고양이는 정보 전달 없음).

**이미지 `.detail-cover__img`** (신규): `width:100%; height:100%; object-fit: cover; display:block`. 로드 시 `opacity` 페이드인(`transition: opacity var(--dur-normal) var(--ease-standard)`) — `--dur-normal`(180ms) 최초 실사용.

**스켈레톤 `.detail-cover__skeleton`** (신규): `position:absolute; inset:0`. 그래파이트 톤 shimmer —
```css
background: linear-gradient(100deg,
  var(--surface-subtle) 30%, var(--surface-hover) 50%, var(--surface-subtle) 70%);
background-size: 200% 100%;
animation: mnShimmer 1.4s ease-in-out infinite;
```
신규 키프레임 `@keyframes mnShimmer { from { background-position: 200% 0 } to { background-position: -200% 0 } }`. **스피너 아님**(FR-003).

**Reduced-motion 가드**(신규, 접근성 — Outstanding 항목 해소): `@media (prefers-reduced-motion: reduce) { .detail-cover__skeleton { animation: none } }` — 무한 애니메이션을 정적 배경으로 대체. `DESIGN.md` §7이 현재 reduced-motion 미구현임을 명시하므로, 본 기능이 **스켈레톤에 한정한 첫 reduced-motion 대응**임을 문서에 기록.

**중립 폴백 `.detail-cover__fallback`** (신규, FR-006): `position:absolute; inset:0; display:flex; align-items:center; justify-content:center; background: var(--surface-subtle)`. 중앙에 muted 아이콘 `<ImageOff size={28} />`, color `var(--text-placeholder)`(#b0b3b8). 깨진 이미지 아이콘 없이 정돈된 빈 상태로 공간 보존.

**Rationale**: 색·라운드·그림자·모션 지속시간/easing 모두 기존 토큰에서 취해 `ui:bowl`의 "조용한 그래파이트" 톤 유지(헌법 III, DESIGN §0 원칙 2·5). shimmer는 스피너를 금지한 요구(FR-003)를 만족하는 정적 로딩 표현.

---

## 미해결/이월 (Deferred)

- **커버 높이 반응형 세부**(모바일 뷰포트 축소)는 200px 고정으로 시작하고, 필요 시 후속에서 `aspect-ratio`로 전환 검토(현재 범위 밖).
- cataas 레이트리밋 대응(빠른 연속 이동): 마운트당 1회 요청으로 실사용 부담이 낮아 별도 처리 없음(실패 시 D3 폴백으로 흡수).
