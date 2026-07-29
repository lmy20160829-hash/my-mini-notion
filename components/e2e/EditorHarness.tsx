"use client";

import { ArrowLeft, Calendar, ChevronRight, Trash2 } from "lucide-react";
import { CharCount } from "@/components/CharCount";
import { PostEditor } from "@/components/editor/PostEditor";
import { PageIconButton } from "@/components/icon/PageIconButton";
import { IconButton } from "@/components/ui/IconButton";

/**
 * E2E 스모크 전용 하니스. 프로덕션 번들에는 들어가지 않는다
 * (next.config.ts의 pageExtensions가 진입 페이지를 빌드에서 제외 → 이 모듈은 importer가 없다).
 *
 * 원칙(스펙 §4.1.1): **하니스는 .detail-page의 실제 자식 구성을 따른다.**
 * 형제 요소를 생략하면 레이아웃 컨텍스트 버그의 사각지대가 생긴다 —
 * .top-toolbar-sticky는 `position: sticky; top: 0`(globals.css:1095)이라
 * 앞선 형제들의 높이가 스티키 동작에 직접 관여하고, .detail-cover 하나만 해도 200px다.
 *
 * 스토어·라우터·네트워크에 의존하는 자식은 **같은 클래스의 정적 대역**으로 둔다.
 * 레이아웃에 기여하는 것은 박스이지 동작이 아니고, 하니스의 "의존 0" 성질을 잃으면 안 된다.
 */

/** 번들 유출 검증(scripts/verify-harness-excluded.mjs)이 찾는 마커. */
const HARNESS_MARKER = "__MN_E2E_HARNESS__";

/** 날짜·본문은 고정값이다. 실시간 값은 스냅샷을 비결정적으로 만든다. */
const FIXED_TITLE = "하니스 문서";
const FIXED_DATE = "7월 29일";
const FIXED_TEXT = "하니스 본문";

const noop = () => {};

export function EditorHarness() {
  return (
    <div className="detail-page" data-harness={HARNESS_MARKER}>
      {/* 1. 브레드크럼 — 정적 대역(실제는 router + app.posts 조상 체인 의존) */}
      <div className="detail-breadcrumb">
        <IconButton icon={ArrowLeft} title="뒤로" onClick={noop} />
        <button type="button" className="detail-breadcrumb__root" onClick={noop}>
          내 업무
        </button>
        <span className="detail-breadcrumb__sep">
          <ChevronRight size={14} />
        </span>
        <span className="detail-breadcrumb__current">{FIXED_TITLE}</span>
        <div className="detail-breadcrumb__spacer" />
        <button type="button" className="detail-delete-btn" onClick={noop}>
          <Trash2 size={16} />
          삭제
        </button>
      </div>

      {/* 2. 커버 — 정적 대역. 실제 PostCover는 외부 이미지를 fetch하므로 그대로 쓰면
          네트워크가 flaky 요인이 된다. 박스(height 200px)는 CSS에서 동일하게 나온다. */}
      <div className="detail-cover" aria-hidden="true" />

      {/* 3. 페이지 아이콘 — props 전용이라 실컴포넌트 그대로 */}
      <PageIconButton icon={null} onChange={noop} />

      {/* 4. 제목 — 실마크업. 제어 input이므로 no-op onChange로 React 경고를 막는다. */}
      <input
        className="detail-title"
        value={FIXED_TITLE}
        onChange={noop}
        placeholder="제목 없음"
      />

      {/* 5. 메타 — 실마크업, 날짜만 고정 */}
      <div className="detail-meta">
        <Calendar size={14} />
        <span>{FIXED_DATE} 작성</span>
        <span className="detail-meta__dot" />
        <span>자동 저장됨</span>
      </div>

      {/* 6. 에디터 — 스모크의 주 대상 */}
      <PostEditor
        initialDoc={{ type: "doc", content: [] }}
        placeholder="내용을 입력하세요. 떠오르는 생각, 할 일, 메모를 자유롭게 기록해 보세요."
        onDocChange={noop}
      />

      {/* 7. 글자 수 — props 전용이라 실컴포넌트 그대로 */}
      <CharCount text={FIXED_TEXT} />
    </div>
  );
}
