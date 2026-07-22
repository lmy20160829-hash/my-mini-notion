import type { AnyExtension } from "@tiptap/react";

/**
 * 서식 마크 확장 등록 — **wt1 전용 파일** (오버뷰 스펙 §파일 소유권).
 * wt1이 굵게·기울임·밑줄·취소선·인라인 코드·링크 확장을 여기에 추가한다.
 * PostEditor가 [...MARKS] 로 결합하므로 결합부 수정 없이 확장된다.
 */
export const MARKS: AnyExtension[] = [];
