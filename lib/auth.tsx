"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured } from "./supabase";

type AuthContextValue = {
  /** 초기 세션 확인(및 OAuth code 교환)이 끝났는지. 게이트 판단의 기준. */
  ready: boolean;
  session: Session | null;
  user: User | null;
  /** 사용자에게 보여줄 인증 오류 메시지(설정 누락·OAuth 실패 등). */
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function hasParam(name: string): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).has(name);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 설정 전(env 없음): 인증은 불가하지만 앱은 로드되게 ready 처리.
    if (!isSupabaseConfigured) {
      setReady(true);
      return;
    }

    // OAuth 복귀 시 실패는 쿼리로 전달된다(예: 사용자가 동의 취소).
    if (hasParam("error_description")) {
      const desc = new URLSearchParams(window.location.search).get(
        "error_description"
      );
      if (desc) setError(decodeURIComponent(desc.replace(/\+/g, " ")));
    }

    const supabase = getSupabase();
    let mounted = true;

    // OAuth 복귀(?code=)면 code 교환이 끝난 뒤(onAuthStateChange)에 ready 처리해
    // 로그인 화면이 잠깐 깜빡이는 것을 막는다. 아니면 즉시 확인.
    const pendingExchange = hasParam("code");
    if (!pendingExchange) {
      supabase.auth.getSession().then(({ data }) => {
        if (!mounted) return;
        setSession(data.session);
        setReady(true);
      });
    }

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!mounted) return;
      setSession(s);
      setReady(true);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setError(null);
    if (!isSupabaseConfigured) {
      setError(
        "로그인이 아직 설정되지 않았습니다. 잠시 후 다시 시도해 주세요."
      );
      return;
    }
    try {
      // 현재 페이지(로그인) URL로 복귀 — 서브패스/로컬 모두 자동으로 맞는다.
      const redirectTo = window.location.origin + window.location.pathname;
      const { error: oauthError } = await getSupabase().auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });
      if (oauthError) setError(oauthError.message);
      // 성공하면 브라우저가 Google로 이동하므로 이 아래는 실행되지 않는다.
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "로그인 중 오류가 발생했습니다."
      );
    }
  }, []);

  const signOut = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    await getSupabase().auth.signOut();
    // onAuthStateChange가 session=null 을 반영한다.
  }, []);

  const value: AuthContextValue = {
    ready,
    session,
    user: session?.user ?? null,
    error,
    signInWithGoogle,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
