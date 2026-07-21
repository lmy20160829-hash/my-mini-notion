"use client";

import { useEffect, useState } from "react";
import { FileText, RotateCcw, Trash2 } from "lucide-react";
import { deletePostById, fetchTrashedPosts, restorePost } from "@/lib/posts";
import { formatDate, useApp, type Post } from "@/lib/store";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

function errorMessage(e: unknown, fallback: string): string {
  return e instanceof Error && e.message ? e.message : fallback;
}

/**
 * 휴지통 `/trash` (§4.5) — 소프트 삭제된 글의 목록·복원·영구 삭제.
 * 휴지통 목록은 스토어에 넣지 않고 화면 로컬 상태로만 관리한다(진입 시 fetch).
 * 복원 성공 시에만 스토어(`restoreToList`)에 되넣어 목록·사이드바가 함께 갱신된다.
 */
export default function TrashPage() {
  const app = useApp();
  // null = 로딩 전(아직 그리지 않음 — §3.5 셸 가드와 같은 관행).
  const [trashed, setTrashed] = useState<Post[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchTrashedPosts()
      .then((posts) => {
        if (!cancelled) setTrashed(posts);
      })
      .catch((e) => {
        if (cancelled) return;
        setTrashed([]);
        window.alert(errorMessage(e, "휴지통을 불러오지 못했습니다."));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!trashed) return null;

  const removeLocal = (id: string) =>
    setTrashed((list) => (list ?? []).filter((p) => p.id !== id));

  const handleRestore = async (post: Post) => {
    try {
      // A2 계약: RLS 거부는 0행으로 오고 restorePost가 throw로 승격한다.
      await restorePost(post.id);
      removeLocal(post.id);
      app.restoreToList(post);
    } catch (e) {
      window.alert(errorMessage(e, "게시글을 복원하지 못했습니다."));
    }
  };

  const handleHardDelete = async (post: Post) => {
    if (!window.confirm("이 글을 영구 삭제할까요? 영구 삭제하면 되돌릴 수 없어요.")) {
      return;
    }
    try {
      await deletePostById(post.id);
      removeLocal(post.id);
    } catch (e) {
      window.alert(errorMessage(e, "게시글을 삭제하지 못했습니다."));
    }
  };

  return (
    <div className="list-page">
      <h1 className="list-page__title">휴지통</h1>
      <p className="list-page__subtitle">
        삭제한 글을 복원하거나 영구적으로 지울 수 있어요.
      </p>

      {trashed.length > 0 ? (
        <>
          <div className="list-head">
            <span className="list-head__label">삭제된 글</span>
            <Badge>{trashed.length}</Badge>
          </div>
          <div className="post-list">
            {trashed.map((post) => (
              // 상세로의 이동이 없는 정적 카드 — 커서 기본, 호버 부상 없음(§4.5).
              <div key={post.id} className="post-card post-card--trash">
                <span className="post-card__tile">
                  <FileText size={18} />
                </span>
                <span className="post-card__body">
                  <span className="post-card__title">
                    {post.title.trim() || "제목 없음"}
                  </span>
                  <br />
                  <span className="post-card__preview">
                    {post.content.replace(/\s+/g, " ").trim().slice(0, 90) ||
                      "내용 없음"}
                  </span>
                </span>
                <span className="post-card__date">
                  {formatDate(post.deletedAt ?? post.createdAt)} 삭제
                </span>
                <div className="post-card__actions">
                  <Button
                    variant="secondary"
                    iconLeft={RotateCcw}
                    onClick={() => void handleRestore(post)}
                  >
                    복원
                  </Button>
                  <button
                    type="button"
                    className="detail-delete-btn"
                    onClick={() => void handleHardDelete(post)}
                  >
                    <Trash2 size={16} />
                    영구 삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="empty-state">
          <span className="empty-state__tile">
            <Trash2 size={40} />
          </span>
          <div className="empty-state__title">휴지통이 비어 있어요.</div>
          <div className="empty-state__desc">
            글을 삭제하면 여기로 옮겨지고, 언제든 복원할 수 있어요.
          </div>
        </div>
      )}
    </div>
  );
}
