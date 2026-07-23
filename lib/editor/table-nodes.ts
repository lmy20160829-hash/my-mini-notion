import type { AnyExtension } from "@tiptap/react";

/**
 * 표 노드 확장 — **Phase T 전용 소유 파일**. Phase 0은 결합부에 자리만 확보하려고
 * 빈 배열을 export한다. Phase T가 Table/TableRow/TableHeader/TableCell을 채운다.
 */
export const TABLE_NODES: AnyExtension[] = [];
