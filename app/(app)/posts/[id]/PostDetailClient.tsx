"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Calendar, ChevronRight, Trash2 } from "lucide-react";
import { formatDate, useApp } from "@/lib/store";
import { textToDoc } from "@/lib/editor/doc";
import { IconButton } from "@/components/ui/IconButton";
import { CharCount } from "@/components/CharCount";
import { PostCover } from "@/components/PostCover";
import { PostEditor, buildEditPatch } from "@/components/editor/PostEditor";

export function PostDetailClient() {
  const app = useApp();
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const post = app.posts.find((p) => p.id === id);

  // Deleted or unknown post → back to the list.
  useEffect(() => {
    if (app.loaded && !post) router.replace("/");
  }, [app.loaded, post, router]);

  if (!post) return null;

  const handleDelete = () => {
    // 소프트 삭제 — 휴지통으로 이동하며, /trash 화면에서 복원할 수 있다(§5.3).
    if (window.confirm("이 글을 휴지통으로 옮길까요? 휴지통에서 복원할 수 있어요.")) {
      app.deletePost(post.id);
      router.push("/");
    }
  };

  return (
    <div className="detail-page">
      <div className="detail-breadcrumb">
        <IconButton
          icon={ArrowLeft}
          title="뒤로"
          onClick={() => router.push("/")}
        />
        <button
          type="button"
          className="detail-breadcrumb__root"
          onClick={() => router.push("/")}
        >
          내 업무
        </button>
        <span className="detail-breadcrumb__sep">
          <ChevronRight size={14} />
        </span>
        <span className="detail-breadcrumb__current">
          {post.title.trim() || "제목 없음"}
        </span>
        <div className="detail-breadcrumb__spacer" />
        <button
          type="button"
          className="detail-delete-btn"
          onClick={handleDelete}
        >
          <Trash2 size={16} />
          삭제
        </button>
      </div>

      <PostCover key={post.id} />

      <input
        className="detail-title"
        value={post.title}
        onChange={(e) => app.updatePost(post.id, { title: e.target.value })}
        placeholder="제목 없음"
      />
      <div className="detail-meta">
        <Calendar size={14} />
        <span>{formatDate(post.createdAt)} 작성</span>
        <span className="detail-meta__dot" />
        <span>자동 저장됨</span>
      </div>
      {/* dual-read: 블록 문서가 있으면 그대로, 없으면 플레인 텍스트를 즉석 변환(§5.2).
          글이 바뀌면 key 로 remount 해 문서를 갈아끼운다. */}
      <PostEditor
        key={post.id}
        initialDoc={post.contentDoc ?? textToDoc(post.content)}
        placeholder="내용을 입력하세요. 떠오르는 생각, 할 일, 메모를 자유롭게 기록해 보세요."
        onDocChange={(doc) => app.updatePost(post.id, buildEditPatch(doc))}
      />
      <CharCount text={post.content} />
    </div>
  );
}
