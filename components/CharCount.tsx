"use client";

import { countGraphemes } from "@/lib/charCount";

// Contract: specs/001-char-counter/contracts/char-count-component.md
// 내용 편집 영역 우측 하단에 현재 글자 수를 표시하는 프레젠테이션 컴포넌트.
// props 전용 — 내부 상태·스토어·라우터 의존 없음. text가 바뀌면 부모 리렌더로 즉시 갱신.
export function CharCount({ text }: { text: string }) {
  return <div className="detail-charcount">{`${countGraphemes(text)}자`}</div>;
}
