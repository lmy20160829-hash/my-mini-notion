# Implementation Plan: 자기소개 (Self-Introduction)

**Feature**: `003-self-introduction` | **Spec**: [spec.md](./spec.md) | **Branch**: `worktree-wt4`

## 1. 저장소 결정 (Dependencies 노트 해소)

자기소개는 **Supabase `public.profile.introduction`**(text, nullable)에 저장한다.

- 사용자가 직접 만든 컬럼이며 **스키마를 변경하지 않는다**(FR-010, 사용자 지시 "내가 만든 db 변경하면 안돼").
- 마이그레이션·DDL·INSERT/UPDATE 등 원격 DB 쓰기는 이번 작업에서 **수행하지 않았다**. 읽기 전용 조회로 컬럼 존재만 확인했다.
- `docs/profile-table-setup.sql`은 실제 DB와 어긋나 있었으므로, 기존 idempotent 스타일 그대로
  `add column if not exists introduction text`를 사후 문서화한다(이미 존재하므로 DB 변화 없음).
- 별명·아바타는 기존대로 `localStorage` 오버라이드를 유지한다. 이번 범위에서 저장소를 바꾸지 않는다(YAGNI).

## 2. 데이터 흐름

```
[마이 페이지 textarea #introduction]  ← introDraft (useState)
        │  로드: useEffect([userId]) → fetchIntroduction(userId)
        │        select("introduction").eq("user_id", userId).maybeSingle()
        ▼
[lib/profile-sync.ts]
        │  저장: "변경사항 저장" → saveIntroduction(userId, introDraft)
        │        normalizeIntroduction(값) → update({introduction}).eq("user_id", userId)
        ▼
[Supabase public.profile.introduction]
```

- **upsert가 아니라 update를 쓰는 이유**: `introduction` 컬럼만 갱신해 같은 행의
  `name`/`email`/`avatar_url`을 건드리지 않기 위함이다(FR-012, SC-005).
  `name`·`user_id`는 NOT NULL이라 부분 upsert는 INSERT 경로에서 실패하기도 한다.
  profile 행은 로그인 시 `syncProfileRow`가 이미 만든다.
- **로그인 동기화가 자기소개를 덮지 않는 이유**: `toProfileRow`의 payload에 `introduction`이 없어
  upsert의 UPDATE SET 대상에서 제외된다.
- **RLS**: 기존 owner-only select/insert/update 정책이 새 컬럼까지 그대로 커버한다. 정책은 손대지 않는다.

## 3. 정규화 규칙 (별명과 동일)

`normalizeIntroduction(value)`:
1. 앞뒤 공백·줄바꿈 제거 → 2. 남는 게 없으면 `null`(= 자기소개 제거) → 3. 최대 200자까지만.
가운데 줄바꿈은 보존한다. 입력 단계에서도 `maxLength={200}`으로 한도를 넘겨 입력할 수 없다.

## 4. 디자인 (DESIGN.md 준수)

- 기존 `.mypage-field` 패턴과 저장 피드백(`.saved-note` "저장되었습니다")을 그대로 재사용한다(FR-009).
- 여러 줄 필드용 스타일이 없어 **새 컴포넌트 `.field-textarea`** 를 추가한다 — `.field-input`과 동일한
  토큰(색·보더·radius·포커스 링)을 쓰고 높이·줄바꿈만 다르다. DESIGN.md §2.7.6b/§4.4/§6.5/§7/§8에 반영.
- 배치: 별명 필드 다음, 이메일 필드 앞.

## 5. Constitution Check

| 원칙 | 준수 |
|---|---|
| I. TDD | 세 단계 모두 RED 확인 후 GREEN (7/13/11개 실패 목격) |
| II. 모킹 규율 | 외부 경계(Supabase 클라이언트) 한 곳만 모킹. 스토어·프로바이더·페이지·정규화는 실제 코드 |
| III. 디자인 시스템 | 코드 작성 전 DESIGN.md 확인, 새 결정(`.field-textarea`)은 문서에 반영 |
| IV. 프레임워크 문서 | 번들 Next 16 문서 확인 — `output: "export"` SPA라 서버 데이터 페칭 불가, 클라이언트 훅 페칭이 맞음 |
| V. YAGNI | 글자 수 표시·별도 저장 버튼·스토어 확장 없음. 요구된 것만 |
