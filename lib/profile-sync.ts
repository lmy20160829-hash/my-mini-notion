"use client";

import type { User } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured } from "./supabase";

/**
 * profile 테이블 한 행의 모양. auth.users 의 구글 인증 정보를 미러링한다.
 * id/created_at 은 DB 기본값(gen_random_uuid / now)으로 채워진다.
 */
export type ProfileRow = {
  user_id: string;
  name: string;
  email: string | null;
  avatar_url: string | null;
};

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

/**
 * 구글 계정(User)에서 profile 테이블에 넣을 값만 뽑아낸다.
 * 순수 함수라 단위 테스트가 쉽다. (로컬 오버라이드는 쓰지 않고, 인증 원본만 저장)
 */
export function toProfileRow(user: User): ProfileRow {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const name =
    str(meta.full_name) || str(meta.name) || str(user.email) || "사용자";
  const email = user.email ?? null;
  const avatarUrl = str(meta.avatar_url) || str(meta.picture) || null;
  return { user_id: user.id, name, email, avatar_url: avatarUrl };
}

/**
 * 로그인한 사용자의 인증 정보를 profile 테이블에 저장한다.
 * - upsert(onConflict: user_id): 매 로그인마다 실행돼도 사용자당 한 행만 유지되고,
 *   구글에서 이름/사진이 바뀌면 최신값으로 갱신된다.
 * - RLS: authenticated 사용자가 auth.uid() = user_id 인 행만 쓰도록 허용해야 성공한다.
 * 실패해도 앱 사용은 막지 않는다(로그인 자체는 유효). 에러는 콘솔에 남긴다.
 */
export async function syncProfileRow(
  user: User
): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured) return { error: null };
  const row = toProfileRow(user);
  const { error } = await getSupabase()
    .from("profile")
    .upsert(row, { onConflict: "user_id" });
  if (error) {
    console.error("[profile] 저장 실패:", error.message);
    return { error: error.message };
  }
  return { error: null };
}
