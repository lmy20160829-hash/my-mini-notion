# Google 로그인 설정 가이드 (Supabase Auth)

이 앱은 Supabase Auth의 Google provider로 로그인한다. 코드는 이미 준비되어 있고,
아래 외부 설정만 하면 실제 로그인이 동작한다. **순서대로** 진행할 것.

프로젝트 고정값:
- Supabase 프로젝트 ref: `ubkcexwugcyixflqnhgr`
- Supabase 콜백 URL: `https://ubkcexwugcyixflqnhgr.supabase.co/auth/v1/callback`
- 배포 앱 URL: `https://lmy20160829-hash.github.io/mini-notion-next/`
- 로컬 개발 URL: `http://localhost:3000`

---

## 1단계 — Google Cloud Console: OAuth 클라이언트 만들기

<https://console.cloud.google.com> 접속 후 프로젝트를 하나 선택(또는 새로 생성).

### 1-1. OAuth 동의 화면 (OAuth consent screen)
1. 좌측 메뉴 **APIs & Services → OAuth consent screen**.
2. User Type: **External** 선택 → **Create**.
3. 필수 항목 입력:
   - App name: 예) `미니 노션`
   - User support email: 본인 이메일
   - Developer contact information: 본인 이메일
   - → **Save and Continue**.
4. **Scopes**: 그대로 두고(기본 비민감 스코프면 충분) **Save and Continue**.
5. **Test users**: **+ ADD USERS** 로 **로그인에 쓸 본인 구글 이메일**을 추가.
   (동의 화면이 "Testing" 상태인 동안은 여기 등록된 계정만 로그인 가능.)
   → **Save and Continue**.

### 1-2. OAuth 클라이언트 ID
1. 좌측 메뉴 **APIs & Services → Credentials**.
2. 상단 **+ CREATE CREDENTIALS → OAuth client ID**.
3. **Application type: Web application** 선택.
4. Name: 예) `mini-notion-web`.
5. **Authorized redirect URIs** → **+ ADD URI** 로 아래를 **정확히** 입력:
   ```
   https://ubkcexwugcyixflqnhgr.supabase.co/auth/v1/callback
   ```
   (Authorized JavaScript origins는 이 플로우에선 필수 아님 — 비워둬도 됨.)
6. **Create** → 팝업에 뜨는 **Client ID** 와 **Client Secret** 을 복사해 둔다.

---

## 2단계 — Supabase: Google provider 켜기

<https://supabase.com/dashboard> → 해당 프로젝트 선택.

### 2-1. Provider 등록
1. **Authentication → Sign In / Providers** (또는 Providers) → **Google**.
2. **Enable Sign in with Google** 켜기.
3. 1단계에서 복사한 값 붙여넣기:
   - **Client ID (for OAuth)** = Google의 Client ID
   - **Client Secret (for OAuth)** = Google의 Client Secret
4. (여기 표시된 Callback URL이 1-2의 redirect URI와 같은지 확인) → **Save**.

### 2-2. Redirect URL 허용목록
1. **Authentication → URL Configuration**.
2. **Site URL**:
   ```
   https://lmy20160829-hash.github.io/mini-notion-next/
   ```
3. **Redirect URLs** → **Add URL** 로 아래 둘 다 추가:
   ```
   https://lmy20160829-hash.github.io/mini-notion-next/**
   http://localhost:3000/**
   ```
   → **Save**.

### 2-3. 공개 키 확보
1. **Project Settings → API**.
2. **Project URL** = `https://ubkcexwugcyixflqnhgr.supabase.co` (확인용)
3. **Project API keys → `anon` `public`** 키 복사.
   (이 키는 공개용이라 클라이언트 번들에 포함되어도 안전.)

---

## 3단계 — GitHub 배포에 공개 키 주입

repo → **Settings → Secrets and variables → Actions → `Variables` 탭** →
**New repository variable** 로 아래 2개 등록:

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://ubkcexwugcyixflqnhgr.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 2-3에서 복사한 anon public 키 |

> Secrets가 아니라 **Variables** 탭에 넣는다(공개 값이라 무방하며, 빌드 로그/번들에
> 어차피 노출됨). 배포 워크플로가 빌드 시 이 값을 클라이언트 번들로 인라인한다.

---

## 4단계 — (선택) 로컬 개발에서 로그인 테스트

```bash
cp .env.example .env.local
# .env.local 에 NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY 채우기
npm run dev
# http://localhost:3000/login 에서 Google 로그인
```

---

## 5단계 — 배포

1~3단계가 끝나면 **PR #3 을 main에 머지** → GitHub Actions가 자동 빌드·배포.
`https://lmy20160829-hash.github.io/mini-notion-next/` 에서 실제 Google 로그인 확인.

## 문제 해결
- **"로그인이 아직 설정되지 않았습니다"**: 3단계 Variables 미등록(빌드에 env 없음).
- **`redirect_uri_mismatch`**(Google): 1-2의 redirect URI 오타. 콜백 URL 정확히 일치해야 함.
- **로그인 후 앱으로 안 돌아옴**: 2-2 Redirect URLs에 앱/로컬 URL 미등록.
- **`access_denied`**: 1-1 Test users에 로그인 계정 미등록(Testing 상태).
