"use client";

import type { LucideIcon } from "lucide-react";

type IconButtonProps = {
  icon: LucideIcon;
  size?: "sm" | "md";
  title?: string;
  className?: string;
  /** 펼침/접힘 등 토글 컨트롤의 현재 상태를 보조 기술에 알린다. */
  ariaExpanded?: boolean;
  /** 이 버튼이 제어하는 영역의 id. */
  ariaControls?: string;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
};

export function IconButton({
  icon: Icon,
  size = "md",
  title,
  className,
  ariaExpanded,
  ariaControls,
  onClick,
}: IconButtonProps) {
  return (
    <button
      type="button"
      className={`icon-btn${size === "sm" ? " icon-btn--sm" : ""}${
        className ? ` ${className}` : ""
      }`}
      title={title}
      aria-label={title}
      aria-expanded={ariaExpanded}
      aria-controls={ariaControls}
      onClick={onClick}
    >
      <Icon size={size === "sm" ? 14 : 16} />
    </button>
  );
}
