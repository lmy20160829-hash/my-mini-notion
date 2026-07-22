/**
 * 페이지 중첩(⑤)의 표시 계층 순수 로직 — 사이드바 트리·브레드크럼 조상 체인.
 * (스펙 docs/superpowers/specs/2026-07-21-editor-wt3-design.md)
 *
 * 데이터는 평면(page.parent_id)이고 트리는 **표시 계층일 뿐**이다. 그래서 이 모듈은
 * 어떤 입력에도 안전해야 한다:
 * - 고아(부모가 목록에 없음 — 부모가 휴지통에 있으면 살아 있는 목록에서 빠진다) → 루트 승격.
 * - 자기참조·순환(비정상 데이터) → 무한 루프 없이 전체 글을 정확히 한 번씩 담는다.
 *
 * Post 전체 타입에 의존하지 않는 구조 타입(TreeSource)만 요구해 jsdom 없이 테스트한다.
 */

export type TreeSource = { id: string; parentId: string | null };

export type TreeNode<T extends TreeSource = TreeSource> = {
  post: T;
  children: TreeNode<T>[];
};

/** parentId → 자식 목록(입력 순서 유지). 자기 자신을 부모로 가리키는 행은 제외한다. */
function childrenByParent<T extends TreeSource>(posts: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const post of posts) {
    if (!post.parentId || post.parentId === post.id) continue;
    const siblings = map.get(post.parentId);
    if (siblings) siblings.push(post);
    else map.set(post.parentId, [post]);
  }
  return map;
}

/**
 * 평면 글 목록 → 사이드바 트리. 루트·자식 모두 입력 순서(최신 우선)를 유지한다.
 * 부모가 목록에 없는 글(고아·휴지통 부모)은 루트로 승격한다. 순환에 갇힌 글은
 * 어느 루트에서도 닿지 않으므로, 남은 글을 입력 순서대로 루트로 승격해 전부 담는다.
 */
export function buildTree<T extends TreeSource>(posts: T[]): TreeNode<T>[] {
  const byId = new Map(posts.map((p) => [p.id, p]));
  const children = childrenByParent(posts);
  const visited = new Set<string>();

  const toNode = (post: T): TreeNode<T> => {
    visited.add(post.id);
    const node: TreeNode<T> = { post, children: [] };
    for (const child of children.get(post.id) ?? []) {
      if (visited.has(child.id)) continue; // 순환 가드
      node.children.push(toNode(child));
    }
    return node;
  };

  const roots: TreeNode<T>[] = [];
  for (const post of posts) {
    const isRoot =
      !post.parentId || post.parentId === post.id || !byId.has(post.parentId);
    if (isRoot && !visited.has(post.id)) roots.push(toNode(post));
  }
  // 순환에 갇혀 아직 방문하지 못한 글 — 입력 순서대로 루트로 승격.
  for (const post of posts) {
    if (!visited.has(post.id)) roots.push(toNode(post));
  }
  return roots;
}

/**
 * id의 모든 자손(자식·손자·…) id 집합. 자기 자신은 포함하지 않는다.
 * 순환 방지(앱 레벨)의 축 — 부모 후보에서 자기·자손을 제외할 때 쓴다.
 */
export function descendantIds(posts: TreeSource[], id: string): Set<string> {
  const children = childrenByParent(posts);
  const result = new Set<string>();
  const queue = [...(children.get(id) ?? [])];
  while (queue.length > 0) {
    const next = queue.shift()!;
    if (next.id === id || result.has(next.id)) continue;
    result.add(next.id);
    queue.push(...(children.get(next.id) ?? []));
  }
  return result;
}

/**
 * id의 조상 체인을 [루트, …, 직계 부모] 순서로 돌려준다(자기 자신 제외).
 * 부모가 목록에 없으면(휴지통·삭제) 거기서 끊고, 순환은 방문 집합으로 종결한다.
 */
export function ancestorChain<T extends TreeSource>(posts: T[], id: string): T[] {
  const byId = new Map(posts.map((p) => [p.id, p]));
  const seen = new Set<string>([id]);
  const chain: T[] = [];
  let current = byId.get(id);
  while (current && current.parentId && !seen.has(current.parentId)) {
    const parent = byId.get(current.parentId);
    if (!parent) break;
    seen.add(parent.id);
    chain.unshift(parent);
    current = parent;
  }
  return chain;
}
