# 백로그

나중에 다룰 후보. 지금 당장 막고 있는 건 아니지만 근거와 맥락을 남겨 둔다.

> **진행 기록 (2026-07-23):** 기본 문서 작업 스프린트(컨플루언스 벤치마킹) **완료** — 표
> (균일 격자·헤더 행·셀 안 문단+목록·행열 삽입/삭제·리사이즈), 상단 고정 툴바(스타일
> 드롭다운·마크 4종·색 2종·정렬 3종·목록 3종·링크·이미지·표·undo/redo), 글자색·배경색
> (컨플루언스식 8+8 팔레트, `Color`/`Highlight`/`TextStyle`), 문단·제목 정렬(`TextAlign`)
> 전부 결선. `docToText`/`docToPreview`가 표를 셀=공백·행=줄바꿈으로 투영하는 특례를
> 포함해 dual-write(content + content_doc) 불변식이 표 문서에도 관통함을
> `__tests__/store.test.tsx`로 확인. 스펙: `docs/superpowers/specs/
> 2026-07-23-document-editing-sprint-overview.md`. 검증 기준선 **63파일/513 테스트 + 빌드**
> 통과(커밋 범위 `e847cb5`~`9accb12` + B3 마감 커밋). **실행 방식(정정):** Phase T(표)·
> Phase F(색·정렬)는 워크트리 병렬 진행을 계획했으나, 색·정렬·표가 추가하는 CSS가
> `globals.css` 파일 끝을 공유해 병렬 워크트리 머지 시 충돌 위험이 있다고 판단, 브랜치
> `004-supabase-google-login` 위에서 **순차 선형**으로 실행했다(워크트리·머지 커밋 없음 —
> `git log` 커밋 시각·`git worktree list` 실측으로 확인). 아래 4항목은 이번 스프린트에서
> 명시적으로 범위 제외했다(스펙 §비범위).

---

## 셀 병합/분할 (Tiptap mergeCells)

**상태:** 후보 (2026-07-23 기록, 문서 작업 스프린트에서 명시적으로 범위 제외)

이번 표(`lib/editor/table-nodes.ts`)는 **균일 격자**만 지원한다 — 행/열 삽입·삭제, 헤더 행
토글까지가 범위다. `@tiptap/extension-table`은 `mergeCells`/`splitCell` 커맨드와
`colspan`/`rowspan` attrs를 이미 제공하지만, 이번 스프린트는 셀 플로팅 툴바(§2.15)에
그 트리거를 얹지 않았다 — 컨플루언스 벤치마킹 범위를 "행/열 조작"으로 한정했기 때문(스펙
결정 사항). 착수한다면 `TableToolbar.tsx`의 `ACTIONS` 배열에 병합/분할 버튼을 추가하고,
`docToText`의 표 투영(셀=공백·행=줄바꿈, `lib/editor/doc.ts`)이 병합 셀에서도 셀 개수가
안 맞는 행을 안전하게 다루는지 별도 테스트가 필요하다.

---

## @멘션 (`@tiptap/extension-mention`)

**상태:** 후보 (2026-07-23 기록, 문서 작업 스프린트에서 명시적으로 범위 제외)

`@tiptap/extension-mention`은 이번 스프린트 의존성 실측(MIT 라이선스 확인) 대상에 포함되지
않았다 — **미설치**. 페이지 간 상호 참조(`@page-title`)를 만들려면 페이지 트리(`lib/tree.ts`,
`parent_id`)를 대상 목록으로 쓰는 자동완성 UI와, 참조 노드가 삭제된 페이지를 가리킬 때의
처리(깨진 링크 표시)까지 별도 spec → plan 사이클이 필요하다.

---

## 레이아웃 (다단 컬럼)

**상태:** 후보 (2026-07-23 기록, 문서 작업 스프린트에서 명시적으로 범위 제외)

컨플루언스의 "레이아웃" 매크로류(2단/3단 컬럼 배치)에 대응하는 기능이다. Tiptap 코어에는
대응 확장이 없어(커스텀 노드 직접 구현 필요) 이번 스프린트의 "기존 확장 조합" 범위를
벗어난다. `docToText`/`docToPreview` 투영 규칙도 다단 레이아웃을 어떻게 선형화할지
(표의 셀=공백·행=줄바꿈 같은 특례 설계가 필요) 새로 정해야 한다.

---

## 버전 이력 (문서 스냅샷/diff)

**상태:** 후보 (2026-07-23 기록, 문서 작업 스프린트에서 명시적으로 범위 제외)

`content_doc`(JSON) 변경 이력을 스냅샷으로 남기고 이전 버전으로 되돌리거나 diff를 보여주는
기능. 현재는 `page` 행이 최신 상태만 들고 있어(dual-write도 덮어쓰기), 이력을 남기려면 별도
테이블(예: `page_revision`)과 저장 정책(전체 스냅샷 vs 델타, 보관 기간)을 spec 단계에서
먼저 정해야 한다. 되돌리기 UI가 표·색·정렬 등 이번 스프린트가 늘린 노드 타입 전부를
안전하게 복원해야 하므로 착수 시점은 문서 편집 기능이 어느 정도 안정된 뒤가 낫다.

---

## 에디터 후속 개선 (2026-07-23 최종 whole-branch 리뷰)

**상태:** 후보 (문서 작업 스프린트 최종 리뷰가 잡은 Minor — merge-blocking 아님, follow-up).

이번 스프린트는 513 테스트/빌드 그린으로 머지됐고, 최종 리뷰에서 Critical/Important 0건이었다.
아래는 무해하지만 다듬을 여지가 있는 항목들이다.

- **표 셀 텍스트 선택 시 BubbleMenu 2개 겹침** — 표 셀 안에서 텍스트를 범위 선택하면
  `isActive("table")`이면서 `from!==to`라 플로팅 서식 툴바(`FormatToolbar`, `fmtShouldShow`)와
  표 툴바(`TableToolbar`, `shouldShow`)가 **둘 다 placement "top"으로 동시에** 뜬다(offset 6 vs 8).
  pluginKey가 달라(`fmtBar`/`tblBar`) 크래시는 없지만 시각적으로 겹친다. 해법: 표 안에서는
  FormatToolbar를 억제하거나 placement/offset을 분리.
- **링크 미니입력 로직 중복** — `components/editor/TopToolbar.tsx`와 `FormatToolbar.tsx`에
  링크 state/포커스/Enter적용·Esc닫기/`.fmt-link-input` 마크업이 verbatim 복제됐다. `useLinkInput`
  훅으로 추출하되, TopToolbar 쪽은 색 팝오버와 상호배제(`openLinkInput`이 색 팝오버를 닫음)를
  더 갖고 있어 순수 lift가 아니므로 그 좌표까지 훅이 받게 설계해야 한다.
- **색 팝오버 Escape/외부클릭 닫힘 보강** — `.top-toolbar__popover`의 `onKeyDown` Escape는
  내부 버튼이 `onMouseDown preventDefault`로 포커스를 안 받아 사실상 발화하지 않고, 문서 레벨
  outside-click 리스너도 없어 다른 툴바 버튼 클릭 시 팝오버가 남는다(닫는 경로는 스와치 클릭·색
  버튼 재클릭으로 존재). 아이콘 팝오버(§2.7)의 ESC·바깥클릭 관례에 맞추면 일관된다.
- **슬래시 메뉴의 셀 컨텍스트 미인지** — `isBlockAvailable`이 전역 `schema.nodes[type]`만
  검사해서, 표 셀 안에서 `/제목1`은 셀 content(문단/목록만)에 막혀 조용히 no-op, `/표`는 중첩
  대신 doc 형제로 떨어진다. 스키마 불변식은 지켜지고 데이터 손상은 없으므로(테스트로 잠금)
  문서화만 하거나, 셀 안에서 슬래시 항목을 content-aware로 거르는 개선 여지.

---

## 고아 첨부 정리 (post-attachments 버킷)

**상태:** 후보 — **착수 조건 충족됨** (첨부 기능 배포 완료, 2026-07-22).
참고: 영구 삭제 시 첨부 정리는 프로덕션에서 정상 동작이 실증됐다(테스트 첨부가
버킷에서 자동 제거됨 — 2026-07-22 실측 0개). 이 항목은 "정리 실패로 남는 고아"의
주기 청소만 담당한다.

글 영구 삭제 시 첨부 삭제가 실패하면(네트워크·Storage 오류) 파일이 버킷에 남는다 —
스펙(2026-07-21-editor-sprint-overview.md §2)은 이를 **고아 첨부**로 정의하고
`[attachments] 고아 첨부 발생:` 고정 포맷으로 로깅만 한 채 사용자 흐름을 막지 않는다.
주기 정리는 여기서 담당한다: Storage 목록과 `page` 행을 대조해 소유 글이 없는 폴더를
삭제하는 Edge Function(+ cron). 착수 조건: 첨부 기능(wt3) 머지 후.

---

## 데이터베이스 (테이블·보드 뷰) — **다음 스프린트 1순위**

**상태:** 확정 후보 (2026-07-21 기록, 에디터 고도화 스프린트에서 명시적으로 범위 제외)

노션의 데이터베이스(인라인 테이블, 보드/칸반 뷰, 속성 시스템)는 에디터 고도화(9개
기능: 플로팅 툴바·슬래시 메뉴·드래그 핸들·블록 타입·페이지 중첩·이미지·이모지
아이콘·첨부 업로드·템플릿)가 끝난 뒤 착수한다. 블록 문서 모델(content_doc)과 페이지
중첩(parent_id)이 선행 인프라라서 순서를 바꿀 수 없다. 착수 시 별도
spec → plan → 구현 사이클로 진행할 것.

> **각주(2026-07-23 문서 작업 스프린트에서 재확인):** 이 항목의 "테이블/보드 뷰"는
> 속성 시스템·구조화 데이터를 가진 노션식 데이터베이스를 가리킨다. 2026-07-23
> 스프린트가 만든 Tiptap 문서 내 표(`lib/editor/table-nodes.ts`, 균일 격자, 문서 안
> 블록 하나일 뿐 속성·뷰 없음)와는 **별개 기능**이며 서로 대체하지 않는다. 혼동 방지용
> 각주 — 근거: `docs/superpowers/specs/2026-07-23-document-editing-sprint-overview.md`
> §0 비범위.

---

## 정적 배포에서 SPA 라우팅 제대로 하기 — 글 상세의 동적 세그먼트 제거

**상태:** 후보 (2026-07-20 기록)

**배경**

`output: "export"`는 동적 라우트로 들어오는 모든 param이 `generateStaticParams()`에
열거돼 있을 것을 요구한다. 이 앱의 글 ID는 런타임 데이터(Supabase `page` 행)라 빌드
시점에 알 수 없어서 `app/(app)/posts/[id]/page.tsx`가 `placeholder` 하나만 열거한다.

그 결과 `/posts/1/` 직접 접속이 `next dev`에서 500으로 거부됐다. 지금은 **A안**으로
막아 뒀다 — `next.config.ts`에서 export를 프로덕션 빌드에서만 켠다(`__tests__/nextConfig.staticExport.test.ts`).

**A안이 남긴 것**

- dev: 딥링크·새로고침 정상(200).
- 정적 배포: `/posts/1/`에 해당하는 파일이 없어 여전히 `404.html` 폴백으로 렌더된다
  (`.github/workflows/deploy.yml`의 `cp out/index.html out/404.html`).
  화면은 정상이지만 **HTTP 상태가 404**다 — SEO·모니터링 관점에서는 부정확하다.
- dev가 export 제약을 검증하지 않는다. export 비호환 코드는 CI의 `next build`가 잡는다.

**B안 (이 백로그 항목)**

동적 세그먼트를 없앤다. `/posts/[id]` → 쿼리 파라미터(`/posts?id=1`) 또는 그에 준하는
클라이언트 전용 라우팅.

- 얻는 것: `generateStaticParams` 자체가 불필요. dev와 정적 배포가 **완전히 동일하게**
  동작하고, 딥링크가 진짜 200을 받는다. `404.html` 폴백 트릭도 이 라우트에는 불필요해진다.
- 비용: `useParams()` → `useSearchParams()`(App Router에서는 Suspense 경계 필요),
  `router.push("/posts/" + id)` 호출부 전부 수정, 관련 테스트 수정. URL 모양이 덜 예쁘다.

**언제 하나**

정적 호스팅에서의 SPA 라우팅을 주제로 다룰 때. 교재로서는 "왜 정적 export에서 동적
라우트가 곤란한가"를 보여주기 좋은 소재다.

**관련 파일**

- `next.config.ts` (A안 적용 지점)
- `app/(app)/posts/[id]/page.tsx` (`generateStaticParams`)
- `app/(app)/posts/[id]/PostDetailClient.tsx` (`useParams`)
- `.github/workflows/deploy.yml` (404.html 폴백)
- `__tests__/nextConfig.staticExport.test.ts` (A안 회귀 방지)

---

## 셸의 미구현 항목 8종 실제 구현

**상태:** 후보 (2026-07-20 기록)

**배경**

레퍼런스 디자인(`03-reference-design.png`)의 셸 모양을 맞추려고 넣은 장식 항목들이다.
PRD의 MVP 범위는 업무 페이지 / 글 상세 / 마이 페이지 셋뿐이라 동작이 없다.

`onClick`만 빼고 겉모습은 눌리는 버튼 그대로였던 탓에 **사용자가 두 번 연속 고장으로
신고했다**. 그래서 2026-07-20에 8종 전부 `aria-disabled` + 툴팁 "(준비 중)"으로
비활성 표시했다(`DESIGN.md` §2.2/§2.5/§3.2/§3.3/§7, `__tests__/AppShell.pendingItems.test.tsx`).
아래는 "실제로 만든다면" 항목들이다.

> **진행 기록 (2026-07-21):** 휴지통(소프트 삭제·복원·영구 삭제, `/trash`)·캘린더(독립
> 일정 관리, `/calendar`)·사이드바 검색 필터링이 병렬 워크트리로 구현·머지되었다.
> 스펙: `docs/superpowers/specs/2026-07-21-{trash,calendar,search}-design.md`.
> 남은 미구현 셸 항목은 상단바 5종 + "할 일" 1종이다.

### 휴지통 — 소프트 삭제 (가장 현실적, 우선순위 높음)

현재 `deletePost`는 `page` 행을 **하드 삭제**한다(`lib/posts.ts` `deletePostById`).
휴지통을 만들려면 삭제 의미 자체를 바꿔야 한다.

- 스키마: `page`에 `deleted_at timestamptz null` 추가.
- 삭제: `delete` → `update({ deleted_at: now() })`. 복원은 `deleted_at = null`.
- 조회: `fetchMyPosts`에 `.is("deleted_at", null)` 필터. 휴지통 화면은 그 반대.
- RLS: 기존 `page_update_own`으로 커버되지만, "영구 삭제"를 붙이면 delete 정책도 확인.
- 주의: **A2와 얽힌다** — RLS가 거부한 UPDATE는 에러가 아니라 0행이라, `.select()`로
  갱신 행을 확인하지 않으면 "휴지통으로 옮김"이 거짓말이 된다. A2를 먼저 고치는 편이 낫다.
- 부수 결정: 자동 영구 삭제 기한(예: 30일)을 둘지. 두면 정리 작업(cron/Edge Function)이 필요하다.

### 검색

사이드바에 이미 "글 검색" 입력이 있다(`.input-sm`). 상단바 검색 아이콘까지 만들면
**같은 기능의 진입점이 둘**이 된다. 만든다면 상단바 것은 전역 팔레트(Cmd+K)로 차별화하거나,
아예 제거하고 사이드바 검색 하나로 통일하는 쪽이 낫다. 참고로 사이드바 검색도 현재는
입력만 있고 필터링 로직이 없다 — 그것부터가 선행 과제다.

### 캘린더 · 할 일

각각 새 테이블 + 새 화면이 필요한 독립 기능이다. PRD "이후 버전" 후보에 "할 일 체크박스,
마감일 등 업무 특화 기능"으로 이미 올라 있다(`02-prd.md`). 착수한다면 기능당 별도
spec → plan → tasks 사이클로.

### 알림 · 도움말 · 앱(그리드) · 메뉴

개인용 단일 사용자 앱에 알림 대상이 없고(협업·공유는 PRD 비목표), 도움말·앱 스위처·
햄버거 메뉴도 현재 정보 구조에 담을 내용이 없다. **구현보다 제거가 유력한 후보**다.
셸을 실제 기능만으로 정리하면 화면이 정직해진다. 남긴다면 최소한 지금처럼 비활성이어야 한다.
`.topbar__bell-dot`(빨간 점)도 실제 알림 개수와 무관한 순수 장식이라 함께 정리 대상이다.

**관련 파일**

- `components/AppShell.tsx` (8종 렌더 지점)
- `components/ui/IconButton.tsx`, `components/ui/SidebarItem.tsx` (`disabled` 규약·`pendingLabel`)
- `app/globals.css` (`.is-disabled`)
- `lib/posts.ts`, `lib/store.tsx` (휴지통 착수 시)
- `__tests__/AppShell.pendingItems.test.tsx` (구현하면 해당 항목을 이 목록에서 빼야 한다)

---

## 셀프 코드 리뷰 미수정 항목 (2026-07-20)

wt1~wt4 머지 통합본을 세 각도(머지 정합성 / 런타임·보안 / 문서·테스트)로 리뷰한 결과 중,
이번에 고치지 않고 남긴 것들. 고친 것은 A1(자기소개 저장 실패 표면화), A3(로그아웃 시
프로필 오버라이드 정리), A4(error_description 이중 디코딩), 죽은 CSS 제거, DESIGN.md
사실 오류 정정, CI PR 트리거다.

### ~~A2. RLS 거부된 UPDATE/DELETE가 에러가 아니라 0행 — 롤백 경로가 죽은 코드 (높음)~~ — 해소됨 (2026-07-21)

`deletePostById`/`updatePostFields`에 `.select("id")`를 붙여 0행이면 throw 하도록
수정했다(커밋 ccee910). `store.tsx`의 낙관적 롤백·flush 알림 경로가 실제로 동작한다.
아래는 원래 기록이다.

`lib/posts.ts` `deletePostById`/`updatePostFields`, `lib/store.tsx` `deletePost`/`flush`.

Postgres의 RLS `USING` 절은 **행 필터**다. 조건에 맞지 않으면 에러가 아니라 0행이 되고,
PostgREST는 204/`error: null`로 응답한다. `pg_policies` 실측으로 확인했다 —
`page_delete_own`은 `qual`만 있고 `with_check`가 없다. INSERT만 `with_check`라 42501을 낸다.

결과: 남의 글을 지우거나 세션이 끊긴 상태에서 지우면 화면에서는 사라지는데 DB에는 남고,
낙관적 롤백(`.catch(refetch)`)은 **영원히 실행되지 않는다**. 디바운스 편집도 마찬가지로
"자동 저장됨"을 표시한 채 서버에는 안 쓰인다.

수정 방향: `.select("id")`를 붙여 영향받은 행을 돌려받고 0행이면 실패로 처리한다
(A1에서 `saveIntroduction`에 적용한 방식과 동일). `lib/posts.ts`의 반환 계약이 바뀌므로
`store.tsx`의 호출부와 `__tests__/store.test.tsx`의 목도 함께 손봐야 해서 범위가 있다.

### A5. 로그아웃·계정 전환 시 대기 중인 디바운스 타이머가 취소되지 않음 (중간)

`lib/store.tsx` 세션 effect. `pending` Map은 `flush()`와 언마운트 정리로만 비워진다.
글을 타이핑하다 600ms 안에 로그아웃하면 타이머가 익명 클라이언트로 발사돼 0행으로 끝난다
(A2 때문에 조용히). 빠른 계정 전환 시에는 B의 토큰으로 A의 행 id에 PATCH가 나간다 —
RLS가 막으므로 유출은 없지만 역시 무성음이다. `deletePost`는 자기 id의 타이머를 취소하는데
(`store.tsx`), 세션 해제 경로에는 같은 처리가 없다.

### A6. `updatePost` 실패 시 롤백 없음 (중간)

`flush`가 await 전에 pending 항목을 지우고, 실패는 `window.alert`만 띄운다. 로컬 상태는
거부된 값을 그대로 들고 있고 재시도도 없어 새로고침하면 사라진다. `deletePost`는 최소한
refetch로 서버 진실에 맞추려 한다.

### A7. 탭 닫기·하드 이동 시 편집 유실 (중간)

`lib/store.tsx`의 언마운트 flush 주석은 "이탈 시 유실 방지"를 주장하지만, `AppProvider`는
루트 레이아웃에 있어 SPA 이동으로 언마운트되지 않고, React는 탭 닫기에 정리를 돌리지 않는다.
`beforeunload`/`pagehide`/`visibilitychange` 핸들러가 없다(grep 확인). 마지막 타건 후
600ms 안에 탭을 닫으면 그 편집은 사라진다. 주석이 사실과 다른 것도 함께 고칠 것.

### A8. 로딩 표시 없음 (낮음)

`components/AppShell.tsx`가 `!app.loaded`일 때 `null`을 반환한다. Supabase 응답이 느리거나
멈추면 완전한 백지에 스피너도 타임아웃도 없다. 로그아웃 직후에도 `loaded`가 false로 돌아가
리다이렉트가 완료될 때까지 백지다.

### ~~A9. 아바타 업로드 크기 제한 없음 (낮음)~~ — 해소됨 (2026-07-20)

원래 문제: `app/(app)/mypage/page.tsx`가 어떤 파일이든 data URL로 읽어 localStorage에
저장했다. 3MB 사진이면 base64로 ~4MB라 5MB 쿼터를 넘고, `store.tsx`의 빈 `catch {}`가
`QuotaExceededError`를 삼켜 별명·사이드바 상태까지 조용히 저장되지 않았다.

프로필 이미지 Supabase 연동으로 근본 원인이 사라졌다 — 사진은 이제 localStorage가 아니라
Storage `profile-image` 버킷에 올라가고 경로만 `profile.image_path`에 저장된다.
`validateImageFile`이 픽 시점에 형식·용량(1byte~5MB)을 검사하고 실패는 알림으로 표면화한다.
localStorage 스키마에서 `avatar` 필드 자체가 제거됐다(§5.5). 관련: `lib/profile-image.ts`,
`__tests__/profile-image.test.ts`, `__tests__/MyPage.profileImage.test.tsx`.

### T1. `AppShell.sidebarCollapse.test.tsx` "펼친 상태로 재마운트" 테스트가 재마운트하지 않음

한 번 렌더하고 접히지 않았음만 단언한다. `beforeEach`가 `sidebarCollapsed` 없이 시드하므로
사실상 기본값 재확인이고, **펼침 상태의 영속화가 완전히 깨져도 통과한다**. 형제 테스트인
US3-2는 `cleanup()` + 재렌더를 제대로 한다. 같은 방식으로 고칠 것.

### T2. 같은 파일의 레일 툴팁 테스트가 레일 특정적이지 않음

`SidebarItem`이 `title`을 항상 설정하므로 펼침 상태에서도 동일하게 통과한다. FR-009(레일에서
이름 확인)를 검증하지 못한다. 이웃 테스트처럼 레일에 남는 항목의 정확한 목록을 단언할 것.

### T3. 삭제-디바운스 취소 상호작용 미테스트

`lib/store.tsx`가 삭제 시 해당 id의 대기 타이머를 취소하는 동작은 DESIGN.md §5.2가 보장한다고
명시하는데 테스트가 없다. 디바운스와 언마운트 flush는 각각 테스트되지만 조합은 비어 있다.

### T4. 게시글 소유자 격리는 실행 가능한 테스트가 없음 (구조적 한계)

`lib/posts.ts`는 의도적으로 클라이언트 필터를 걸지 않고 RLS에 위임한다. 따라서 RLS 정책이
퇴행해도 jsdom 단위 테스트로는 잡히지 않는다. 실제 두 계정으로 하는 수동 시나리오
(`specs/003-supabase-page-posts/quickstart.md` S1–S5)가 유일한 검증 수단이다.
