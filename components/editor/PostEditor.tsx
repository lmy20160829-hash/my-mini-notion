"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import HardBreak from "@tiptap/extension-hard-break";
import { Placeholder, UndoRedo } from "@tiptap/extensions";
import { docToText, type EditorDoc } from "@/lib/editor/doc";
import { MARKS } from "@/lib/editor/marks";
import { NODES } from "@/lib/editor/nodes";
import { MEDIA_NODES, mediaEditorProps } from "@/lib/editor/media-nodes";
import { EditorDragHandle } from "@/components/editor/DragHandle";
import { FormatToolbar } from "@/components/editor/FormatToolbar";
import { SlashMenu } from "@/components/editor/SlashMenu";
import { TemplatePicker } from "@/components/editor/TemplatePicker";

/**
 * 저장 페이로드 계약(dual-write): 블록 JSON과 함께 플레인 projection을 항상 보낸다 —
 * content는 사이드바 검색(filterPosts)·폴백 렌더·docToText(content_doc)===content
 * 불변식이 의존한다(스펙 2026-07-21-editor-sprint-overview.md §3).
 */
export function buildEditPatch(doc: EditorDoc) {
  return { content: docToText(doc), contentDoc: doc };
}

/**
 * 본문 에디터(Tiptap v3, P1 — 문단 전용).
 * 서식·블록 타입은 워크트리 단계(①~④)에서 확장한다. 부모는 글이 바뀔 때
 * `key={post.id}`로 remount 해 문서를 갈아끼운다(§4.3).
 */
export function PostEditor({
  initialDoc,
  placeholder,
  onDocChange,
}: {
  initialDoc: EditorDoc;
  placeholder: string;
  onDocChange: (doc: EditorDoc) => void;
}) {
  const editor = useEditor({
    // SSR/프리렌더 하이드레이션 불일치 방지 — 클라이언트 마운트 후 렌더.
    immediatelyRender: false,
    // 결합부 — 워크트리는 이 배열이 아니라 각자의 소유 파일(marks/nodes/media-nodes)에
    // 확장을 추가한다(오버뷰 스펙 §파일 소유권). 이 블록은 P2 동안 수정 금지.
    extensions: [
      Document,
      Paragraph,
      Text,
      HardBreak,
      UndoRedo,
      Placeholder.configure({ placeholder }),
      ...MARKS,
      ...NODES,
      ...MEDIA_NODES,
    ],
    content: initialDoc,
    editorProps: {
      // 기존 textarea가 쓰던 .detail-content 스타일을 그대로 입는다(§4.3).
      attributes: { class: "detail-content", "aria-label": "본문" },
      // wt3의 handleDrop/handlePaste 연결점(§5.13).
      ...mediaEditorProps,
    },
    onUpdate: ({ editor: e }) => onDocChange(e.getJSON() as EditorDoc),
  });

  // wt1·wt2 UI는 EditorContent 형제로만 결합한다(오버뷰 스펙 §파일 소유권 — 결합부 불변).
  return (
    <>
      <FormatToolbar editor={editor} />
      <SlashMenu editor={editor} />
      <TemplatePicker editor={editor} initialDoc={initialDoc} />
      <EditorContent editor={editor} />
      {/* 드래그 핸들(wt2 ③, §2.12) — 확장 플러그인은 컴포넌트가 스스로 등록·해제한다. */}
      <EditorDragHandle editor={editor} />
    </>
  );
}
