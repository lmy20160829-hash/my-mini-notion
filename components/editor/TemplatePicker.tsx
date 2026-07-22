"use client";

import { useEffect, useState } from "react";
import type { Editor } from "@tiptap/react";
import type { EditorDoc } from "@/lib/editor/doc";
import {
  TEMPLATES,
  isBlankDoc,
  isTemplateAvailable,
  type PageTemplate,
} from "@/lib/editor/templates";
import { Button } from "@/components/ui/Button";

/**
 * ⑨ 페이지 템플릿 행(§5.11, §6.8) — 빈 글 상세 진입 시 본문 위에 뜨는
 * "빈 페이지 / 회의록 / 할 일 / 메모" 버튼 줄(Button secondary).
 * PostEditor 의 EditorContent 형제로 렌더된다(결합부 불변).
 *
 * - 노출: 진입 시점 문서가 빈 글(isBlankDoc)일 때만. 선택하거나 타이핑을
 *   시작하면 사라진다(노션 관행).
 * - 삽입: setContent(emitUpdate) → PostEditor onUpdate → buildEditPatch —
 *   dual-write 저장 경로(§5.2)를 그대로 탄다.
 * - 스키마 가드: 템플릿 노드가 스키마에 없으면(wt2 미머지) 그 템플릿을 숨기고,
 *   보일 템플릿이 하나도 없으면 행 자체를 숨긴다.
 */
export function TemplatePicker({
  editor,
  initialDoc,
}: {
  editor: Editor | null;
  initialDoc: EditorDoc;
}) {
  // 진입 시점 판정 — remount(key=post.id) 기준으로 한 번만 계산한다.
  const [blankAtMount] = useState(() => isBlankDoc(initialDoc));
  const [hidden, setHidden] = useState(false);

  // 타이핑을 시작해도 사라짐 — 문서가 더는 빈 글이 아니면 숨긴다.
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const onUpdate = () => {
      if (!isBlankDoc(editor.getJSON() as EditorDoc)) setHidden(true);
    };
    editor.on("update", onUpdate);
    return () => {
      editor.off("update", onUpdate);
    };
  }, [editor]);

  if (!editor || !blankAtMount || hidden) return null;

  const available = TEMPLATES.filter((t) => isTemplateAvailable(editor, t));
  if (available.length === 0) return null;

  const choose = (template?: PageTemplate) => {
    if (template) {
      editor
        .chain()
        .setContent(template.build(), { emitUpdate: true })
        .focus("end")
        .run();
    }
    setHidden(true);
  };

  return (
    <div className="tpl-row" role="group" aria-label="템플릿으로 시작">
      <Button variant="secondary" onClick={() => choose()}>
        빈 페이지
      </Button>
      {available.map((template) => (
        <Button
          key={template.id}
          variant="secondary"
          onClick={() => choose(template)}
        >
          {template.label}
        </Button>
      ))}
    </div>
  );
}
