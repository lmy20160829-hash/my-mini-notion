# 캘린더 (독립 일정 관리) 설계 — 2026-07-21

노션 Calendar 벤치마킹. 월간 캘린더에서 일정을 추가/수정/삭제한다.
2026-07-21 대화에서 합의된 설계를 문서화한 것.

## 범위

- 포함: 월 뷰, 일정 CRUD 모달, 사이드바 "캘린더" 활성화.
- 제외: 주/일 뷰, 여러 날 일정의 연속 바 렌더링(걸친 날짜마다 칩 표시로 단순화),
  반복 일정, 알림.

## DB (이미 적용됨 — 마이그레이션 금지)

`public.events` 테이블이 **메인 세션에서 이미 적용·검증되었다.** 에이전트는
마이그레이션을 실행하지 않는다. 구조(참고용):

- `id uuid pk default gen_random_uuid()`
- `user_id uuid not null default auth.uid() references auth.users on delete cascade`
- `title text not null` (1~200자 check)
- `description text null`
- `start_at timestamptz not null`, `end_at timestamptz null` (`end_at >= start_at` check)
- `all_day boolean not null default false`
- `color text not null default 'blue'` — check: `blue|green|amber|red|gray`
- `created_at`/`updated_at timestamptz default now()` (updated_at은 트리거 자동 갱신)
- 인덱스 `(user_id, start_at)`, RLS 4정책 `events_*_own` (`auth.uid() = user_id`)

## 데이터 계층 (`lib/events.ts` — `lib/posts.ts` 대칭)

- `EventRow` 타입 + `CalendarEvent` 클라이언트 타입(`id: string`, epoch ms 시각).
- `fetchMyEvents(fromIso, toIso)`: 표시 월 범위로 조회(`start_at` 기준, RLS가 소유 격리).
- `insertEvent(payload)`: `.select().single()` 반환 행 매핑. `user_id`는 DB default(auth.uid()).
- `updateEvent(id, patch)` / `deleteEvent(id)`: **A2 계약 준수** — `.select("id")` +
  0행이면 throw ("일정을 찾지 못해 저장/삭제하지 못했습니다.").

## 달력 유틸 (`lib/calendar.ts` — 순수 함수, 테스트 대상)

- `monthGrid(year, month)`: 일요일 시작 6주(42칸) 그리드. 각 칸 `{ date, inMonth }`.
- `eventsByDay(events, gridStart, gridEnd)`: `start_at`~`end_at`(없으면 start만)이
  걸치는 **모든 날짜**에 이벤트를 매핑한 `Map<dateKey, CalendarEvent[]>`.
- `dateKey(date)`: 로컬 기준 `YYYY-MM-DD`.

## 화면 (`app/(app)/calendar/page.tsx` + `components/calendar/`)

- `CalendarView.tsx`: 헤더("2026년 7월", 이전/다음 `IconButton`, "오늘" `Button` secondary),
  요일 행(일~토), 6×7 그리드. 오늘 칸 강조(`--accent` 계열), 다른 달 날짜는
  `--text-placeholder`. 일정 칩: 색상 점 + 제목 말줄임, 셀당 최대 3개 + "+N" 표시.
- `EventModal.tsx`: dim 오버레이 + 카드. 필드 — 제목(필수), 시작/종료(`datetime-local`),
  하루 종일 체크박스, 색상 5색 선택, 설명(`.field-textarea` 재사용). 추가/수정 겸용,
  수정 모드에는 삭제 버튼(`.detail-delete-btn` 관행). ESC·오버레이 클릭으로 닫기.
- 상호작용: 날짜 셀 클릭 → 추가 모달(해당 날짜 프리필), 칩 클릭 → 수정 모달.
  저장/삭제 성공 시 로컬 상태 즉시 갱신, 실패는 `window.alert`(기존 notify 관행).
- 색상 매핑(디자인 토큰): blue `--accent`, green `--status-success`,
  amber `--status-warning`, red `--status-danger`, gray `--text-muted`.
- 모달·캘린더 CSS는 **globals.css 파일 끝에** `.calendar-*`/`.modal-*`로 추가
  (기존 토큰만 사용, 줄번호 밀림 최소화 — design-md-sync 절차 4).

## 셸 (`components/AppShell.tsx`)

- 사이드바 "캘린더" `disabled` 제거(펼침·레일), `/calendar` 라우팅 + 활성 표시.
- **design-md-sync 절차 5 필수**: `__tests__/AppShell.pendingItems.test.tsx` 목록에서
  캘린더 제거, DESIGN.md §2.5/§3.3 갱신.

## 테스트 (TDD)

- `lib/calendar.ts`: 그리드 42칸/시작 요일/월 경계, 여러 날 매핑, dateKey.
- `lib/events.ts`: 행 매핑, 각 함수의 성공·오류·**0행 throw**.
- 화면: 월 이동, 셀 클릭 → 모달, 저장 → 칩 표시(가능한 범위에서).

## DESIGN.md 반영

- §2.x 모달 컴포넌트 신설(용도/props/해부/상태별 스타일 — 기존 형식), §4.x 캘린더 화면,
  §5.x 일정 CRUD 동작, 색상 팔레트는 §1.1 토큰 참조로 서술. 목차 갱신 +
  줄번호 참조 재계산.
