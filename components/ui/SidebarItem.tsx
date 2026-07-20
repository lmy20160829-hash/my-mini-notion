"use client";

import type { LucideIcon } from "lucide-react";
import { pendingLabel } from "./IconButton";

type SidebarItemProps = {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  /** 아직 만들지 않은 기능(앱 섹션의 캘린더·할 일·휴지통). */
  disabled?: boolean;
  onClick?: () => void;
};

export function SidebarItem({
  icon: Icon,
  label,
  active,
  disabled,
  onClick,
}: SidebarItemProps) {
  return (
    <button
      type="button"
      className={`sidebar-item${active ? " is-active" : ""}${
        disabled ? " is-disabled" : ""
      }`}
      // 접힌 레일에서 레이블이 숨겨져도 이름을 확인할 수 있는 툴팁(FR-009).
      // 펼침 상태에서도 말줄임된 긴 제목을 확인하는 데 쓰인다.
      // 비활성 항목은 이름 뒤에 "(준비 중)"이 붙는다 — 이름은 남겨야 레일에서
      // 무슨 아이콘인지 알 수 있다. `disabled` 속성을 쓰지 않는 이유는 IconButton 참조.
      title={disabled ? pendingLabel(label) : label}
      aria-disabled={disabled || undefined}
      onClick={disabled ? undefined : onClick}
    >
      <span className="sidebar-item__icon">
        <Icon size={16} />
      </span>
      <span className="sidebar-item__label">{label}</span>
    </button>
  );
}
