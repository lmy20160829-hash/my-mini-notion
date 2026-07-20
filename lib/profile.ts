"use client";

import { useAuth } from "./auth";
import { useApp } from "./store";

export type Profile = {
  displayName: string;
  email: string;
  avatarUrl: string | null;
};

type UserLike = {
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
} | null;

type Overrides = {
  nickname: string | null;
  /** Storage 에 올린 프로필 사진 URL(= 환경변수 앞부분 + profile.image_path). */
  imageUrl: string | null;
};

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

/**
 * 구글 계정 정보와 오버라이드(마이페이지에서 바꾼 별명 / 업로드한 프로필 사진)를 병합한다.
 * 오버라이드가 있으면 우선하고, 없으면 구글 기본값을 쓴다.
 * 별명은 로컬(localStorage), 사진은 서버(profile.image_path)에서 온다.
 * 순수 함수라 단위 테스트가 쉽다.
 */
export function mergeProfile(user: UserLike, overrides: Overrides): Profile {
  const meta = user?.user_metadata ?? {};
  const email = str(user?.email);
  const googleName = str(meta.full_name) || str(meta.name);
  const googleAvatar = str(meta.avatar_url) || str(meta.picture) || null;

  return {
    displayName: overrides.nickname || googleName || email || "사용자",
    email,
    avatarUrl: overrides.imageUrl || googleAvatar,
  };
}

/** 화면 표시용 프로필. 사이드바·마이페이지에서 사용. */
export function useProfile(): Profile {
  const { user } = useAuth();
  const app = useApp();
  return mergeProfile(user, {
    nickname: app.nickname,
    imageUrl: app.profileImageUrl,
  });
}
