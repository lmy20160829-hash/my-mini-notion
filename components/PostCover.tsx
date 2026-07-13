"use client";

import { useEffect, useState } from "react";
import { ImageOff } from "lucide-react";

// 글 상세 상단 커버 이미지. 부모는 <PostCover key={post.id} />로 렌더해
// 글이 바뀔 때 remount(=새 랜덤 이미지)되게 한다. 장식 요소이므로 aria-hidden.

const COVER_ENDPOINT = "https://cataas.com/cat/cute";
const COVER_TIMEOUT_MS = 10000; // 오류 없이 지연 시 실패로 전환하는 상한(FR-009).

// 매 마운트 유니크한 캐시버스트 토큰(브라우저 HTTP 캐시 재사용 방지 → 열 때마다 새 랜덤).
// lib/store의 uid 방식과 동일 스타일.
function buildSrc(): string {
  const token = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  return `${COVER_ENDPOINT}?_cb=${token}`;
}

type Status = "loading" | "loaded" | "error";

export function PostCover() {
  const [status, setStatus] = useState<Status>("loading");
  // 마운트 시 1회 계산 → 재렌더(제목/본문 입력)에도 src 안정(깜빡임 방지).
  const [src] = useState(buildSrc);

  // loading에서만 전이(최종 상태 loaded/error는 늦은 이벤트로 덮이지 않음).
  const settle = (next: "loaded" | "error") =>
    setStatus((s) => (s === "loading" ? next : s));

  // 오류 없이 지연되는 경우 상한 타임아웃으로 실패 전환. 언마운트/확정 시 타이머 정리.
  useEffect(() => {
    const timer = setTimeout(() => settle("error"), COVER_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="detail-cover" aria-hidden="true">
      <img
        className="detail-cover__img"
        data-cover={status === "loaded" ? "image" : undefined}
        src={src}
        alt=""
        onLoad={() => settle("loaded")}
        onError={() => settle("error")}
      />
      {status === "loading" && (
        <div className="detail-cover__skeleton" data-cover="skeleton" />
      )}
      {status === "error" && (
        <div className="detail-cover__fallback" data-cover="fallback">
          <ImageOff size={28} />
        </div>
      )}
    </div>
  );
}
