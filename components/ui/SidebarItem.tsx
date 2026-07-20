"use client";

import type { LucideIcon } from "lucide-react";

type SidebarItemProps = {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  onClick?: () => void;
};

export function SidebarItem({
  icon: Icon,
  label,
  active,
  onClick,
}: SidebarItemProps) {
  return (
    <button
      type="button"
      className={`sidebar-item${active ? " is-active" : ""}`}
      // 접힌 레일에서 레이블이 숨겨져도 이름을 확인할 수 있는 툴팁(FR-009).
      // 펼침 상태에서도 말줄임된 긴 제목을 확인하는 데 쓰인다.
      title={label}
      onClick={onClick}
    >
      <span className="sidebar-item__icon">
        <Icon size={16} />
      </span>
      <span className="sidebar-item__label">{label}</span>
    </button>
  );
}
