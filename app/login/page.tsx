"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" style={{ flex: "none" }}>
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

export default function LoginPage() {
  const auth = useAuth();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [returning, setReturning] = useState(false);

  // OAuth 복귀(?code=)인지 마운트 시 1회 확인(supabase가 URL을 정리하기 전에).
  useEffect(() => {
    setReturning(new URLSearchParams(window.location.search).has("code"));
  }, []);

  // 세션이 확정되면 워크스페이스로.
  useEffect(() => {
    if (auth.ready && auth.session) router.replace("/");
  }, [auth.ready, auth.session, router]);

  const handleLogin = async () => {
    setSubmitting(true);
    await auth.signInWithGoogle();
    // 성공하면 Google로 리다이렉트되어 아래는 실행되지 않는다. 실패 시에만 복귀.
    setSubmitting(false);
  };

  // 복귀 code 교환 중이거나 클릭 직후에는 버튼을 잠근다.
  const busy = submitting || (returning && !auth.ready);
  const label = submitting
    ? "연결 중…"
    : returning && !auth.ready
      ? "로그인 처리 중…"
      : "Google 계정으로 계속하기";

  return (
    <div className="login-page">
      <div className="login-card">
        <span className="brand-chip">mini</span>
        <h1>미니 노션</h1>
        <p className="login-card__desc">
          나만의 가벼운 업무 관리 공간.
          <br />
          구글 계정으로 바로 시작하세요.
        </p>
        <button
          type="button"
          className="login-google-btn"
          onClick={handleLogin}
          disabled={busy}
        >
          <GoogleLogo />
          {label}
        </button>
        {auth.error && <p className="login-error">{auth.error}</p>}
        <p className="login-card__terms">
          로그인하면 서비스 약관 및 개인정보 처리방침에
          <br />
          동의하는 것으로 간주됩니다.
        </p>
      </div>
    </div>
  );
}
