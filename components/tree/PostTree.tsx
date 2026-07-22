"use client";

import { ChevronRight, FileText, Plus } from "lucide-react";
import type { Post } from "@/lib/store";
import { buildTree, type TreeNode } from "@/lib/tree";

/**
 * 사이드바 "내 글" 페이지 트리(⑤, §4.7). 계층 계산은 lib/tree.ts(buildTree)가,
 * 접힘 상태·이동·생성은 부모(AppShell → 스토어)가 담당하는 순수 표시 컴포넌트다.
 * 행 구성: 접기 삼각형(자식 있는 항목만) + 글 항목(.sidebar-item 재사용) + hover `+`.
 */
type PostTreeProps = {
  posts: Post[];
  /** 현재 열려 있는 글 id(경로 기준). 없으면 null. */
  activeId: string | null;
  /** 접어 둔 글 id 목록(스토어 §5.5 treeCollapsed). */
  collapsedIds: string[];
  onOpen: (id: string) => void;
  /** collapsed = 요청하는 목표 상태(true = 접기). */
  onToggle: (id: string, collapsed: boolean) => void;
  onCreateChild: (parentId: string) => void;
};

/** 들여쓰기 폭(px/단계) — §4.7. */
const INDENT_PER_DEPTH = 12;

export function PostTree({
  posts,
  activeId,
  collapsedIds,
  onOpen,
  onToggle,
  onCreateChild,
}: PostTreeProps) {
  const renderNode = (node: TreeNode<Post>, depth: number) => {
    const { post, children } = node;
    const label = post.title.trim() || "제목 없음";
    const collapsed = collapsedIds.includes(post.id);
    return (
      <div key={post.id}>
        <div
          className="tree-row"
          style={depth > 0 ? { paddingLeft: depth * INDENT_PER_DEPTH } : undefined}
        >
          {children.length > 0 ? (
            <button
              type="button"
              className={`tree-toggle${collapsed ? "" : " is-open"}`}
              aria-expanded={!collapsed}
              aria-label={collapsed ? "하위 페이지 펼치기" : "하위 페이지 접기"}
              onClick={() => onToggle(post.id, !collapsed)}
            >
              <ChevronRight size={12} />
            </button>
          ) : (
            // 삼각형 자리 유지 — 자식 없는 항목도 같은 열에서 시작한다.
            <span className="tree-toggle tree-toggle--spacer" aria-hidden="true" />
          )}
          <button
            type="button"
            className={`sidebar-item${activeId === post.id ? " is-active" : ""}`}
            title={label}
            onClick={() => onOpen(post.id)}
          >
            <span className="sidebar-item__icon">
              <FileText size={16} />
            </span>
            <span className="sidebar-item__label">{label}</span>
          </button>
          <button
            type="button"
            className="tree-add"
            title="하위 페이지 추가"
            aria-label="하위 페이지 추가"
            onClick={() => onCreateChild(post.id)}
          >
            <Plus size={14} />
          </button>
        </div>
        {!collapsed && children.map((child) => renderNode(child, depth + 1))}
      </div>
    );
  };

  return <>{buildTree(posts).map((node) => renderNode(node, 0))}</>;
}
