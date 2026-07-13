# Quickstart & Validation: Post Cover Image (Random Cat)

이 기능이 끝까지 동작함을 증명하는 검증 가이드. 상세 계약은 [contracts/post-cover.md](./contracts/post-cover.md), 상태 모델은 [data-model.md](./data-model.md), 결정 근거는 [research.md](./research.md) 참조.

## 사전 준비

- Node/의존성 설치 완료(기존 프로젝트). 신규 의존성·설정 변경 없음.
- 테스트: Vitest 4 + RTL + jsdom (`vitest.config.mts`).
- 헌법 I(TDD): 각 시나리오는 **실패 테스트 작성 → 실패 확인 → 최소 구현 → 통과 확인** 순으로 진행한다.

## 명령어

```bash
npm test                              # 전체 1회 실행 (RED/GREEN 확인)
npm test -- components/PostCover.test.tsx        # 유닛만
npm test -- __tests__/post-detail-cover.test.tsx # 통합만
npm run test:watch                    # 워치 모드
npm run dev                           # 수동 확인용 개발 서버
```

## 자동 검증 시나리오 (TDD 매핑)

각 시나리오는 관찰 가능한 계약(contracts §A의 `data-cover` 훅, `fireEvent`, fake timers)에 결합한다. 목 동작을 단언하지 않는다(헌법 II).

| # | 시나리오 | 검증 방법 | 기대 결과 | 추적 |
|---|----------|-----------|-----------|------|
| V1 | 초기 마운트는 스켈레톤(스피너 아님) | `render(<PostCover postId="p1"/>)` | `[data-cover="skeleton"]` 존재, 스피너 없음, 커버 박스 존재 | US2, FR-003, SC-002 |
| V2 | 이미지 로드 성공 | 커버 `<img>`에 `fireEvent.load` | `[data-cover="image"]` 노출, 스켈레톤 제거 | US1, FR-004 |
| V3 | 이미지 로드 오류 → 중립 폴백 | 커버 `<img>`에 `fireEvent.error` | `[data-cover="fallback"]` 노출, 깨진 이미지 아이콘 없음, 커버 박스 유지 | US3, FR-006 |
| V4 | 오류 없이 10초 → 타임아웃 실패 | `vi.useFakeTimers()` 후 `vi.advanceTimersByTime(10000)` | `[data-cover="fallback"]` 노출, 스켈레톤 제거 | US3, FR-009, SC-005 |
| V5 | 상태 확정 후 늦은 이벤트 무시 | 타임아웃(error) 뒤 `fireEvent.load` | 여전히 `[data-cover="fallback"]`(덮이지 않음) | data-model 불변식 |
| V6 | 언마운트 시 타이머 정리 | `unmount()` 후 타이머 진행 | act 경고·setState 경고 없음 | 헌법 완료 게이트(출력 무결) |
| V7 | 커버가 제목 입력창 **위**에 위치 | 상세 페이지 렌더 후 DOM 순서 확인 | 커버 노드가 `.detail-title`보다 앞(위)에 존재 | US1(위치), FR-001 |
| V8 | 커버 실패해도 편집 무영향 | 커버 `error` 상태에서 제목/본문 입력 | `.detail-title`·`.detail-content` 값 변경 정상 | US3, FR-007, SC-004 |

> V7·V8은 통합 테스트(`post-detail-cover.test.tsx`)로, V1–V6은 유닛(`PostCover.test.tsx`)으로 다룬다. 상세 페이지 통합은 기존 US2 통합 테스트(T011/T012, char-counter) 패턴을 따른다.

## 수동 검증 (선택)

`npm run dev` → 아무 글 상세(`/posts/<id>`) 진입:

1. 제목 입력창 **위**에 커버 배너가 보이고, 잠깐 스켈레톤(shimmer) 후 고양이 사진으로 바뀐다. (US1·US2)
2. 네트워크 스로틀/오프라인으로 재진입 → 스피너 없이 스켈레톤 표시, 약 10초 내 또는 즉시 중립 폴백(`ImageOff`)으로 전환되고 레이아웃이 튀지 않는다. (US2·US3)
3. 폴백 상태에서도 제목·본문 편집과 자동 저장이 정상 동작한다. (FR-007)
4. `prefers-reduced-motion` 활성 환경에서 스켈레톤 shimmer가 정적 배경으로 표시된다. (접근성)

## 완료 게이트 (헌법)

- [ ] V1–V8 전부 GREEN, `npm test` 전체 통과, 에러·경고 없음(출력 무결).
- [ ] `DESIGN.md`가 `globals.css` 변경과 **같은 커밋**에서 커버/스켈레톤/폴백·`mnShimmer`·reduced-motion 결정을 반영(헌법 III).
- [ ] 신규 함수/컴포넌트에 테스트 존재, 각 RED를 직접 목격.
