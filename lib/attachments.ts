"use client";

import { getSupabase } from "./supabase";

/**
 * 본문 첨부(⑥⑧) — Storage `post-attachments` 버킷 접근과 첨부 정책.
 * (오버뷰 스펙 §2 승인 결정 · docs/post-attachments-setup.sql — 버킷·정책은 사전 적용 완료)
 *
 * - 화이트리스트: 이미지 png/jpg/jpeg/gif/webp ≤5MB(**svg 제외** — XSS 벡터),
 *   일반 파일 pdf/zip/txt/md/csv/docx/xlsx ≤20MB. 버킷 허용 MIME 11종과 이중 방어.
 * - 경로 규약: `{userId}/{postId}/{uuid}.{ext}` — 첫 폴더가 소유자(RLS insert/delete own).
 * - 영구 삭제 후 정리 실패 = **고아 첨부**: `[attachments] 고아 첨부 발생:` 고정 포맷으로
 *   로깅만 하고 절대 throw 하지 않는다(글 삭제 흐름 비차단). 주기 정리는 BACKLOG 담당.
 */
export const ATTACHMENTS_BUCKET = "post-attachments";

export const MAX_ATTACHMENT_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_ATTACHMENT_FILE_BYTES = 20 * 1024 * 1024;

export type AttachmentKind = "image" | "file";

type FileLike = { name: string; type: string; size: number };

/** 확장자 → 버킷 허용 MIME(11종)으로 정규화. 비표준 MIME(x-zip 등)의 폴백 축. */
const IMAGE_MIME_BY_EXT: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
};

const FILE_MIME_BY_EXT: Record<string, string> = {
  pdf: "application/pdf",
  zip: "application/zip",
  txt: "text/plain",
  md: "text/markdown",
  csv: "text/csv",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

/** MIME → 대표 확장자(역방향). 파일명에 확장자가 없을 때 쓴다. */
const EXT_BY_MIME: Record<string, string> = Object.fromEntries(
  [
    ...Object.entries(IMAGE_MIME_BY_EXT),
    ...Object.entries(FILE_MIME_BY_EXT),
  ].map(([ext, mime]) => [mime, ext])
);

function extensionOf(name: string): string | null {
  const match = /\.([a-zA-Z0-9]{1,8})$/.exec(name || "");
  return match ? match[1].toLowerCase() : null;
}

/**
 * 파일 → { kind, ext, mime } 분류. 화이트리스트 밖이면 null.
 * MIME(정확 일치) 우선, 아니면 확장자로 폴백해 버킷 허용 MIME으로 정규화한다 —
 * zip(application/x-zip-compressed)·csv(vnd.ms-excel)·md(빈 MIME) 같은 흔한 사례 대비.
 */
export function classifyAttachment(
  file: Pick<FileLike, "name" | "type">
): { kind: AttachmentKind; ext: string; mime: string } | null {
  const byMime = EXT_BY_MIME[file.type];
  if (byMime) {
    const kind: AttachmentKind = file.type.startsWith("image/") ? "image" : "file";
    return { kind, ext: extensionOf(file.name) ?? byMime, mime: file.type };
  }
  const ext = extensionOf(file.name);
  if (ext && IMAGE_MIME_BY_EXT[ext]) {
    return { kind: "image", ext, mime: IMAGE_MIME_BY_EXT[ext] };
  }
  if (ext && FILE_MIME_BY_EXT[ext]) {
    return { kind: "file", ext, mime: FILE_MIME_BY_EXT[ext] };
  }
  return null;
}

/**
 * 업로드 전 검사. 문제가 없으면 null, 있으면 사용자에게 보여줄 한국어 메시지.
 * (profile-image의 validateImageFile과 같은 관행 — 호출부가 alert로 그대로 쓴다.)
 */
export function validateAttachment(file: FileLike): string | null {
  const classified = classifyAttachment(file);
  if (!classified) {
    return "허용되지 않는 파일 형식입니다. 이미지(PNG·JPG·GIF·WEBP) 또는 PDF·ZIP·TXT·MD·CSV·DOCX·XLSX만 올릴 수 있습니다.";
  }
  if (file.size === 0) return "빈 파일은 올릴 수 없습니다.";
  if (classified.kind === "image" && file.size > MAX_ATTACHMENT_IMAGE_BYTES) {
    return "이미지 용량은 5MB 이하여야 합니다.";
  }
  if (classified.kind === "file" && file.size > MAX_ATTACHMENT_FILE_BYTES) {
    return "파일 용량은 20MB 이하여야 합니다.";
  }
  return null;
}

/**
 * 버킷 안 저장 경로 `{userId}/{postId}/{uuid}.{ext}`. 파일명은 uuid라 사용자 파일명
 * (한글·경로 조작 문자)이 경로에 남지 않고, 같은 이름을 다시 올려도 덮어쓰이지 않는다.
 */
export function newAttachmentPath(
  userId: string,
  postId: string,
  file: Pick<FileLike, "name" | "type">,
  uuid: string = crypto.randomUUID()
): string {
  const ext = classifyAttachment(file)?.ext ?? extensionOf(file.name) ?? "bin";
  return `${userId}/${postId}/${uuid}.${ext}`;
}

/** 파일 블록 카드의 크기 표시(§2.13): 1MB 미만은 KB, 이상은 MB(소수 첫째 자리까지). */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0KB";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  const mb = Math.round((bytes / (1024 * 1024)) * 10) / 10;
  return `${mb}MB`;
}

export type UploadedAttachment = {
  url: string;
  path: string;
  name: string;
  size: number;
  kind: AttachmentKind;
};

/**
 * 첨부를 Storage에 올리고 공개 URL을 돌려준다. 검증·업로드 실패는 한국어 메시지로
 * throw — 호출부(에디터 핸들러)가 `window.alert` 후 블록을 삽입하지 않는다(§5.13).
 */
export async function uploadAttachment(
  userId: string,
  postId: string,
  file: File
): Promise<UploadedAttachment> {
  const invalid = validateAttachment(file);
  if (invalid) throw new Error(invalid);
  const classified = classifyAttachment(file)!;

  const bucket = getSupabase().storage.from(ATTACHMENTS_BUCKET);
  const path = newAttachmentPath(userId, postId, file);
  const { error } = await bucket.upload(path, file, {
    contentType: classified.mime,
    upsert: false,
  });
  if (error) throw new Error(error.message || "첨부를 올리지 못했습니다.");

  const { data } = bucket.getPublicUrl(path);
  return {
    url: data.publicUrl,
    path,
    name: file.name,
    size: file.size,
    kind: classified.kind,
  };
}

/** 고아 첨부 고정 포맷 로깅 — BACKLOG "고아 첨부 정리"가 로그·Storage 대조로 재구성한다. */
function logOrphan(postId: string, path: string, cause: unknown): void {
  console.error(`[attachments] 고아 첨부 발생: ${postId}/${path}`, cause);
}

/**
 * 영구 삭제된 글의 첨부 폴더를 비운다. **어떤 실패에도 throw 하지 않는다** —
 * 글 행 삭제가 이미 확정된 뒤의 후속 정리라, 실패는 고아 첨부로 정의하고
 * 고정 포맷 로깅만 남긴다(오버뷰 스펙 §2 승인 정책).
 */
export async function deletePostAttachments(
  userId: string,
  postId: string
): Promise<void> {
  const folder = `${userId}/${postId}`;
  try {
    const bucket = getSupabase().storage.from(ATTACHMENTS_BUCKET);
    const { data, error } = await bucket.list(folder);
    if (error) {
      logOrphan(postId, folder, error.message);
      return;
    }
    const paths = (data ?? []).map((entry) => `${folder}/${entry.name}`);
    if (paths.length === 0) return;
    const { error: removeError } = await bucket.remove(paths);
    if (removeError) {
      for (const path of paths) logOrphan(postId, path, removeError.message);
    }
  } catch (cause) {
    logOrphan(postId, folder, cause);
  }
}

/**
 * 에디터 업로드 컨텍스트 — editorProps(handleDrop/handlePaste)는 정적 객체라
 * 컴포넌트 props를 받을 수 없다. 상세 화면(PostDetailClient)이 글 진입 시 설정하고
 * 핸들러가 업로드 시점에 읽는다. 컨텍스트가 없으면 업로드하지 않는다.
 */
export type AttachmentContext = { userId: string; postId: string };

let attachmentContext: AttachmentContext | null = null;

export function setAttachmentContext(ctx: AttachmentContext | null): void {
  attachmentContext = ctx;
}

export function getAttachmentContext(): AttachmentContext | null {
  return attachmentContext;
}
