import type { AnyExtension } from "@tiptap/react";

/**
 * 블록 노드 확장 등록 — **wt2 전용 파일** (오버뷰 스펙 §파일 소유권).
 * wt2가 lib/editor/blocks.ts 계약에 선언된 노드(heading·목록·인용·콜아웃·토글·
 * 구분선 — 이미지·파일 제외)를 여기에 추가한다.
 */
export const NODES: AnyExtension[] = [];
