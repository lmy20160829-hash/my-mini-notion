import {
  Extension,
  Node,
  ReactNodeViewRenderer,
  type AnyExtension,
} from "@tiptap/react";
import Image from "@tiptap/extension-image";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { EditorProps, EditorView } from "@tiptap/pm/view";
import {
  getAttachmentContext,
  uploadAttachment,
  validateAttachment,
} from "@/lib/attachments";
import { FileBlockView } from "@/components/editor/nodes-media/FileBlockView";

/**
 * 미디어 노드·업로드 진입점 — **wt3 전용 파일** (오버뷰 스펙 §파일 소유권).
 * image(사전 설치 확장)·fileBlock(커스텀) 노드와 드래그 앤 드롭·클립보드 붙여넣기
 * 업로드 핸들러(handleDrop/handlePaste)를 제공한다. PostEditor가 editorProps에
 * spread 하므로 결합부 수정 없이 확장된다(§2.13·§5.13).
 */

/** 본문 이미지(⑥): 사전 설치 Image 확장 + `.attach-img`(max-width 100%, radius-lg). */
const AttachImage = Image.configure({
  HTMLAttributes: { class: "attach-img" },
  allowBase64: false,
});

/**
 * 파일 블록(⑧): attrs url·name·size — 카드형 노드 뷰(FileBlockView, §2.13).
 * 블록 레지스트리 계약(lib/editor/blocks.ts)의 `fileBlock` 이름을 그대로 구현한다.
 */
export const FileBlock = Node.create({
  name: "fileBlock",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      url: { default: "" },
      name: { default: "" },
      size: { default: 0 },
    };
  },

  parseHTML() {
    return [
      {
        tag: "a[data-file-block]",
        getAttrs: (el) => ({
          url: el.getAttribute("href") ?? "",
          name: el.getAttribute("data-name") ?? "",
          size: Number(el.getAttribute("data-size")) || 0,
        }),
      },
    ];
  },

  renderHTML({ node }) {
    // 노드 뷰가 없는 환경(직렬화·복사)용 최소 마크업 — 다운로드 가능한 링크.
    return [
      "a",
      {
        "data-file-block": "",
        "data-name": String(node.attrs.name ?? ""),
        "data-size": String(node.attrs.size ?? 0),
        href: String(node.attrs.url ?? ""),
        class: "attach-file",
      },
      String(node.attrs.name || "파일"),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(FileBlockView);
  },
});

/* ------------------------------------------------------------------
 * 업로드 중 표시(§5.13): 문서를 건드리지 않는 위젯 데코레이션.
 * 실패 시 "블록 미삽입"을 지키기 위해 업로드가 끝나기 전에는 노드를 넣지 않고,
 * 자리에 `.attach-uploading`(§2.7.15 스켈레톤 shimmer 재사용)만 띄운다.
 * ------------------------------------------------------------------ */

const uploadPlaceholderKey = new PluginKey<DecorationSet>(
  "attachUploadPlaceholder"
);

type PlaceholderAction =
  | { add: { id: object; pos: number } }
  | { remove: { id: object } };

const UploadPlaceholder = Extension.create({
  name: "attachUploadPlaceholder",
  addProseMirrorPlugins() {
    return [
      new Plugin<DecorationSet>({
        key: uploadPlaceholderKey,
        state: {
          init: () => DecorationSet.empty,
          apply(tr, set) {
            set = set.map(tr.mapping, tr.doc);
            const action = tr.getMeta(uploadPlaceholderKey) as
              | PlaceholderAction
              | undefined;
            if (action && "add" in action) {
              const el = document.createElement("div");
              el.className = "attach-uploading";
              set = set.add(tr.doc, [
                Decoration.widget(action.add.pos, el, { id: action.add.id }),
              ]);
            } else if (action && "remove" in action) {
              set = set.remove(
                set.find(
                  undefined,
                  undefined,
                  (spec) => spec.id === action.remove.id
                )
              );
            }
            return set;
          },
        },
        props: {
          decorations(state) {
            return this.getState(state);
          },
        },
      }),
    ];
  },
});

function addPlaceholder(view: EditorView, id: object, pos: number): void {
  view.dispatch(view.state.tr.setMeta(uploadPlaceholderKey, { add: { id, pos } }));
}

function removePlaceholder(view: EditorView, id: object): void {
  view.dispatch(view.state.tr.setMeta(uploadPlaceholderKey, { remove: { id } }));
}

/** 위젯의 현재 위치(문서 변경에 따라 매핑된 값). 이미 제거됐으면 null. */
function findPlaceholderPos(view: EditorView, id: object): number | null {
  const set = uploadPlaceholderKey.getState(view.state);
  const found = set?.find(undefined, undefined, (spec) => spec.id === id) ?? [];
  return found.length > 0 ? found[0].from : null;
}

/**
 * 파일들을 pos 위치에 순서대로 업로드·삽입한다(§5.13).
 * - 검증 실패: `window.alert` 후 그 파일만 건너뛴다(블록 미삽입).
 * - 업로드 중: 위젯 자리표시자(문서 무변경 — 실패 시 흔적이 남지 않는다).
 * - 성공: image 또는 fileBlock 노드를 자리표시자 위치에 삽입.
 */
async function insertFilesAt(
  view: EditorView,
  files: File[],
  pos: number
): Promise<void> {
  for (const file of files) {
    const invalid = validateAttachment(file);
    if (invalid) {
      window.alert(invalid);
      continue;
    }
    const context = getAttachmentContext();
    if (!context) {
      window.alert("첨부를 올릴 수 없습니다. 글을 다시 연 뒤 시도해 주세요.");
      continue;
    }
    const id = {};
    addPlaceholder(view, id, pos);
    try {
      const uploaded = await uploadAttachment(
        context.userId,
        context.postId,
        file
      );
      const at = findPlaceholderPos(view, id) ?? view.state.selection.from;
      const node =
        uploaded.kind === "image"
          ? view.state.schema.nodes.image.create({
              src: uploaded.url,
              alt: uploaded.name,
            })
          : view.state.schema.nodes.fileBlock.create({
              url: uploaded.url,
              name: uploaded.name,
              size: uploaded.size,
            });
      view.dispatch(
        view.state.tr
          .replaceWith(at, at, node)
          .setMeta(uploadPlaceholderKey, { remove: { id } })
      );
    } catch (e) {
      removePlaceholder(view, id);
      window.alert(
        e instanceof Error && e.message ? e.message : "첨부를 올리지 못했습니다."
      );
    }
  }
}

/**
 * 슬래시 메뉴 연결점(wt1의 이미지/파일 항목 — P3 머지에서 결선):
 * 파일 선택 다이얼로그를 열고, 고른 파일을 현재 선택 위치에 업로드·삽입한다.
 */
export function openAttachmentPicker(
  view: EditorView,
  accept?: string
): void {
  const input = document.createElement("input");
  input.type = "file";
  if (accept) input.accept = accept;
  input.onchange = () => {
    const files = Array.from(input.files ?? []);
    if (files.length > 0) {
      void insertFilesAt(view, files, view.state.selection.from);
    }
  };
  input.click();
}

export const MEDIA_NODES: AnyExtension[] = [
  AttachImage,
  FileBlock,
  UploadPlaceholder,
];

export const mediaEditorProps: Partial<EditorProps> = {
  // 파일 드롭: 좌표의 문서 위치에 업로드·삽입. 에디터 내부 노드 이동(moved)은 통과.
  handleDrop(view, event, _slice, moved) {
    if (moved) return false;
    const files = Array.from(event.dataTransfer?.files ?? []);
    if (files.length === 0) return false;
    event.preventDefault();
    const coords = view.posAtCoords({ left: event.clientX, top: event.clientY });
    void insertFilesAt(view, files, coords?.pos ?? view.state.selection.from);
    return true;
  },
  // 클립보드 파일(스크린샷 등): 현재 선택 위치에 업로드·삽입. 텍스트 붙여넣기는 통과.
  handlePaste(view, event) {
    const files = Array.from(event.clipboardData?.files ?? []);
    if (files.length === 0) return false;
    event.preventDefault();
    void insertFilesAt(view, files, view.state.selection.from);
    return true;
  },
};
