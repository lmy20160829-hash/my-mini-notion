import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

// 마이 페이지 프로필 이미지 업로드 통합 검증.
// 모킹은 외부 경계인 Supabase 클라이언트 한 곳뿐 — AuthProvider·AppProvider·useProfile·
// profile-image·페이지는 전부 실제 코드다. 가짜 클라이언트는 Storage 버킷(파일명→파일)과
// profile 행을 실제로 보관하므로 "uuid 파일명으로 올라갔는가", "image_path 에 뒷부분만
// 저장되는가", "이전 파일이 지워지는가"까지 진짜로 검증된다.
const db = vi.hoisted(() => ({
  row: {} as Record<string, unknown>,
  bucket: new Map<string, { type: string }>(),
  uploadError: null as string | null,
  updateShouldMatch: true,
  // 업로드가 끝나는 시점을 테스트가 붙잡아 두기 위한 걸쇠(진행 중 UI 검증용).
  gate: null as { promise: Promise<void>; open: () => void } | null,
}));

function holdUpload() {
  let open!: () => void;
  const promise = new Promise<void>((resolve) => {
    open = resolve;
  });
  db.gate = { promise, open };
  return () => db.gate!.open();
}

const STORAGE_BASE =
  "https://test.supabase.co/storage/v1/object/public/profile-image";

vi.mock("@/lib/supabase", () => {
  const session = {
    user: {
      id: "u-1",
      email: "gildong@gmail.com",
      user_metadata: { full_name: "홍길동", avatar_url: "https://img/g.png" },
    },
  };
  return {
    isSupabaseConfigured: true,
    getSupabase: () => ({
      auth: {
        getSession: async () => ({ data: { session } }),
        onAuthStateChange: () => ({
          data: { subscription: { unsubscribe: () => {} } },
        }),
        signOut: async () => {},
      },
      storage: {
        from: (bucketName: string) => ({
          async upload(
            path: string,
            file: { type: string },
            opts: { upsert?: boolean }
          ) {
            if (bucketName !== "profile-image") {
              return { error: { message: "알 수 없는 버킷" } };
            }
            if (db.gate) await db.gate.promise;
            if (db.uploadError) return { error: { message: db.uploadError } };
            // upsert:false 인데 이미 있으면 실제 Storage 도 거절한다.
            if (!opts?.upsert && db.bucket.has(path)) {
              return { error: { message: "이미 존재하는 파일" } };
            }
            db.bucket.set(path, { type: file.type });
            return { error: null };
          },
          async remove(paths: string[]) {
            for (const p of paths) db.bucket.delete(p);
            return { error: null };
          },
        }),
      },
      from: (table: string) => ({
        upsert(payload: Record<string, unknown>) {
          if (table === "profile") Object.assign(db.row, payload);
          return Promise.resolve({ error: null });
        },
        select(columns: string) {
          const chain = {
            eq: () => chain,
            order: () => Promise.resolve({ data: [], error: null }),
            maybeSingle: async () => {
              if (table !== "profile") return { data: null, error: null };
              const picked: Record<string, unknown> = {};
              for (const key of columns.split(",")) {
                picked[key.trim()] = db.row[key.trim()] ?? null;
              }
              return { data: picked, error: null };
            },
          };
          return chain;
        },
        update(payload: Record<string, unknown>) {
          const result = () => {
            if (table !== "profile" || !db.updateShouldMatch) {
              return { data: [], error: null };
            }
            Object.assign(db.row, payload);
            return { data: [{ ...db.row }], error: null };
          };
          return {
            eq: () =>
              Object.assign(Promise.resolve(result()), {
                select: async () => result(),
              }),
          };
        },
      }),
    }),
  };
});

const { AppProvider } = await import("@/lib/store");
const { AuthProvider } = await import("@/lib/auth");
const MyPage = (await import("@/app/(app)/mypage/page")).default;

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

function renderMyPage() {
  return render(
    <AuthProvider>
      <AppProvider>
        <MyPage />
      </AppProvider>
    </AuthProvider>
  );
}

function pngFile(name = "내 사진.png") {
  return new File([new Uint8Array([1, 2, 3])], name, { type: "image/png" });
}

/** 숨겨진 file input. 라벨("사진 변경") 안에 있어 role 로는 잡히지 않는다. */
function fileInput(): HTMLInputElement {
  return document.querySelector(
    'input[type="file"]'
  ) as HTMLInputElement;
}

function pick(file: File) {
  fireEvent.change(fileInput(), { target: { files: [file] } });
}

/** 마이 페이지의 72px 아바타 이미지(있으면). 사진이 없으면 이니셜이라 null. */
function avatarImg(): HTMLImageElement | null {
  return document.querySelector(".mypage-avatar-row .avatar img");
}

beforeEach(() => {
  db.row = {
    user_id: "u-1",
    name: "홍길동",
    email: "gildong@gmail.com",
    avatar_url: "https://img/g.png",
    introduction: null,
    image_path: null,
  };
  db.bucket = new Map();
  db.uploadError = null;
  db.updateShouldMatch = true;
  db.gate = null;
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});

test("사진을 고르면 uuidv4 파일명으로 업로드되고 image_path 에 뒷부분만 저장된다", async () => {
  renderMyPage();
  await screen.findByText("사진 변경");

  pick(pngFile());

  await waitFor(() => expect(db.bucket.size).toBe(1));
  const [path] = [...db.bucket.keys()];

  // 버킷 안 경로 = uuidv4 + 확장자. 사용자 파일명("내 사진")은 남지 않는다.
  expect(path).toMatch(/\.png$/);
  expect(path.replace(/\.png$/, "")).toMatch(UUID_V4);
  expect(path).not.toContain("내 사진");

  // 저장되는 건 버킷명 이후 경로뿐 — 앞부분(스토리지 주소)은 환경변수에 있다.
  expect(db.row.image_path).toBe(path);
  expect(String(db.row.image_path)).not.toContain("http");
  expect(String(db.row.image_path)).not.toContain("profile-image");
});

test("업로드 후 아바타가 환경변수 앞부분 + image_path 로 조립된 URL 을 쓴다", async () => {
  renderMyPage();
  await screen.findByText("사진 변경");
  // 업로드 전에는 구글 계정 사진.
  await waitFor(() => expect(avatarImg()?.src).toBe("https://img/g.png"));

  pick(pngFile());

  await waitFor(() => {
    expect(avatarImg()?.src).toBe(`${STORAGE_BASE}/${db.row.image_path}`);
  });
});

test("사진을 다시 바꾸면 새 파일만 남고 이전 파일은 지워진다", async () => {
  renderMyPage();
  await screen.findByText("사진 변경");

  pick(pngFile("first.png"));
  await waitFor(() => expect(db.bucket.size).toBe(1));
  const firstPath = String(db.row.image_path);

  pick(pngFile("second.png"));
  await waitFor(() => expect(db.row.image_path).not.toBe(firstPath));

  expect(db.bucket.has(firstPath)).toBe(false);
  expect(db.bucket.size).toBe(1);
});

test("업로드가 실패하면 알림이 뜨고 기존 사진이 유지된다", async () => {
  const alertMock = vi.spyOn(window, "alert").mockImplementation(() => {});
  db.row.image_path = "old.png";
  db.bucket.set("old.png", { type: "image/png" });
  db.uploadError = "storage 권한이 없습니다";

  renderMyPage();
  await screen.findByText("사진 변경");
  await waitFor(() =>
    expect(avatarImg()?.src).toBe(`${STORAGE_BASE}/old.png`)
  );

  pick(pngFile());

  await waitFor(() =>
    expect(alertMock).toHaveBeenCalledWith("storage 권한이 없습니다")
  );
  expect(db.row.image_path).toBe("old.png");
  expect(avatarImg()?.src).toBe(`${STORAGE_BASE}/old.png`);
});

// 업로드는 됐는데 DB 기록이 0행으로 끝나는 경우(프로필 행 없음 / RLS 차단).
// 그냥 두면 아무 데서도 참조하지 않는 고아 파일이 버킷에 쌓인다.
test("경로 저장에 실패하면 방금 올린 파일을 되돌려 지우고 알린다", async () => {
  const alertMock = vi.spyOn(window, "alert").mockImplementation(() => {});
  db.updateShouldMatch = false;

  renderMyPage();
  await screen.findByText("사진 변경");

  pick(pngFile());

  await waitFor(() => expect(alertMock).toHaveBeenCalled());
  expect(db.bucket.size).toBe(0);
  expect(db.row.image_path).toBe(null);
});

test("이미지가 아닌 파일은 업로드를 시도조차 하지 않는다", async () => {
  const alertMock = vi.spyOn(window, "alert").mockImplementation(() => {});
  renderMyPage();
  await screen.findByText("사진 변경");

  pick(new File(["x"], "doc.pdf", { type: "application/pdf" }));

  await waitFor(() => expect(alertMock).toHaveBeenCalled());
  expect(db.bucket.size).toBe(0);
  expect(db.row.image_path).toBe(null);
});

// 업로드가 오래 걸릴 때 같은 사용자가 여러 파일을 겹쳐 올리면 나중에 끝난 업로드가
// 이기고 나머지는 고아 파일이 된다. 진행 중에는 입력 자체를 잠근다.
test("업로드 중에는 버튼이 잠기고 끝나면 풀린다", async () => {
  const finishUpload = holdUpload();
  renderMyPage();
  await screen.findByText("사진 변경");

  pick(pngFile());

  await screen.findByText("업로드 중…");
  expect(fileInput().disabled).toBe(true);

  finishUpload();

  await screen.findByText("사진 변경");
  expect(fileInput().disabled).toBe(false);
});
