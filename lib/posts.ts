import { getSupabase } from "./supabase";
import type { Post } from "./store";
import type { EditorDoc } from "./editor/doc";

/** 게시글이 저장되는 테이블. 구조는 사용자가 만든 그대로 사용한다(FR-009). */
const TABLE = "page";

/** Supabase `public.page` 테이블 행 (구조 변경 금지 — FR-009). */
export type PageRow = {
  id: number | string;
  created_at: string;
  title: string | null;
  content: string | null;
  user_id: string;
  /** 소프트 삭제 시각. null이면 살아 있는 글, 값이 있으면 휴지통에 있는 글. */
  deleted_at: string | null;
  /**
   * 에디터 블록 문서(Tiptap JSON). null이면 아직 블록 편집 이력이 없는 글 —
   * 렌더는 textToDoc(content)으로 즉석 변환한다(dual-read, 손실 제로 계약).
   * 옵셔널인 이유: 컬럼 추가(2026-07-21) 이전의 목·스냅샷과의 호환.
   */
  content_doc?: EditorDoc | null;
  /**
   * 부모 페이지 id(자기참조 FK, on delete set null — ⑤ 페이지 중첩).
   * null이면 루트. 옵셔널인 이유는 content_doc과 같다(컬럼 추가 전 호환).
   */
  parent_id?: number | string | null;
  /** 페이지 이모지 아이콘(⑦, text ≤16자 check). null이면 기본 아이콘(FileText). */
  icon?: string | null;
};

/** 행 → 클라이언트 엔티티. id는 문자열(R2), created_at은 epoch ms(R3). */
export function rowToPost(row: PageRow): Post {
  return {
    id: String(row.id),
    title: row.title ?? "",
    content: row.content ?? "",
    createdAt: Date.parse(row.created_at),
    deletedAt: row.deleted_at ? Date.parse(row.deleted_at) : null,
    contentDoc: row.content_doc ?? null,
    parentId: row.parent_id != null ? String(row.parent_id) : null,
    icon: row.icon ?? null,
  };
}

/** 최신 우선 정렬(원본 불변). */
export function sortPosts(posts: Post[]): Post[] {
  return [...posts].sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * INSERT 페이로드. user_id를 명시하지 않으면 DB 기본값 때문에 고아 행이 생긴다(R4).
 * parentId를 주면 parent_id로 담아 하위 페이지로 생성한다(⑤ — null/생략은 루트).
 */
export function newInsertPayload(
  title: string,
  userId: string,
  parentId?: string | null
) {
  const payload: Record<string, unknown> = {
    title: (title ?? "").trim(),
    content: "",
    user_id: userId,
  };
  if (parentId != null) payload.parent_id = parentId;
  return payload;
}

function fail(error: { message?: string } | null, fallback: string): never {
  throw new Error(error?.message || fallback);
}

/**
 * 내 게시글 전체 조회(최신 우선). 휴지통(소프트 삭제) 글은 제외한다.
 * 사용자 필터를 걸지 않는다 — 소유자 격리는 RLS `page_select_own`이 서버에서 강제한다.
 */
export async function fetchMyPosts(): Promise<Post[]> {
  const { data, error } = await getSupabase()
    .from(TABLE)
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) fail(error, "게시글을 불러오지 못했습니다.");
  return sortPosts(((data ?? []) as PageRow[]).map(rowToPost));
}

/** 휴지통 글 조회(최근에 지운 순). deleted_at이 있는 행만 가져온다. */
export async function fetchTrashedPosts(): Promise<Post[]> {
  const { data, error } = await getSupabase()
    .from(TABLE)
    .select("*")
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });
  if (error) fail(error, "휴지통을 불러오지 못했습니다.");
  return ((data ?? []) as PageRow[])
    .map(rowToPost)
    .sort((a, b) => (b.deletedAt ?? 0) - (a.deletedAt ?? 0));
}

/** 새 게시글 생성. user_id를 명시해야 소유자가 올바르게 기록된다(R4). */
export async function insertPost(
  title: string,
  userId: string,
  parentId?: string | null
): Promise<Post> {
  const { data, error } = await getSupabase()
    .from(TABLE)
    .insert(newInsertPayload(title, userId, parentId))
    .select()
    .single();
  if (error || !data) fail(error, "게시글을 저장하지 못했습니다.");
  return rowToPost(data as PageRow);
}

/**
 * RLS가 거부한 UPDATE/DELETE는 에러가 아니라 **0행**으로 끝난다(A2 — USING 절은 행 필터).
 * `.select()`로 영향받은 행을 돌려받아 0행이면 실패로 던져, 호출부의 롤백·알림 경로가
 * 실제로 동작하게 한다(saveIntroduction과 같은 방식).
 */
function ensureAffected(data: unknown, message: string): void {
  if (!Array.isArray(data) || data.length === 0) throw new Error(message);
}

/** 게시글 삭제. 소유권은 RLS `page_delete_own`이 서버에서 강제한다. */
export async function deletePostById(id: string): Promise<void> {
  const { data, error } = await getSupabase()
    .from(TABLE)
    .delete()
    .eq("id", id)
    .select("id");
  if (error) fail(error, "게시글을 삭제하지 못했습니다.");
  ensureAffected(data, "게시글을 찾지 못해 삭제하지 못했습니다.");
}

/**
 * 소프트 삭제(휴지통으로 이동): deleted_at에 현재 시각을 기록한다.
 * 소유권은 RLS `page_update_own`이 강제한다. A2 계약: RLS가 거부한 UPDATE는
 * 에러가 아니라 0행이므로 `.select("id")`로 영향받은 행을 확인하고 0행이면 throw 한다.
 */
export async function softDeletePost(id: string): Promise<void> {
  const { data, error } = await getSupabase()
    .from(TABLE)
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .select("id");
  if (error) fail(error, "게시글을 삭제하지 못했습니다.");
  ensureAffected(data, "게시글을 찾지 못해 삭제하지 못했습니다.");
}

/**
 * 휴지통에서 복원: deleted_at을 null로 되돌린다.
 * 소유권은 RLS `page_update_own`이 강제하며, A2 계약으로 0행이면 throw 한다.
 */
export async function restorePost(id: string): Promise<void> {
  const { data, error } = await getSupabase()
    .from(TABLE)
    .update({ deleted_at: null })
    .eq("id", id)
    .select("id");
  if (error) fail(error, "게시글을 복원하지 못했습니다.");
  ensureAffected(data, "게시글을 찾지 못해 복원하지 못했습니다.");
}

/** 편집 패치 — 에디터는 content(플레인 projection)와 contentDoc(블록 JSON)을 함께 보낸다. */
export type PostPatch = Partial<
  Pick<Post, "title" | "content" | "contentDoc" | "parentId" | "icon">
>;

/**
 * 클라이언트 필드명 → DB 컬럼명 매핑(contentDoc → content_doc, parentId → parent_id).
 * 나머지는 이름이 같다. null도 유효한 값(parent_id null = 루트 승격)이라 in 연산자로 판별한다.
 */
function toRowPatch(patch: PostPatch): Record<string, unknown> {
  const { contentDoc, parentId, ...rest } = patch;
  const row: Record<string, unknown> = { ...rest };
  if ("contentDoc" in patch) row.content_doc = contentDoc;
  if ("parentId" in patch) row.parent_id = parentId;
  return row;
}

/** 게시글 수정. 소유권은 RLS `page_update_own`이 서버에서 강제한다. */
export async function updatePostFields(
  id: string,
  patch: PostPatch
): Promise<void> {
  const { data, error } = await getSupabase()
    .from(TABLE)
    .update(toRowPatch(patch))
    .eq("id", id)
    .select("id");
  if (error) fail(error, "게시글을 저장하지 못했습니다.");
  ensureAffected(data, "게시글을 찾지 못해 저장하지 못했습니다.");
}
