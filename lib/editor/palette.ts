/**
 * 색 팔레트 상수 (Phase F 태스크 C2 — DESIGN.md §1.1.6).
 * 컨플루언스식 글자색 8종·배경색 8종. Color/Highlight 마크(C1, `marks.ts`)는
 * 값을 **인라인 hex style**로 저장하므로(테마 무관) 여기 hex는 라이트/다크
 * 양쪽에서 무난히 읽히도록 고정 채도로 미리 골라둔 값이다 — CSS 변수가 아니다.
 * C3(색 팝오버)가 이 배열을 그대로 렌더링해 소비한다.
 */
export type Swatch = { id: string; label: string; value: string | null };

/** 글자색 8종 — 기본(상속) + 7색. 진한 색조(밝은/어두운 배경 모두 판독). */
export const TEXT_COLORS: Swatch[] = [
  { id: "default", label: "기본", value: null },
  { id: "gray", label: "회색", value: "#6b7280" },
  { id: "red", label: "빨강", value: "#e5484d" },
  { id: "orange", label: "주황", value: "#d97514" },
  { id: "yellow", label: "노랑", value: "#b8860b" },
  { id: "green", label: "초록", value: "#1f9d57" },
  { id: "blue", label: "파랑", value: "#2f6fed" },
  { id: "purple", label: "보라", value: "#8b5cf6" },
];

/** 배경색(형광펜) 8종 — 없음 + 7색. 연한 배경(양쪽 테마에서 텍스트 위 판독). */
export const HIGHLIGHT_COLORS: Swatch[] = [
  { id: "none", label: "없음", value: null },
  { id: "gray", label: "회색", value: "#e5e7eb" },
  { id: "red", label: "빨강", value: "#fbdcdb" },
  { id: "orange", label: "주황", value: "#fbe6cf" },
  { id: "yellow", label: "노랑", value: "#fbf1c7" },
  { id: "green", label: "초록", value: "#d5f0e0" },
  { id: "blue", label: "파랑", value: "#dbe8fd" },
  { id: "purple", label: "보라", value: "#e9e2fb" },
];
