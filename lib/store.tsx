"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useAuth } from "./auth";
import {
  fetchMyPosts,
  insertPost,
  softDeletePost,
  sortPosts,
  updatePostFields,
} from "./posts";
import { fetchImagePath, profileImageUrl } from "./profile-image";
import type { EditorDoc } from "./editor/doc";

export type Post = {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  /** 소프트 삭제 시각(epoch ms). null이면 살아 있는 글, 값이 있으면 휴지통에 있다. */
  deletedAt: number | null;
  /** 에디터 블록 문서(JSON). null이면 content(플레인)를 textToDoc으로 즉석 변환해 렌더. */
  contentDoc: EditorDoc | null;
};

/** 프로필 오버라이드(별명) 전용 로컬 키. 게시글·프로필 사진은 서버(Supabase)에 저장된다. */
const KEY = "mini-notion-v1";

/** 편집 자동저장 디바운스. 키 입력마다 서버에 쓰지 않기 위한 간격(R7). */
const SAVE_DEBOUNCE_MS = 600;

type PendingEdit = {
  patch: Partial<Pick<Post, "title" | "content" | "contentDoc">>;
  timer: ReturnType<typeof setTimeout>;
};

export function formatDate(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const days = Math.floor(
    (new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() -
      new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) /
      864e5
  );
  if (days === 0) return "오늘";
  if (days === 1) return "어제";
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

type AppState = {
  loaded: boolean;
  posts: Post[];
  // 프로필 오버라이드(구글 기본값 위에 덮어씀). 표시는 useProfile이 병합한다.
  // nickname 은 로컬, profileImagePath 는 서버(profile.image_path)에서 온다.
  nickname: string | null;
  profileImagePath: string | null;
  sidebarCollapsed: boolean;
};

type AppStore = AppState & {
  /** profileImagePath 에 환경변수 앞부분을 붙인 표시용 URL. 경로가 없으면 null. */
  profileImageUrl: string | null;
  createPost(title: string): Promise<Post | null>;
  updatePost(id: string, patch: Partial<Pick<Post, "title" | "content" | "contentDoc">>): void;
  deletePost(id: string): void;
  /** 휴지통에서 복원된 글을 목록에 되넣는다(최신 우선 정렬 유지). `/trash` 화면이 호출한다. */
  restoreToList(post: Post): void;
  saveNickname(nick: string): void;
  setProfileImagePath(path: string | null): void;
  toggleSidebar(): void;
};

const AppContext = createContext<AppStore | null>(null);

/** 정적 SPA라 토스트 인프라가 없다. 실패는 최소한의 알림으로 사용자에게 알린다(R8). */
function notify(message: string) {
  if (typeof window !== "undefined") window.alert(message);
}

function errorMessage(e: unknown, fallback: string): string {
  return e instanceof Error && e.message ? e.message : fallback;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const userId = auth.session?.user?.id ?? null;

  const [state, setState] = useState<AppState>({
    loaded: false,
    posts: [],
    nickname: null,
    profileImagePath: null,
    sidebarCollapsed: false,
  });
  const [profileLoaded, setProfileLoaded] = useState(false);

  // 별명·UI 환경설정만 localStorage에서 1회 로드(게시글·프로필 사진은 서버에서 온다).
  // 예전 스키마의 `avatar`(base64 dataURL)는 읽지 않는다 — 남겨 두면 서버에 올린
  // 새 사진보다 우선해 버려서, 사진을 바꿔도 예전 이미지가 계속 보인다.
  useEffect(() => {
    let nickname: string | null = null;
    let sidebarCollapsed = false;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const d = JSON.parse(raw);
        nickname = d.nickname || null;
        // 이 기능 이전에 저장된 데이터에는 필드가 없다 → 기본값 "펼침".
        sidebarCollapsed = !!d.sidebarCollapsed;
      }
    } catch {}
    setState((s) => ({ ...s, nickname, sidebarCollapsed }));
    setProfileLoaded(true);
  }, []);

  // 프로필 오버라이드 변경 시 저장.
  useEffect(() => {
    if (!profileLoaded) return;
    try {
      localStorage.setItem(
        KEY,
        JSON.stringify({
          nickname: state.nickname,
          sidebarCollapsed: state.sidebarCollapsed,
        })
      );
    } catch {}
  }, [profileLoaded, state.nickname, state.sidebarCollapsed]);

  // 세션이 확정되면 내 글을 서버에서 불러온다. 로그아웃되면 비운다.
  // 소유자 격리는 RLS(page_select_own)가 서버에서 강제한다.
  useEffect(() => {
    if (!auth.ready) return;
    if (!userId) {
      // 로그아웃: 게시글뿐 아니라 **프로필 오버라이드도** 비운다.
      // nickname/profileImagePath 는 useProfile 이 구글 계정 값보다 우선 적용하는
      // 값이라, 남겨 두면 같은 브라우저에서 다음 사용자가 이전 사용자의 이름·사진을 보게 된다.
      // sidebarCollapsed 는 사용자 데이터가 아닌 기기 UI 환경설정이라 유지한다.
      setState((s) => ({
        ...s,
        posts: [],
        loaded: false,
        nickname: null,
        profileImagePath: null,
      }));
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const posts = await fetchMyPosts();
        if (!cancelled) setState((s) => ({ ...s, posts, loaded: true }));
      } catch (e) {
        if (cancelled) return;
        // 잘못된 목록이 남지 않도록 비우되, 화면 자체는 열어 둔다.
        setState((s) => ({ ...s, posts: [], loaded: true }));
        notify(errorMessage(e, "게시글을 불러오지 못했습니다."));
      }
    })();
    // 프로필 사진은 사이드바에도 나오므로 마이 페이지 진입과 무관하게 세션 확정 시 읽는다.
    // 실패해도 구글 기본 사진으로 폴백되니 알림 없이 넘어간다(내부에서 로깅).
    void fetchImagePath(userId)
      .then(({ imagePath }) => {
        if (!cancelled) setState((s) => ({ ...s, profileImagePath: imagePath }));
      })
      .catch((e) => {
        console.error("[profile] 프로필 이미지 조회 실패:", e);
      });
    return () => {
      cancelled = true;
    };
  }, [auth.ready, userId]);

  const createPost = useCallback(
    async (title: string): Promise<Post | null> => {
      if (!userId) {
        notify("로그인이 필요합니다. 다시 로그인해 주세요.");
        return null;
      }
      try {
        const post = await insertPost(title, userId);
        setState((s) => ({ ...s, posts: [post, ...s.posts] }));
        return post;
      } catch (e) {
        notify(errorMessage(e, "글을 저장하지 못했습니다."));
        return null;
      }
    },
    [userId]
  );

  // 편집은 키 입력마다 호출된다. 로컬은 즉시 반영하고 서버 쓰기는 id별로 묶어 보낸다(R7).
  const pending = useRef(new Map<string, PendingEdit>());

  const flush = useCallback((id: string) => {
    const entry = pending.current.get(id);
    if (!entry) return;
    clearTimeout(entry.timer);
    pending.current.delete(id);
    void updatePostFields(id, entry.patch).catch((e) => {
      notify(errorMessage(e, "변경 사항을 저장하지 못했습니다."));
    });
  }, []);

  const updatePost = useCallback(
    (id: string, patch: Partial<Pick<Post, "title" | "content" | "contentDoc">>) => {
      setState((s) => ({
        ...s,
        posts: s.posts.map((p) => (p.id === id ? { ...p, ...patch } : p)),
      }));

      const entry = pending.current.get(id);
      if (entry) clearTimeout(entry.timer);
      pending.current.set(id, {
        patch: { ...entry?.patch, ...patch },
        timer: setTimeout(() => flush(id), SAVE_DEBOUNCE_MS),
      });
    },
    [flush]
  );

  // 언마운트/이탈 시 대기 중인 편집을 유실하지 않는다.
  useEffect(() => {
    const map = pending.current;
    return () => {
      for (const id of [...map.keys()]) flush(id);
    };
  }, [flush]);

  // 낙관적 제거 후 서버에 소프트 삭제(deleted_at 마킹 — 휴지통 이동).
  // 실패하면 재조회로 서버 진실에 맞춰 되돌린다. 영구 삭제는 /trash 화면에서만 한다.
  const deletePost = useCallback((id: string) => {
    // 삭제한 글에 대기 중인 편집 저장이 뒤늦게 날아가지 않도록 취소한다.
    const entry = pending.current.get(id);
    if (entry) {
      clearTimeout(entry.timer);
      pending.current.delete(id);
    }
    setState((s) => ({ ...s, posts: s.posts.filter((p) => p.id !== id) }));
    void softDeletePost(id).catch(async (e) => {
      notify(errorMessage(e, "게시글을 삭제하지 못했습니다."));
      try {
        const posts = await fetchMyPosts();
        setState((s) => ({ ...s, posts }));
      } catch {
        // 재조회까지 실패하면 다음 로드에서 정합성이 맞춰진다.
      }
    });
  }, []);

  // 휴지통 복원 성공 후 /trash 화면이 호출한다. 서버는 이미 복원됐으므로 로컬만 맞춘다.
  const restoreToList = useCallback((post: Post) => {
    setState((s) => ({
      ...s,
      posts: sortPosts([
        { ...post, deletedAt: null },
        ...s.posts.filter((p) => p.id !== post.id),
      ]),
    }));
  }, []);

  const saveNickname = useCallback((nick: string) => {
    setState((s) => ({ ...s, nickname: (nick || "").trim() || null }));
  }, []);

  // 업로드가 끝난 뒤 마이 페이지가 호출한다. 사이드바 아바타도 같은 상태를 보므로 함께 갱신된다.
  const setProfileImagePath = useCallback((path: string | null) => {
    setState((s) => ({ ...s, profileImagePath: path }));
  }, []);

  // 단일 토글이 양방향을 담당한다. 함수형 업데이트라 연타해도 최종 상태로 수렴한다.
  const toggleSidebar = useCallback(() => {
    setState((s) => ({ ...s, sidebarCollapsed: !s.sidebarCollapsed }));
  }, []);

  const store: AppStore = {
    ...state,
    profileImageUrl: profileImageUrl(state.profileImagePath),
    createPost,
    updatePost,
    deletePost,
    restoreToList,
    saveNickname,
    setProfileImagePath,
    toggleSidebar,
  };

  return <AppContext.Provider value={store}>{children}</AppContext.Provider>;
}

export function useApp(): AppStore {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within <AppProvider>");
  return ctx;
}
