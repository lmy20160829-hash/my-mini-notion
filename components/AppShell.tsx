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
  Plus,
  Search,
  Settings,
  SquareCheck,
  Trash2,
} from "lucide-react";
import { useApp } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { useProfile } from "@/lib/profile";
import { Avatar } from "@/components/ui/Avatar";
import { IconButton } from "@/components/ui/IconButton";
import { SidebarItem } from "@/components/ui/SidebarItem";
import { SidebarSection } from "@/components/ui/SidebarSection";

export function AppShell({ children }: { children: React.ReactNode }) {
  const app = useApp();
  const auth = useAuth();
  const profile = useProfile();
  const router = useRouter();
  const pathname = usePathname();
  const [search, setSearch] = useState("");

  // Client-side auth guard: bounce to /login when signed out.
  useEffect(() => {
    if (auth.ready && !auth.session) router.replace("/login");
  }, [auth.ready, auth.session, router]);

  // 인증이 확정되기 전(또는 글 로드 전)에는 아무것도 그리지 않는다.
  if (!auth.ready || !auth.session || !app.loaded) return null;

  const q = search.trim().toLowerCase();
  const navPosts = q
    ? app.posts.filter((p) =>
        (p.title || "제목 없음").toLowerCase().includes(q)
      )
    : app.posts;

  const newPage = () => {
    const post = app.createPost("");
    router.push(`/posts/${post.id}`);
  };

  return (
    <div className="app-root">
      <header className="topbar">
        <span className="brand-chip">mini</span>
        <div className="topbar__workspace">
          <span className="topbar__title">미니 노션</span>
          <ChevronsUpDown size={14} />
        </div>
        <div className="topbar__spacer" />
        <div className="topbar__bell">
          <IconButton icon={Bell} title="알림" />
          <span className="topbar__bell-dot" />
        </div>
        <IconButton icon={Search} title="검색" />
        <IconButton icon={CircleHelp} title="도움말" />
        <IconButton icon={LayoutGrid} title="앱" />
        <IconButton icon={Menu} title="메뉴" />
      </header>

      <div className="app-body">
        <nav className="sidebar">
          <div className="sidebar__inner">
            <SidebarItem
              icon={House}
              label="홈"
              active={pathname === "/"}
              onClick={() => router.push("/")}
            />
            <div style={{ height: 8 }} />
            <div className="input-sm">
              <Search size={14} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="글 검색"
              />
            </div>
            <div style={{ height: 12 }} />
            <div className="sidebar__scroll mn-scroll">
              <SidebarSection
                label="내 글"
                count={app.posts.length}
                actions={[{ icon: Plus, title: "새 페이지", onClick: newPage }]}
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
                {app.posts.length === 0 && (
                  <div className="sidebar-section__empty">
                    아직 글이 없어요.
                  </div>
                )}
              </SidebarSection>
              <div style={{ height: 10 }} />
              <SidebarSection label="앱">
                <SidebarItem icon={Calendar} label="캘린더" />
                <SidebarItem icon={SquareCheck} label="할 일" />
                <SidebarItem icon={Trash2} label="휴지통" />
              </SidebarSection>
            </div>
          </div>

          <button
            type="button"
            className="sidebar__profile"
            onClick={() => router.push("/mypage")}
          >
            <Avatar name={profile.displayName} src={profile.avatarUrl} size={28} />
            <span className="sidebar__profile-body">
              <span className="sidebar__profile-name">{profile.displayName}</span>
              <br />
              <span className="sidebar__profile-sub">마이 페이지</span>
            </span>
            <Settings size={16} />
          </button>
        </nav>

        <main className="app-main mn-scroll">{children}</main>
      </div>
    </div>
  );
}
