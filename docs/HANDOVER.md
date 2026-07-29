# 세션 인수인계 (2026-07-29 마감 — E2E 스모크 Task 1~7 완료, Task 8~9 남음)

## 한 줄 요약

E2E 스모크를 서브에이전트 주도로 **Task 1~7까지 완료**했다. 하니스 라우트와 2겹 프로덕션
차단, 번들 유출 검증, Playwright 기반, 스모크 4건이 `006-e2e-smoke`에 올라가 있고 **origin에
푸시·CI 통과**했다. **다음 작업은 Task 8~9**(표 플로팅 툴바 스모크 + CI 편입), 그다음 DoD
확인 → main 머지 논의다. 계획서에 전문(코드 포함)이 있다.

## 브랜치 상태

| 브랜치 | 커밋 | 비고 |
|---|---|---|
| `main` = `origin/main` | `840b788` | 배포본. 이번 작업 미반영 |
| `006-e2e-smoke` = `origin/006-e2e-smoke` | **`1b13f14`** | Task 1~7. CI success |

로컬과 origin이 같은 지점이다. 워킹트리 clean.

### CI 상태 — 초록 (혼동 주의)

마감 커밋 `4cfc043`의 CI 실행 **`30444831850` = success**(1m13s). 잡 `verify`의 모든 스텝
(Checkout · Setup Node · Install · Test(vitest) · Build)이 success다. 이 브랜치의 실행 2건
(`30442819621`, `30444831850`) 모두 초록이다.

> **`gh run list`에 보이는 failure 3건은 이 작업과 무관하다.** 전부 워크플로 이름이
> **`Deploy to GitHub Pages`**이고 날짜가 2026-07-23·07-27이다. static export를 제거한 뒤
> `cp out/index.html`에서 상시 실패하던 GH Pages 잔재이며, `09624d6`에서 **워크플로 파일을
> 삭제해 이미 해소**했다(배포는 Vercel Git 통합이 담당). 목록에 과거 기록만 남아 있는 것이니
> 이걸 보고 "CI 실패"로 판단하지 말 것. 워크플로 이름이 `CI`인 것만 현재 게이트다.

### `006-e2e-smoke` 커밋 (오래된 순)

| 커밋 | 내용 | Task |
|---|---|---|
| `3507e17` | E2E 스모크 설계 스펙 | — |
| `b268941` | 구현 계획(태스크 9개) | — |
| `539ef12` | 하니스 라우트 + 빌드/런타임 2겹 차단 | 1 |
| `625fac7` | 번들 유출 검증 스크립트 | 2 |
| `f301ca9` | Playwright 기반 + pageerror 전역 그물 | 3 |
| `78113a5` | 하니스 스펙 리뷰 반영(누락 형제 단언) | 3 수정 |
| `c46b0b1` | 스모크 #1 표 격자 | 4 |
| `62f75e1` | 스모크 #2 툴바 + 스펙 역기입 + BACKLOG | 5 |
| `84095d5` | §5.3 표 라벨 모순 해소 | 5 수정 |
| `6763b05` | 중간 인수인계(Task 1~5) | — |
| `77629d6` | 스모크 #3 핸들 메뉴 | 6 |
| `ccb56bb` | 스모크 #4 색 팝오버 | 7 |
| `1b13f14` | floating-ui 오기 정정 + 색 셀렉터 견고화 | 7 수정 |

**검증 기준선: 65파일 / 523 테스트 + E2E 6건 + 빌드.** 마감 시점 세 게이트 모두 통과 실측.

E2E 6건: 하니스 자식 7종 · 에디터 입력 · 표 격자 · 툴바 두 줄 · 핸들 메뉴 · 색 팝오버.

## 다음 작업 — Task 8~9 → DoD → 머지

계획서 `docs/superpowers/plans/2026-07-29-e2e-smoke.md`에 **전문(코드 포함)**이 있다.
서브에이전트 주도로 이어가려면 원장(`.superpowers/sdd/2026-07-29-e2e-smoke/progress.md`,
git-ignored)이 Task 7까지 complete로 남아 있으니 **Task 8부터 재개**하면 된다.

| # | 내용 | 산출물 |
|---|---|---|
| 8 | 스모크 #5 표 플로팅 툴바 — 셀 클릭 → `.tbl-toolbar` 등장 → 뷰포트 내 → "행 아래 삽입" 시 `tr` +1. 전체 **7 passed** 확인 | `e2e/table-toolbar.spec.ts` |
| 9 | CI 편입(`verify:harness` + `test:e2e` + 브라우저 캐시 + 실패 시 리포트 업로드) + **DoD 5항목** | `.github/workflows/ci.yml` |

그다음: 최종 whole-branch 리뷰(이월 Minor triage 포함) → **main FF 머지 → 배포**.
그 이후 후보는 상단바 건, 포털화 논의(BACKLOG).

### DoD 5항목 (스펙 §9)

1. `npm test` — 523 통과 ✅(현재 달성)
2. `npm run verify:harness` — 마커 0건 + 라우트 부재 ✅(Task 2에서 확인, CI 편입은 Task 9)
3. `npm run test:e2e` — 전체 통과, pageerror 0. **테스트 #2 임계값 실측·역기입 완료** ✅
4. 위 3종이 **CI에서도** 초록 — ⏳ Task 9
5. 프로덕션 `https://ium.ai.kr/e2e-harness/editor` **404** 실측 — ⏳ 머지·배포 후

### 새 스펙 실행 시 주의 (Task 8 공통)

- 스펙은 반드시 `e2e/fixtures.ts`에서 `test`/`expect`/`openHarness`를 임포트한다.
  `@playwright/test`에서 `test`를 직접 임포트하면 **자동 pageerror 그물이 조용히 해제된다.**
- 텍스트 선택 시 `FormatToolbar`(`.fmt-bar`)가 뜬다. 상단 툴바 버튼은 `.top-toolbar`로
  스코프해야 라벨 충돌(`링크`)을 피한다.
- 셀렉터·단언값은 **소스에서 확인한 것만** 쓴다. 추측한 근거가 두 번 걸렸다(아래 §정정).

## 제품 발견 — 상단 툴바가 이미 두 줄이다 (E2E의 첫 수확)

Task 5 실측에서 **계획이 전제한 "한 줄"이 사실이 아님**이 드러났다.

- `.top-toolbar`에 `flex-wrap: wrap`(`globals.css:1100`), `.detail-page`는 `max-width: 760px`
  + 좌우 패딩 28px → 내부 704px(`globals.css:472`). **실제 글 상세도 같은 클래스**
  (`PostDetailClient.tsx:51`).
- 버튼 17개가 704px에 안 들어가 **실행취소·다시실행 2개가 둘째 줄로 내려간다.** 뷰포트가
  아니라 고정 컬럼이 원인이라 항상 재현. **지금 프로덕션 상태다.**
- jsdom은 flex를 계산하지 않아 **기존 520개 테스트 중 무엇도 이걸 볼 수 없었다.**

**사용자 결정:** 제품 레이아웃은 이번 범위에서 미수정. 오늘의 2줄을 기준선으로 삼고 테스트를
정직하게 개명(`"상단 툴바가 두 줄을 넘지 않는다"`), 줄바꿈 자체는 BACKLOG에 UX 개선 후보로
분리(근본 해결 = 버튼 그룹화 또는 ⋯ 더보기 오버플로 메뉴, gap·padding 축소는 임시 완화책).

실측·임계: 버튼 17 / y 스프레드 35px / 버튼 높이 30px / 툴바 높이 79px →
`MAX_Y_SPREAD = 45`, `MAX_TOOLBAR_HEIGHT = 110`. 2026-07-23식 전면 붕괴는 스프레드 ~480px·
높이 ~500px라 확실히 잡힌다. 임계 여유는 리뷰어가 독립 검증했다 — `.icon-btn`이
`width/height: 30px; flex: none`이고 gap·padding도 고정 px라 macOS↔Linux 폰트 메트릭에
흔들리지 않는 결정적 박스 계산이다.

## 계획·스펙 정정 (사후 발견 3건)

세 건 모두 **내가 계획서에 확인 없이 적은 것**이 실행 중 드러난 경우다. Task 8 이후에도
같은 유형을 경계할 것.

1. **`vitest.config.ts` → 실제는 `vitest.config.mts`.** 구현자가 확인 후 `.mts`에 적용,
   리뷰어가 `.ts` 변종 부재를 대조 확인. 계획 문서는 사후 수정하지 않았다.
2. **하니스 스펙이 "자식 7종"을 표방하면서 #3·#7을 검증하지 않았다**(Task 3). 직계 자식
   셀렉터로 보강.
3. **색 팝오버는 floating-ui가 아니라 정적 CSS 배치다**(Task 7). `.top-toolbar__popover`는
   `globals.css:1123`에서 `position: absolute; top: calc(100% + 6px)`이고, `@floating-ui/dom`은
   `@tiptap/extension-bubble-menu`(TableToolbar가 사용)의 전이 의존일 뿐 앱 코드에서 직접
   import되지 않는다. 스펙 §5.3 4행을 정정했고, 5행("동일")은 **실제로 floating-ui를 타므로**
   각자 근거를 분리 기재했다. → **Task 8(표 툴바)은 진짜 floating-ui 경로다.**

## 이월 Minor (최종 whole-branch 리뷰에서 triage)

- **`globals.css` 줄번호 인용 오차** — `docs/BACKLOG.md`와 스펙 §5.3이 `flex-wrap: wrap`을
  `globals.css:1099`로 인용하나 **실제는 1100행**(1099는 선택자). 테스트 주석은 범위로 올바름.
- **Task 1** 게이트 테스트 2건(`""` / `"true"`)이 표면상 중복 — 실제로는 다른 실패 모드라 유지.
- **Task 1** DESIGN.md 기록 없음 — 하니스는 테스트 전용 인프라(프로덕션 번들 제외)이고 이미
  문서화된 `.detail-page` 구조의 축자 재사용이라 새 디자인 결정이 없다는 판단.
- **Task 2** `verify-harness-excluded.mjs`의 `findMarker`가 `.next/static` 부재 시 raw ENOENT
  스택을 낸다(오탐 아님 — Node 기본 핸들러가 exit 1이라 CI는 정상 실패).
- **Task 4** 보고서의 음성 대조 일탈 사유 기술이 부정확(산출물엔 영향 없음).
- **Task 4** `toHaveClass(/\btbl\b/)`의 `\b`가 하이픈에서도 매칭 — 현 코드베이스에선 무해.
- **Task 6** 복제 전 `toHaveCount(1)` 사전 단언이 없어 1→2 전이가 암묵적. 현재는 비공허
  (리뷰어가 프로브로 실증)이나 하니스 초기 문서가 바뀌면 조용히 무력해질 수 있음.
- **Task 7** `.clr-pop`의 140ms `mnPop` 애니메이션 때문에 `boundingBox()`가 중간 프레임을
  잡을 수 있음. 실제 오프셋 40px+라 5px 변위로 `y >= 0`이 뒤집히지 않아 무해.

## 검증 규칙 (누적)

> **1. 모든 팝오버·메뉴·드롭다운은 "열기 → 항목 클릭 → 닫기"까지 실제로 조작해 확인한다.**
> 렌더 확인 ≠ 동작 확인. (2026-07-23)

> **2. 에디터 시각 회귀는 직렬화(`getHTML()`)가 아니라 렌더된 DOM(`editor.view.dom`)으로
> 검증한다.** nodeView를 타는 노드는 두 경로의 출력이 다르다. (2026-07-27, DESIGN.md §2.15)

## 이월 / BACKLOG (`docs/BACKLOG.md`)

- **상단 툴바 한 줄 정리 (UX 개선 후보)** — 위 §제품 발견 참조.
- **DragHandle base 확장 등록 근본 수정** · **globals.css 중괄호 균형 검증 관행**
- **에디터 후속 개선 4건** · **ium.ai.kr 포털화**(장기) · 셀 병합·@멘션·레이아웃·버전이력
- Security Advisor 경고 3건

## 미해결 — 재현 안 된 이상 1건 (계속 이월)

`0c61008` 직후 전체 실행에서 원인 미상 1건이 실패했고 이름을 확보하지 못했다. 그 뒤 13회
연속, 오늘 여러 차례 추가 실행에서도 재현되지 않았다. 다시 보이면 이름부터 확보할 것.

## 이전 세션 정리 기록 (2026-07-29 오전)

- 다른 폴더(`18-notion-worktree`, 원격 `mini-notion-next.git`)의 옛 세션 4개를 닫았다. 그
  세션들의 작업(Supabase 마이그레이션·다크모드·자기소개 컬럼)은 **이미 20에서 구현·배포된
  것**이라 재개하면 중복 구현이 됐을 상황.
- **20의 `.git/worktrees/`에 wt1~4 메타데이터가 잘못 남아 있어 제거**했다(18을 복사해 20을
  만들며 딸려온 잔재). 18은 사전/사후 스냅샷 diff로 무변화 확인.
- 브랜치 7개 삭제: `005-ci-test-gate`·`worktree-wt1~4`·`001-char-counter`(전부 main 조상),
  `002-post-cover-image`·`003-deploy-github-pages`(**미병합**, `-D`).
  - `002`의 고유 커밋 `dcf9555`(/duck 연습 페이지)·`308f470`(랜덤 고양이 커버)이 사라졌다.
    커버 작업이 현 코드에 없는 게 의도인지 한 번 확인해 볼 것.
