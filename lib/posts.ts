import type { Post } from "./store";

/** Supabase `public.page` 테이블 행 (구조 변경 금지 — FR-009). */
export type PageRow = {
  id: number | string;
  created_at: string;
  title: string | null;
  content: string | null;
  user_id: string;
};

/** 행 → 클라이언트 엔티티. id는 문자열(R2), created_at은 epoch ms(R3). */
export function rowToPost(row: PageRow): Post {
  return {
    id: String(row.id),
    title: row.title ?? "",
    content: row.content ?? "",
    createdAt: Date.parse(row.created_at),
  };
}

/** 최신 우선 정렬(원본 불변). */
export function sortPosts(posts: Post[]): Post[] {
  return [...posts].sort((a, b) => b.createdAt - a.createdAt);
}

/** INSERT 페이로드. user_id를 명시하지 않으면 DB 기본값 때문에 고아 행이 생긴다(R4). */
export function newInsertPayload(title: string, userId: string) {
  return {
    title: (title ?? "").trim(),
    content: "",
    user_id: userId,
  };
}
