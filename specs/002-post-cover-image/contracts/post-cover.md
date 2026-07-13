# Contract: Post Cover Image

이 기능이 노출하는 인터페이스 계약. 웹 애플리케이션이므로 (A) 내부 UI 컴포넌트 계약과 (B) 외부 이미지 API 소비 계약을 정의한다.

---

## A. UI Component Contract — `PostCover`

**위치**: `components/PostCover.tsx` (`"use client"`)

**Props**

| prop | 타입 | 필수 | 설명 |
|------|------|------|------|
| `postId` | `string` | ✅ | 커버를 표시할 글 id. 캐시버스트 토큰 생성/컴포넌트 아이덴티티에 사용. 부모는 `key={post.id}`로도 렌더해 글 변경 시 remount를 보장한다. |

> props는 이것만. 커버는 표시 전용이라 콜백·설정 prop 없음(YAGNI, 헌법 V).

**소비처(부모) 계약** — `app/(app)/posts/[id]/page.tsx`:
- `.detail-breadcrumb`와 `<input class="detail-title">` **사이**에 `<PostCover key={post.id} postId={post.id} />`를 렌더한다(research D4).

**DOM/렌더 계약** (테스트가 의존하는 관찰 가능한 계약):

| 조건 | 관찰 가능한 결과 |
|------|------------------|
| 초기 마운트 | 커버 박스 존재. 스켈레톤 노드(`[data-cover="skeleton"]`) 존재. **스피너 아님.** `<img>` 존재(로드 감지용). |
| `<img>`에 `load` 이벤트 | 이미지 노출(`[data-cover="image"]`), 스켈레톤 제거. |
| `<img>`에 `error` 이벤트 | 폴백 노출(`[data-cover="fallback"]`), 스켈레톤·이미지 제거. |
| 로드/오류 없이 `COVER_TIMEOUT_MS`(10000ms) 경과 | 폴백 노출, 스켈레톤 제거. |
| 상태 확정 이후 | 최종 상태 유지(늦은 `load`가 `error`를 덮지 않음). |
| 언마운트 | 타임아웃 타이머 정리(누수·경고 없음). |

> 상태 식별용 훅으로 `data-cover` 속성(`skeleton|image|fallback`)을 노출한다 — 테스트가 클래스/구현 세부가 아니라 안정적 계약에 결합하도록. (실제 속성명은 구현 시 확정하되 테스트와 동일하게 유지.)

**접근성 계약**: 커버 컨테이너는 `aria-hidden="true"`(장식). 이미지 `alt=""`. → 스크린리더는 커버를 건너뛰고 제목·본문에 집중.

**비침범 계약(FR-007)**: 커버는 제목/본문의 형제이며 포인터/키보드 이벤트를 가로채지 않는다. 어떤 상태에서도 제목 입력과 본문 textarea는 편집 가능해야 한다.

---

## B. External API Contract — cataas 랜덤 고양이

**Endpoint**: `GET https://cataas.com/cat/cute`

**소비 방식**: 브라우저 `<img src>` 직접 로드(별도 `fetch`/JSON 파싱 없음). 캐시버스트 쿼리 부착: `https://cataas.com/cat/cute?_cb=<token>`.

**요청**
- 메서드: GET (이미지 바이트). 인증·헤더 없음(공개 오픈 API).
- 태그 `cute`에 해당하는 랜덤 고양이 이미지를 반환(요청마다 상이).

**응답 처리 계약**

| 응답 | 처리 |
|------|------|
| 성공(이미지 로드 완료) | `<img>` `load` → `loaded` 상태. |
| 오류(4xx/5xx/네트워크 끊김/디코드 실패) | `<img>` `error` → `error` 상태(중립 폴백). |
| 무응답/지연(오류 이벤트 없이 장시간) | 10초 타임아웃 → `error` 상태. |

**의존성·실패 격리**: 외부 서비스 가용성에 의존하나, 모든 실패는 위 표로 흡수되어 **커버 영역 안에서만** 처리된다. 제목·본문 편집 및 페이지의 다른 기능에는 영향 없음(FR-007).

**설정 계약**: `next.config.ts`의 `images.remotePatterns` **불필요**(일반 `<img>` 사용, research D1). 외부 도메인 추가 설정 없음.
