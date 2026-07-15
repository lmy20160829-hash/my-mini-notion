# 미니 노션 — Supabase Google OAuth 로그인 설계

- **날짜**: 2026-07-15
- **브랜치**: `004-supabase-google-login`
- **상태**: 승인됨 (설계 + 가정 2건 동의)

## 1. 배경 / 문제

로그인 페이지의 "Google 계정으로 계속하기" 버튼은 현재 **목업**이다. `app.login()`이
클라이언트 스토어의 `loggedIn` 플래그를 `true`로 바꾸고 localStorage에 저장할 뿐,
실제 인증은 없다. 사이드바·마이페이지의 신원 정보(`김민수`, `minsu.kim@gmail.com`)도
`lib/store.tsx`에 하드코딩되어 있다.

이 목업을 **Supabase Auth 기반 실제 Google OAuth**로 교체하고, 로그인한 구글 계정의
이름·이메일·프로필 사진을 화면에 표시한다.

## 2. 목표 (Goals)

- 로그인 버튼이 실제 Google OAuth(PKCE)를 트리거한다.
- 인증 세션이 브라우저에 지속되고, 새로고침 후에도 로그인 상태가 유지된다.
- 워크스페이스(`(app)/*`)는 실제 세션이 있을 때만 접근 가능하다.
- 사이드바·마이페이지가 실제 구글 계정의 이름/이메일/아바타를 표시한다.
- 로그아웃이 실제 세션을 종료한다.
- **정적 export + GitHub Pages 서브패스** 배포에서 그대로 동작한다(서버 없음).
- 로컬 개발(`localhost:3000`)에서도 로그인이 동작한다.

## 3. 비목표 (Non-goals) — 승인된 가정

- **글 데이터는 지금처럼 localStorage 단일 버킷을 유지**한다. 사용자별 분리·
  서버 저장·마이그레이션은 하지 않는다.
- Supabase에 사용자 프로필/글을 저장하는 DB 테이블은 만들지 않는다.
- 이메일/비밀번호, 매직링크 등 다른 인증 수단은 다루지 않는다(구글만).

## 4. 제약 (Constraints)

- **서버 없음**: `output: 'export'` 정적 SPA. 모든 인증은 브라우저에서 완결되어야
  하므로 Supabase의 **클라이언트 PKCE 플로우**를 사용한다.
- **서브패스**: 프로덕션은 `https://lmy20160829-hash.github.io/mini-notion-next/`
  하위에서 서빙된다. OAuth `redirectTo`와 Supabase redirect 허용목록이 이 경로를
  반영해야 한다.
- **anon 키는 공개**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`는 클라이언트 번들에 포함되어
  공개된다. 이는 Supabase 설계상 정상이며 RLS로 보호한다(이번 범위에선 테이블 없음).
- **Supabase MCP는 현재 `Pending approval`**: 세션 재시작 + `/mcp` 인증 후에야
  사용 가능. 앱 코드 작업은 MCP 없이 진행하고, 재시작은 코드 완료 후로 미룬다.

## 5. 아키텍처 (모듈과 책임)

인증을 글/프로필 스토어와 **분리된 관심사**로 둔다.

| 모듈 | 책임 | 의존 |
|---|---|---|
| `lib/supabase.ts` *(신규)* | 브라우저 Supabase 클라이언트 싱글턴 생성. 환경변수 검증. | `@supabase/supabase-js`, env |
| `lib/auth.tsx` *(신규)* | `AuthProvider` + `useAuth()`. 세션 구독·초기화·code 교환. `signInWithGoogle()`, `signOut()` 노출. | `lib/supabase.ts` |
| `lib/profile.ts` *(신규)* | `useProfile()` — 구글 user metadata와 로컬 별명/아바타 오버라이드를 병합해 `{ displayName, email, avatarUrl }` 반환. | `lib/auth.tsx`, `lib/store.tsx` |
| `lib/store.tsx` *(수정)* | 목업 `loggedIn/login/logout` + 하드코딩 이름·이메일 제거. 글, 로컬 별명·아바타 오버라이드만 유지. | — |
| `app/layout.tsx` *(수정)* | `<AuthProvider><AppProvider>{children}</AppProvider></AuthProvider>` | — |

`useAuth()` 인터페이스:

```ts
type AuthState = {
  ready: boolean;                 // 초기 세션 확인 + code 교환 완료 여부
  session: Session | null;
  user: User | null;
  error: string | null;           // OAuth/설정 오류 메시지(사용자 표시용)
  signInWithGoogle(): Promise<void>;
  signOut(): Promise<void>;
};
```

`ready`가 게이트의 핵심이다. 이 값이 `false`인 동안에는 로그인/워크스페이스 어느
쪽도 리다이렉트 결정을 내리지 않아 플리커·오작동을 막는다.

## 6. 인증 흐름 (클라이언트 PKCE)

```
[/login] 버튼 클릭
  → supabase.auth.signInWithOAuth({
        provider: 'google',
        // 현재 로그인 페이지 URL로 복귀 — 서브패스/로컬 모두 자동으로 맞음
        options: { redirectTo: window.location.origin + window.location.pathname }
    })
  → 브라우저가 Google 동의 화면으로 이동
  → 승인 후 Google → Supabase 콜백
        https://ubkcexwugcyixflqnhgr.supabase.co/auth/v1/callback
  → Supabase가 허용목록 검증 후 앱으로 복귀
        …/mini-notion-next/login/?code=XXXX
  → supabase-js(detectSessionInUrl)가 code를 세션으로 교환, localStorage 저장
  → AuthProvider의 onAuthStateChange가 세션 반영, ready=true
  → /login 페이지 effect: session 있으면 router.replace('/')
```

로그아웃: 마이페이지 → `signOut()` → localStorage 세션 제거 →
`onAuthStateChange(null)` → AppShell 게이트가 `/login`으로 이동.

**`redirectTo`를 `/login/`으로 두는 이유**: 복귀 지점이 인증 게이트가 걸린 `/`이면
code 교환이 끝나기 전 AppShell이 먼저 `/login`으로 튕길 수 있다. 게이트가 없는
`/login`으로 복귀시켜 그 페이지에서 세션 확정 후 `/`로 보낸다.

## 7. 게이트 변경 (`components/AppShell.tsx`)

```
현재: if (app.loaded && !app.loggedIn) router.replace('/login');
       if (!app.loaded || !app.loggedIn) return null;

변경: const { ready, session } = useAuth();
       if (ready && !session) router.replace('/login');
       if (!ready || !session) return null;   // 확인 전엔 아무것도 안 그림
```

## 8. 신원/프로필 병합 규칙 (`useProfile`)

Google `user`에서:
- `email` = `user.email`
- 기본 이름 = `user.user_metadata.full_name ?? user.user_metadata.name ?? email`
- 기본 아바타 = `user.user_metadata.avatar_url ?? user.user_metadata.picture ?? null`

로컬 오버라이드(store, 마이페이지에서 사용자가 바꾼 값)가 있으면 우선:
- `displayName` = 로컬 `nickname` || 구글 기본 이름
- `avatarUrl` = 로컬 업로드 `avatar`(dataURL) || 구글 아바타 URL

사이드바(`AppShell`)와 마이페이지가 `useProfile()`을 사용한다. 마이페이지 이메일
칸은 `useProfile().email` + 기존 "Google 계정" 배지(이제 실제)를 표시한다.

## 9. 환경변수 / 설정

| 변수 | 값 / 출처 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://ubkcexwugcyixflqnhgr.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 대시보드 Settings → API → anon public (직접 제공 또는 MCP 재시작 후 조회) |

- **redirect 경로**: 별도 env 없이 런타임에 `window.location.origin + pathname`으로 조립하므로
  프로덕션 서브패스(`/mini-notion-next/login/`)와 로컬(`localhost:3000/login`) 모두 자동으로 맞다.
  `next.config.ts`의 `basePath`는 기존대로 `NODE_ENV==='production'`일 때 `/mini-notion-next` 유지(변경 없음).
- **로컬**: `.env.local`(gitignore)에 위 값. `.env.example` 커밋으로 형식 문서화.
- **CI**: GitHub Actions 빌드 스텝에 repo Variables로 주입(anon 키는 공개 안전).
- `isSupabaseConfigured`(env 누락 감지)로 설정 전에도 앱이 크래시하지 않게 하고,
  로그인 페이지는 인증 오류를 인라인으로 안내한다.

## 10. 배포 워크플로 변경 (`.github/workflows/deploy.yml`)

빌드 스텝에 env 주입:

```yaml
- name: Build static export (out/)
  run: npm run build
  env:
    NEXT_PUBLIC_SUPABASE_URL: ${{ vars.NEXT_PUBLIC_SUPABASE_URL }}
    NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ vars.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
```

repo → Settings → Secrets and variables → Actions → **Variables**에
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` 등록(사용자 작업).

## 11. UI/UX 상태 + DESIGN.md 영향

시각적 변경은 최소화하고 기존 토큰을 재사용한다.

- **로그인 버튼**: OAuth 리다이렉트 준비 중 "연결 중…" 비활성 상태. 실패/설정 누락 시
  카드 하단에 인라인 에러 텍스트(기존 `--status-*`/문구 톤 재사용).
- **초기 로딩**: `auth.ready` 전에는 기존처럼 빈 화면(null) 유지 — 신규 스피너 없음.
- **마이페이지**: 이메일이 실제 값으로, 아바타 기본값이 구글 사진으로 바뀌는 것 외
  레이아웃 불변.

새 상태(로그인 버튼 로딩/에러)가 생기므로 `DESIGN.md`에 해당 상태를 반영한다
(§ 로그인/버튼 상태). 새 색·간격은 만들지 않고 기존 값을 사용한다.

## 12. 테스트 전략

- **유닛**: `lib/profile` 병합 규칙(구글값/로컬 오버라이드 우선순위), `useAuth`의
  세션 상태 전이 — `@supabase/supabase-js`를 mock해 `onAuthStateChange`/`getSession`
  응답을 주입.
- 기존 24개 테스트 그린 유지(스토어 API 변경에 따른 참조 정리 포함).
- OAuth 리다이렉트 자체(브라우저↔Google↔Supabase)는 유닛 범위 밖 — 수동 E2E로 검증.

## 13. 외부 설정 (사용자 작업 — 별도 상세 가이드 전달)

1. **Google Cloud Console**: OAuth 동의 화면 구성 → OAuth 2.0 Client ID(Web) 생성 →
   Authorized redirect URI = `https://ubkcexwugcyixflqnhgr.supabase.co/auth/v1/callback` →
   Client ID/Secret 확보.
2. **Supabase 대시보드**: Authentication → Providers → Google 활성화 + Client ID/Secret
   등록. URL Configuration에 Site URL + Redirect 허용목록
   (`…/mini-notion-next/**`, `http://localhost:3000/**`) 추가. Settings → API에서
   anon 키 확보.

## 14. 변경 파일 목록

- 신규: `lib/supabase.ts`, `lib/auth.tsx`, `lib/profile.ts`, `.env.example`,
  `docs/superpowers/specs/2026-07-15-supabase-google-login-design.md`
- 수정: `app/layout.tsx`, `app/login/page.tsx`, `components/AppShell.tsx`,
  `app/(app)/mypage/page.tsx`, `lib/store.tsx`, `next.config.ts`,
  `.github/workflows/deploy.yml`, `package.json`, `DESIGN.md`
- 테스트: `__tests__/profile.test.ts`(및 필요 시 auth 테스트)

## 15. 리스크 / 완화

- **`redirectTo` 서브패스 불일치** → Supabase 허용목록에 정확 경로 등록 + `basePath`
  단일 출처(`NEXT_PUBLIC_BASE_PATH`)로 조립.
- **설정 전 크래시** → `supabase.ts`가 env 누락을 방어, 로그인 페이지가 안내.
- **딥링크/새로고침 404**(기존 배포 특성) → 로그인·홈은 정적 파일 존재로 무관.
- **MCP 미가용** → 코드/스펙은 MCP 없이 완료. MCP는 재시작 후 설정 검증·anon 키
  조회 용도로만 사용(선택적).

## 16. 작업 순서

1. 스펙 커밋(본 문서). ← 지금
2. 앱 코드 구현(supabase-js 연동, auth/profile, UI 배선, 테스트, 빌드/워크플로 env).
3. Google Cloud + Supabase 단계별 가이드 전달.
4. 코드 커밋/PR 후 **MCP 재시작 타이밍 안내** → 재시작·인증 후 MCP로 설정 검증.
