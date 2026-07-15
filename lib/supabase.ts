import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// NEXT_PUBLIC_* 값은 `next build` 시점에 클라이언트 번들로 인라인된다.
// (반드시 리터럴 참조여야 인라인됨 — 동적 lookup 금지)
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * 환경변수 미설정 여부. 설정 전(로컬/CI)에도 앱이 크래시하지 않도록
 * 클라이언트 생성은 지연시키고, 로그인 화면에서 이 플래그로 안내한다.
 */
export const isSupabaseConfigured = Boolean(url && anonKey);

let client: SupabaseClient | null = null;

/**
 * 브라우저 Supabase 클라이언트 싱글턴.
 * - flowType 'pkce': 서버 없는 정적 SPA에서 OAuth를 브라우저만으로 완결
 * - detectSessionInUrl: OAuth 복귀 시 ?code= 를 자동으로 세션 교환
 * - persistSession/autoRefresh: localStorage에 세션 유지
 */
export function getSupabase(): SupabaseClient {
  if (!isSupabaseConfigured) {
    throw new Error(
      "Supabase 환경변수가 없습니다. NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY 를 설정하세요."
    );
  }
  if (!client) {
    client = createClient(url as string, anonKey as string, {
      auth: {
        flowType: "pkce",
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return client;
}
