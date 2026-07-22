import type { AnyExtension } from "@tiptap/react";
import type { EditorProps } from "@tiptap/pm/view";

/**
 * 미디어 노드·업로드 진입점 — **wt3 전용 파일** (오버뷰 스펙 §파일 소유권).
 * wt3이 image·fileBlock 노드를 MEDIA_NODES에, 드래그 앤 드롭·클립보드 붙여넣기
 * 업로드 핸들러(handleDrop/handlePaste)를 mediaEditorProps에 추가한다.
 * PostEditor가 editorProps에 spread 하므로 결합부 수정 없이 확장된다.
 */
export const MEDIA_NODES: AnyExtension[] = [];

export const mediaEditorProps: Partial<EditorProps> = {};
