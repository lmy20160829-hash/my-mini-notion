"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  Calendar,
  ChevronsUpDown,
  CircleHelp,
  FileText,
  House,
  LayoutGrid,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  Settings,
  SquareCheck,
  Trash2,
} from "lucide-react";
import { useApp } from "@/lib/store";
import { filterPosts } from "@/lib/search";
import { useAuth } from "@/lib/auth";
import { useProfile } from "@/lib/profile";
import { Avatar } from "@/components/ui/Avatar";
import { IconButton } from "@/components/ui/IconButton";
import { SidebarItem } from "@/components/ui/SidebarItem";
import { SidebarSection } from "@/components/ui/SidebarSection";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export function AppShell({ children }: { children: React.ReactNode }) {
  const app = useApp();
  const auth = useAuth();
  const profile = useProfile();
  const router = useRouter();
  const pathname = usePathname();
  const [search, setSearch] = useState("");
  const collapsed = app.sidebarCollapsed;

  // Client-side auth guard: bounce to /login when signed out.
  useEffect(() => {
    if (auth.ready && !auth.session) router.replace("/login");
  }, [auth.ready, auth.session, router]);

  // 인증이 확정되기 전(또는 글 로드 전)에는 아무것도 그리지 않는다.
  if (!auth.ready || !auth.session || !app.loaded) return null;

  // 사이드바 전용 검색: 제목+본문 substring 필터(§5.8). 빈 입력이면 전체.
  const searching = search.trim().length > 0;
  const navPosts = filterPosts(app.posts, search);

  const newPage = async () => {
    const post = await app.createPost("");
    if (post) router.push(`/posts/${post.id}`);
  };

  return (
    <div className="app-root">
      <header className="topbar">
        <span className="brand-chip">mini</span>
        <div className="topbar__workspace">
          <span className="topbar__title">미니 노션</span>
          <ChevronsUpDown size={14} />
        </div>
        {/* 상단바 가로 정중앙(절대 배치) — 좌/우 그룹과 독립 (US1, FR-001) */}
        <div className="topbar__theme">
          <ThemeToggle />
        </div>
        <div className="topbar__spacer" />
        {/* 상단바 아이콘은 전부 아직 만들지 않은 기능이다. 눌리는 것처럼 보이면
            고장으로 오해되므로 비활성으로 표시한다(§3.2). 알림 점도 장식이다. */}
        <div className="topbar__bell">
          <IconButton icon={Bell} title="알림" disabled />
          <span className="topbar__bell-dot" />
        </div>
        <IconButton icon={Search} title="검색" disabled />
        <IconButton icon={CircleHelp} title="도움말" disabled />
        <IconButton icon={LayoutGrid} title="앱" disabled />
        <IconButton icon={Menu} title="메뉴" disabled />
      </header>

      <div className="app-body">
        <nav
          id="app-sidebar"
          className={`sidebar${collapsed ? " is-collapsed" : ""}`}
        >
          <div className="sidebar__inner">
            {/* 단일 토글: 접힘·펼침 양쪽 상태에서 항상 보이며 양방향을 담당한다(FR-004). */}
            <div className="sidebar__toolbar">
              <IconButton
                icon={collapsed ? PanelLeftOpen : PanelLeftClose}
                title={collapsed ? "사이드바 펼치기" : "사이드바 접기"}
                ariaExpanded={!collapsed}
                ariaControls="app-sidebar"
                onClick={app.toggleSidebar}
              />
            </div>
            <SidebarItem
              icon={House}
              label="홈"
              active={pathname === "/"}
              onClick={() => router.push("/")}
            />
            {!collapsed && (
              <>
                <div style={{ height: 8 }} />
                <div className="input-sm">
                  <Search size={14} />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="글 검색"
                  />
                </div>
              </>
            )}
            <div style={{ height: 12 }} />
            <div className="sidebar__scroll mn-scroll">
              {/* 레일에서는 텍스트 기반 요소(검색·섹션 헤더·"내 글" 목록)를 숨기고
                  고정 내비 아이콘만 남긴다(FR-007). */}
              {!collapsed && (
                <>
                  {/* 카운트는 검색 중엔 매치 개수, 평소엔 전체 개수(= navPosts). */}
                  <SidebarSection
                    label="내 글"
                    count={navPosts.length}
                    actions={[
                      { icon: Plus, title: "새 페이지", onClick: () => void newPage() },
                    ]}
                  >
                    {navPosts.map((post) => (
                      <SidebarItem
                        key={post.id}
                        icon={FileText}
                        label={post.title.trim() || "제목 없음"}
                        active={pathname === `/posts/${post.id}`}
                        onClick={() => router.push(`/posts/${post.id}`)}
                      />
                    ))}
                    {app.posts.length === 0 ? (
                      <div className="sidebar-section__empty">
                        아직 글이 없어요.
                      </div>
                    ) : searching && navPosts.length === 0 ? (
                      <div className="sidebar-section__empty">
                        검색 결과가 없어요.
                      </div>
                    ) : null}
                  </SidebarSection>
                  <div style={{ height: 10 }} />
                </>
              )}
              {/* "앱" 섹션 3종도 아직 만들지 않은 기능이다(§3.3). */}
              {collapsed ? (
                <>
                  <SidebarItem icon={Calendar} label="캘린더" disabled />
                  <SidebarItem icon={SquareCheck} label="할 일" disabled />
                  <SidebarItem icon={Trash2} label="휴지통" disabled />
                </>
              ) : (
                <SidebarSection label="앱">
                  <SidebarItem icon={Calendar} label="캘린더" disabled />
                  <SidebarItem icon={SquareCheck} label="할 일" disabled />
                  <SidebarItem icon={Trash2} label="휴지통" disabled />
                </SidebarSection>
              )}
            </div>
          </div>

          <button
            type="button"
            className="sidebar__profile"
            title={collapsed ? "마이 페이지" : undefined}
            onClick={() => router.push("/mypage")}
          >
            <Avatar name={profile.displayName} src={profile.avatarUrl} size={28} />
            {!collapsed && (
              <>
                <span className="sidebar__profile-body">
                  <span className="sidebar__profile-name">
                    {profile.displayName}
                  </span>
                  <br />
                  <span className="sidebar__profile-sub">마이 페이지</span>
                </span>
                <Settings size={16} />
              </>
            )}
          </button>
        </nav>

        <main className="app-main mn-scroll">{children}</main>
      </div>
    </div>
  );
}
