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
  deletePostById,
  fetchMyPosts,
  insertPost,
  updatePostFields,
} from "./posts";

export type Post = {
  id: string;
  title: string;
  content: string;
  createdAt: number;
};

/** 프로필 오버라이드(별명·아바타) 전용 로컬 키. 게시글은 서버(Supabase)에 저장된다. */
const KEY = "mini-notion-v1";

/** 편집 자동저장 디바운스. 키 입력마다 서버에 쓰지 않기 위한 간격(R7). */
const SAVE_DEBOUNCE_MS = 600;

type PendingEdit = {
  patch: Partial<Pick<Post, "title" | "content">>;
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
  // 로컬 프로필 오버라이드(구글 기본값 위에 덮어씀). 표시는 useProfile이 병합한다.
  nickname: string | null;
  avatar: string | null;
};

type AppStore = AppState & {
  createPost(title: string): Promise<Post | null>;
  updatePost(id: string, patch: Partial<Pick<Post, "title" | "content">>): void;
  deletePost(id: string): void;
  saveNickname(nick: string): void;
  setAvatar(dataUrl: string): void;
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
    avatar: null,
  });
  const [profileLoaded, setProfileLoaded] = useState(false);

  // 프로필 오버라이드만 localStorage에서 1회 로드(게시글은 서버에서 온다).
  useEffect(() => {
    let nickname: string | null = null;
    let avatar: string | null = null;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const d = JSON.parse(raw);
        nickname = d.nickname || null;
        avatar = d.avatar || null;
      }
    } catch {}
    setState((s) => ({ ...s, nickname, avatar }));
    setProfileLoaded(true);
  }, []);

  // 프로필 오버라이드 변경 시 저장.
  useEffect(() => {
    if (!profileLoaded) return;
    try {
      localStorage.setItem(
        KEY,
        JSON.stringify({ nickname: state.nickname, avatar: state.avatar })
      );
    } catch {}
  }, [profileLoaded, state.nickname, state.avatar]);

  // 세션이 확정되면 내 글을 서버에서 불러온다. 로그아웃되면 비운다.
  // 소유자 격리는 RLS(page_select_own)가 서버에서 강제한다.
  useEffect(() => {
    if (!auth.ready) return;
    if (!userId) {
      setState((s) => ({ ...s, posts: [], loaded: false }));
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
    (id: string, patch: Partial<Pick<Post, "title" | "content">>) => {
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

  // 낙관적 제거 후 서버 삭제. 실패하면 재조회로 서버 진실에 맞춰 되돌린다.
  const deletePost = useCallback((id: string) => {
    // 삭제한 글에 대기 중인 편집 저장이 뒤늦게 날아가지 않도록 취소한다.
    const entry = pending.current.get(id);
    if (entry) {
      clearTimeout(entry.timer);
      pending.current.delete(id);
    }
    setState((s) => ({ ...s, posts: s.posts.filter((p) => p.id !== id) }));
    void deletePostById(id).catch(async (e) => {
      notify(errorMessage(e, "게시글을 삭제하지 못했습니다."));
      try {
        const posts = await fetchMyPosts();
        setState((s) => ({ ...s, posts }));
      } catch {
        // 재조회까지 실패하면 다음 로드에서 정합성이 맞춰진다.
      }
    });
  }, []);

  const saveNickname = useCallback((nick: string) => {
    setState((s) => ({ ...s, nickname: (nick || "").trim() || null }));
  }, []);

  const setAvatar = useCallback((dataUrl: string) => {
    setState((s) => ({ ...s, avatar: dataUrl }));
  }, []);

  const store: AppStore = {
    ...state,
    createPost,
    updatePost,
    deletePost,
    saveNickname,
    setAvatar,
  };

  return <AppContext.Provider value={store}>{children}</AppContext.Provider>;
}

export function useApp(): AppStore {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within <AppProvider>");
  return ctx;
}
