"use client";

import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { Download, FileText } from "lucide-react";
import { formatBytes } from "@/lib/attachments";

/**
 * fileBlock 노드 뷰(⑥⑧, §2.13) — 카드형: FileText 타일 + 파일명 + 크기(KB/MB) +
 * 다운로드 링크. `.post-card`(§2.7.9) 토큰 계열의 `.attach-file` 조각을 입는다.
 */
export function FileBlockView({ node }: NodeViewProps) {
  const url = String(node.attrs.url ?? "");
  const name = String(node.attrs.name ?? "");
  const size = Number(node.attrs.size ?? 0);

  return (
    <NodeViewWrapper className="attach-file" data-drag-handle>
      <span className="attach-file__tile" aria-hidden="true">
        <FileText size={18} />
      </span>
      <span className="attach-file__body">
        <span className="attach-file__name">{name || "파일"}</span>
        <span className="attach-file__size">{formatBytes(size)}</span>
      </span>
      <a
        className="attach-file__download"
        href={url}
        download={name || true}
        target="_blank"
        rel="noreferrer"
        title="다운로드"
        aria-label="다운로드"
        // 링크 클릭이 노드 선택으로 삼켜지지 않게 한다.
        onMouseDown={(e) => e.stopPropagation()}
      >
        <Download size={16} />
      </a>
    </NodeViewWrapper>
  );
}
