"use client";

import { getSupabase, isSupabaseConfigured } from "./supabase";

/**
 * 프로필 사진이 들어가는 Storage 버킷. 공개 버킷이라 URL 로 바로 읽힌다
 * (읽기에 RLS select 정책이 필요 없다 — `docs/profile-image-storage-setup.sql` 참조).
 * 그래서 이 파일은 list()/getPublicUrl() 을 쓰지 않고 URL 을 직접 조립한다.
 */
export const PROFILE_IMAGE_BUCKET = "profile-image";

/**
 * 다운로드 URL 의 앞부분(스토리지 주소 + 버킷명)이다. 예:
 *   https://<ref>.supabase.co/storage/v1/object/public/profile-image
 * 뒷부분(버킷 이후 경로)만 `profile.image_path` 에 저장하고, 표시할 때 둘을 합친다.
 * NEXT_PUBLIC_* 이라 빌드 시 클라이언트 번들로 인라인된다(리터럴 참조 필수).
 */
const storageBaseUrl = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_URL;

export const isStorageConfigured = Boolean(storageBaseUrl);

/** 허용 확장자·용량. DESIGN.md 힌트("JPG, PNG")보다 넓게 잡되 무제한은 아니다. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

const EXTENSION_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

type FileLike = { name: string; type: string; size: number };

/**
 * 앞부분(환경변수)과 뒷부분(image_path)을 합쳐 실제 다운로드 URL 을 만든다.
 * 경계의 슬래시 중복을 정리하므로 base 끝이나 path 앞에 `/` 가 있어도 안전하다.
 * 순수 함수라 단위 테스트가 쉽다.
 */
export function joinStorageUrl(
  base: string | undefined | null,
  path: string | null | undefined
): string | null {
  if (!base || !path) return null;
  return `${base.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

/** 저장된 image_path → 화면에 쓸 URL. 환경변수가 없거나 경로가 없으면 null. */
export function profileImageUrl(path: string | null | undefined): string | null {
  return joinStorageUrl(storageBaseUrl, path);
}

/**
 * 업로드 전 파일 검사. 문제가 없으면 null, 있으면 사용자에게 보여줄 메시지를 돌려준다.
 * (throw 대신 메시지를 반환해 호출부가 alert 로 그대로 쓸 수 있게 한다.)
 */
export function validateImageFile(file: FileLike): string | null {
  if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return "JPG, PNG, WEBP, GIF 이미지만 올릴 수 있습니다.";
  }
  if (file.size === 0) return "빈 파일은 올릴 수 없습니다.";
  if (file.size > MAX_IMAGE_BYTES) {
    const mb = Math.round(MAX_IMAGE_BYTES / 1024 / 1024);
    return `이미지 용량은 ${mb}MB 이하여야 합니다.`;
  }
  return null;
}

/** MIME 타입 우선, 없으면 파일명 확장자, 그것도 없으면 jpg. */
export function imageExtension(file: Pick<FileLike, "name" | "type">): string {
  const byType = EXTENSION_BY_TYPE[file.type];
  if (byType) return byType;
  const match = /\.([a-zA-Z0-9]{1,5})$/.exec(file.name || "");
  return match ? match[1].toLowerCase() : "jpg";
}

function randomUuid(): string {
  return crypto.randomUUID();
}

/**
 * 버킷 안에 저장할 경로(= image_path). 파일명은 uuidv4 라 사용자가 같은 이름의
 * 파일을 올려도 절대 덮어쓰이지 않는다. 테스트에서는 uuid 를 주입한다.
 */
export function newImagePath(
  file: Pick<FileLike, "name" | "type">,
  uuid: string = randomUuid()
): string {
  return `${uuid}.${imageExtension(file)}`;
}

/** 로그인 사용자의 저장된 image_path 를 읽어온다. 없으면 null(정상 상태). */
export async function fetchImagePath(
  userId: string
): Promise<{ imagePath: string | null; error: string | null }> {
  if (!isSupabaseConfigured) return { imagePath: null, error: null };
  const { data, error } = await getSupabase()
    .from("profile")
    .select("image_path")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    console.error("[profile] 프로필 이미지 조회 실패:", error.message);
    return { imagePath: null, error: error.message };
  }
  const value = data?.image_path;
  return { imagePath: typeof value === "string" ? value : null, error: null };
}

/**
 * 프로필 사진을 Storage 에 올리고 경로를 profile.image_path 에 기록한다.
 *
 * 순서가 중요하다: 업로드 → DB 기록 → (성공 시에만) 이전 파일 삭제.
 * DB 기록이 실패하면 방금 올린 파일을 되돌려 지운다 — 아무 데서도 참조하지 않는
 * 고아 파일이 버킷에 쌓이는 것을 막기 위함이다.
 *
 * update 는 조건에 맞는 행이 없어도 에러가 아니라 0행으로 끝나므로(`saveIntroduction`
 * 과 같은 이유) `.select()` 로 갱신된 행을 돌려받아 0행이면 실패로 본다.
 */
export async function uploadProfileImage(
  userId: string,
  file: File,
  previousPath: string | null
): Promise<{ imagePath: string | null; error: string | null }> {
  const invalid = validateImageFile(file);
  if (invalid) return { imagePath: null, error: invalid };

  if (!isSupabaseConfigured || !isStorageConfigured) {
    return {
      imagePath: null,
      error:
        "Storage 환경변수가 없습니다. NEXT_PUBLIC_SUPABASE_STORAGE_URL 을 설정하세요.",
    };
  }

  const supabase = getSupabase();
  const bucket = supabase.storage.from(PROFILE_IMAGE_BUCKET);
  const imagePath = newImagePath(file);

  const { error: uploadError } = await bucket.upload(imagePath, file, {
    contentType: file.type,
    upsert: false,
  });
  if (uploadError) {
    console.error("[profile] 이미지 업로드 실패:", uploadError.message);
    return { imagePath: null, error: uploadError.message };
  }

  const { data, error } = await supabase
    .from("profile")
    .update({ image_path: imagePath })
    .eq("user_id", userId)
    .select("user_id");

  if (error || !Array.isArray(data) || data.length === 0) {
    const message =
      error?.message ?? "프로필을 찾지 못해 이미지를 저장하지 못했습니다.";
    console.error("[profile] 이미지 경로 저장 실패:", message);
    // 참조되지 않을 파일이므로 되돌린다. 이 정리 실패까지 사용자에게 알리지는 않는다.
    void bucket.remove([imagePath]);
    return { imagePath: null, error: message };
  }

  // 교체 성공 후에야 이전 파일을 지운다. 실패해도 새 사진은 이미 유효하다.
  if (previousPath && previousPath !== imagePath) {
    const { error: removeError } = await bucket.remove([previousPath]);
    if (removeError) {
      console.error("[profile] 이전 이미지 삭제 실패:", removeError.message);
    }
  }

  return { imagePath, error: null };
}
