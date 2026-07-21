import type { Post } from "./store";

/**
 * 사이드바 "글 검색" 필터 (docs/superpowers/specs/2026-07-21-search-design.md).
 *
 * - 쿼리를 trim·소문자화해 **제목 + 본문** substring 매치로 걸러낸다.
 * - 빈 쿼리(또는 공백만)는 필터 없음 — 전체를 그대로 반환한다.
 * - 정렬은 입력 순서를 유지하고, 원본 배열·요소를 변형하지 않는다.
 *
 * 외부 라이브러리·디바운스 없음: 로컬 배열(최대 수백 건) 필터라 충분히 싸다.
 */
export function filterPosts(posts: Post[], query: string): Post[] {
  const q = query.trim().toLowerCase();
  if (!q) return posts;
  return posts.filter(
    (p) =>
      p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q)
  );
}
