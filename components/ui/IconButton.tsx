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
  /** 아직 만들지 않은 기능. 눌러도 아무 일이 없음을 시각·보조기술 양쪽에 알린다(§2.2). */
  disabled?: boolean;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
};

/** 비활성 항목의 툴팁·레이블. 이름을 남겨 무엇인지 알 수 있게 한다. */
export function pendingLabel(name: string): string {
  return `${name} (준비 중)`;
}

export function IconButton({
  icon: Icon,
  size = "md",
  title,
  className,
  ariaExpanded,
  ariaControls,
  disabled,
  onClick,
}: IconButtonProps) {
  // `disabled` 속성이 아니라 `aria-disabled` 를 쓴다. 진짜 disabled 는 브라우저가
  // 포인터 이벤트를 없애 `title` 툴팁이 뜨지 않아서, "준비 중"이라는 사실 자체를
  // 사용자에게 전달할 수단이 사라진다. aria-disabled 는 보조기술에 동일하게
  // 비활성으로 전달되면서 호버·툴팁은 살아 있다.
  const label = title && disabled ? pendingLabel(title) : title;
  return (
    <button
      type="button"
      className={`icon-btn${size === "sm" ? " icon-btn--sm" : ""}${
        disabled ? " is-disabled" : ""
      }${className ? ` ${className}` : ""}`}
      title={label}
      aria-label={label}
      aria-expanded={ariaExpanded}
      aria-controls={ariaControls}
      aria-disabled={disabled || undefined}
      onClick={disabled ? undefined : onClick}
    >
      <Icon size={size === "sm" ? 14 : 16} />
    </button>
  );
}
