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

/** 자기소개 최대 길이(자). 짧은 소개에 맞춘 기본값 — spec Assumptions. */
export const INTRODUCTION_MAX_LENGTH = 200;

/**
 * 자기소개 입력값을 저장 값으로 정규화한다.
 * 별명(saveNickname)과 동일하게 앞뒤 공백을 제거하고, 남는 게 없으면 null(빈 값)로 본다.
 * 가운데 줄바꿈은 그대로 두어 여러 줄 소개가 보존된다.
 */
export function normalizeIntroduction(value: string): string | null {
  const trimmed = (value || "").trim();
  if (!trimmed) return null;
  return trimmed.slice(0, INTRODUCTION_MAX_LENGTH);
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

/**
 * 로그인한 사용자의 자기소개를 읽어온다(마이 페이지 진입 시 1회).
 * profile 행이 아직 없거나 자기소개가 비어 있으면 null — 둘 다 정상 상태다.
 */
export async function fetchIntroduction(
  userId: string
): Promise<{ introduction: string | null; error: string | null }> {
  if (!isSupabaseConfigured) return { introduction: null, error: null };
  const { data, error } = await getSupabase()
    .from("profile")
    .select("introduction")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    console.error("[profile] 자기소개 조회 실패:", error.message);
    return { introduction: null, error: error.message };
  }
  const value = data?.introduction;
  return { introduction: typeof value === "string" ? value : null, error: null };
}

/**
 * 자기소개를 저장한다. upsert 가 아니라 update 를 쓰는 이유:
 * introduction 컬럼만 건드려 같은 행의 name/email/avatar_url 을 그대로 두기 위함이다.
 * (profile 행은 로그인 시 syncProfileRow 가 이미 만들어 둔다.)
 * RLS 의 update 정책(auth.uid() = user_id)이 본인 행만 쓰도록 보장한다.
 *
 * update 는 조건에 맞는 행이 없어도 **에러가 아니라 0행**으로 끝난다 — 프로필 행이
 * 아직 없거나(로그인 시 syncProfileRow 가 실패했던 사용자) RLS 가 행을 걸러낸 경우다.
 * 그대로 두면 아무것도 쓰이지 않았는데 "저장되었습니다"가 표시되므로,
 * .select() 로 영향받은 행을 돌려받아 0행이면 실패로 보고한다.
 */
export async function saveIntroduction(
  userId: string,
  value: string
): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured) return { error: null };
  const { data, error } = await getSupabase()
    .from("profile")
    .update({ introduction: normalizeIntroduction(value) })
    .eq("user_id", userId)
    .select("user_id");
  if (error) {
    console.error("[profile] 자기소개 저장 실패:", error.message);
    return { error: error.message };
  }
  if (!Array.isArray(data) || data.length === 0) {
    const message = "프로필을 찾지 못해 자기소개를 저장하지 못했습니다.";
    console.error("[profile] 자기소개 저장 실패: 갱신된 행 없음");
    return { error: message };
  }
  return { error: null };
}
