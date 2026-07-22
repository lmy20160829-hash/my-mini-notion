import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  ATTACHMENTS_BUCKET,
  MAX_ATTACHMENT_FILE_BYTES,
  MAX_ATTACHMENT_IMAGE_BYTES,
  classifyAttachment,
  deletePostAttachments,
  formatBytes,
  getAttachmentContext,
  newAttachmentPath,
  setAttachmentContext,
  uploadAttachment,
  validateAttachment,
} from "@/lib/attachments";

// 첨부 정책(⑧) — 오버뷰 스펙 §2 승인 결정:
// 화이트리스트(이미지 png/jpg/jpeg/gif/webp ≤5MB — svg 제외, 파일
// pdf/zip/txt/md/csv/docx/xlsx ≤20MB), 경로 {userId}/{postId}/{uuid}.{ext},
// 영구 삭제 후 정리 실패는 "[attachments] 고아 첨부 발생:" 고정 포맷 로깅(throw 금지).

const storageFromMock = vi.fn();
vi.mock("@/lib/supabase", () => ({
  isSupabaseConfigured: true,
  getSupabase: () => ({ storage: { from: storageFromMock } }),
}));

type BucketMock = {
  upload: ReturnType<typeof vi.fn>;
  remove: ReturnType<typeof vi.fn>;
  list: ReturnType<typeof vi.fn>;
  getPublicUrl: ReturnType<typeof vi.fn>;
};

function makeBucket(over: Partial<BucketMock> = {}): BucketMock {
  return {
    upload: vi.fn(async () => ({ data: { path: "p" }, error: null })),
    remove: vi.fn(async () => ({ data: [], error: null })),
    list: vi.fn(async () => ({ data: [], error: null })),
    getPublicUrl: vi.fn((path: string) => ({
      data: {
        publicUrl: `https://test.supabase.co/storage/v1/object/public/post-attachments/${path}`,
      },
    })),
    ...over,
  };
}

function f(name: string, type: string, size: number) {
  return { name, type, size };
}

beforeEach(() => {
  storageFromMock.mockReset();
  setAttachmentContext(null);
  vi.restoreAllMocks();
});

describe("classifyAttachment", () => {
  test("이미지 MIME 4종은 image로 분류한다", () => {
    for (const type of ["image/png", "image/jpeg", "image/gif", "image/webp"]) {
      expect(classifyAttachment(f("a", type, 1))?.kind).toBe("image");
    }
  });

  test("일반 파일 MIME 7종은 file로 분류한다", () => {
    const types = [
      "application/pdf",
      "application/zip",
      "text/plain",
      "text/markdown",
      "text/csv",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];
    for (const type of types) {
      expect(classifyAttachment(f("a", type, 1))?.kind).toBe("file");
    }
  });

  test("MIME이 비표준이면 확장자로 폴백한다(zip·csv·md의 흔한 사례)", () => {
    // Windows·구형 브라우저가 주는 비표준 MIME — 버킷 허용 MIME으로 정규화돼야 한다.
    expect(classifyAttachment(f("a.zip", "application/x-zip-compressed", 1))).toEqual({
      kind: "file",
      ext: "zip",
      mime: "application/zip",
    });
    expect(classifyAttachment(f("표.CSV", "application/vnd.ms-excel", 1))?.mime).toBe("text/csv");
    expect(classifyAttachment(f("note.md", "", 1))?.mime).toBe("text/markdown");
  });

  test("svg는 화이트리스트 밖이다(XSS 벡터 — 오버뷰 스펙 §2)", () => {
    expect(classifyAttachment(f("logo.svg", "image/svg+xml", 1))).toBe(null);
  });

  test("모르는 형식은 null", () => {
    expect(classifyAttachment(f("virus.exe", "application/x-msdownload", 1))).toBe(null);
    expect(classifyAttachment(f("이름만", "", 1))).toBe(null);
  });
});

describe("validateAttachment (경계값)", () => {
  test("이미지는 정확히 5MB까지 허용, 1바이트 초과부터 거부", () => {
    expect(validateAttachment(f("a.png", "image/png", MAX_ATTACHMENT_IMAGE_BYTES))).toBe(null);
    expect(
      validateAttachment(f("a.png", "image/png", MAX_ATTACHMENT_IMAGE_BYTES + 1))
    ).toBe("이미지 용량은 5MB 이하여야 합니다.");
  });

  test("일반 파일은 정확히 20MB까지 허용, 1바이트 초과부터 거부", () => {
    expect(validateAttachment(f("a.pdf", "application/pdf", MAX_ATTACHMENT_FILE_BYTES))).toBe(null);
    expect(
      validateAttachment(f("a.pdf", "application/pdf", MAX_ATTACHMENT_FILE_BYTES + 1))
    ).toBe("파일 용량은 20MB 이하여야 합니다.");
  });

  test("빈 파일은 거부한다", () => {
    expect(validateAttachment(f("a.png", "image/png", 0))).toBe(
      "빈 파일은 올릴 수 없습니다."
    );
  });

  test("화이트리스트 밖 형식은 사유 메시지를 돌려준다", () => {
    expect(validateAttachment(f("logo.svg", "image/svg+xml", 10))).toBe(
      "허용되지 않는 파일 형식입니다. 이미지(PNG·JPG·GIF·WEBP) 또는 PDF·ZIP·TXT·MD·CSV·DOCX·XLSX만 올릴 수 있습니다."
    );
  });
});

describe("newAttachmentPath (경로 규약 {userId}/{postId}/{uuid}.{ext})", () => {
  test("주입한 uuid와 정규화된 확장자로 경로를 만든다", () => {
    expect(newAttachmentPath("user-1", "7", f("사진.PNG", "image/png", 1), "u-u-i-d")).toBe(
      "user-1/7/u-u-i-d.png"
    );
    expect(newAttachmentPath("user-1", "7", f("a.zip", "application/x-zip-compressed", 1), "x")).toBe(
      "user-1/7/x.zip"
    );
  });

  test("uuid를 생략하면 crypto.randomUUID를 쓴다(사용자 파일명은 경로에 남지 않는다)", () => {
    const path = newAttachmentPath("user-1", "7", f("한글 이름.pdf", "application/pdf", 1));
    expect(path).toMatch(/^user-1\/7\/[0-9a-f-]{36}\.pdf$/);
  });
});

describe("formatBytes (KB/MB 표시)", () => {
  test("1MB 미만은 KB, 이상은 MB(소수 첫째 자리까지)", () => {
    expect(formatBytes(0)).toBe("0KB");
    expect(formatBytes(2048)).toBe("2KB");
    expect(formatBytes(512 * 1024)).toBe("512KB");
    expect(formatBytes(1024 * 1024)).toBe("1MB");
    expect(formatBytes(1.5 * 1024 * 1024)).toBe("1.5MB");
    expect(formatBytes(20 * 1024 * 1024)).toBe("20MB");
  });
});

describe("uploadAttachment", () => {
  test("검증 통과 파일을 경로 규약대로 올리고 공개 URL을 돌려준다", async () => {
    const bucket = makeBucket();
    storageFromMock.mockReturnValue(bucket);
    const file = f("고양이.png", "image/png", 1234) as File;

    const uploaded = await uploadAttachment("user-1", "7", file);

    expect(storageFromMock).toHaveBeenCalledWith(ATTACHMENTS_BUCKET);
    const [path, passedFile, options] = bucket.upload.mock.calls[0];
    expect(path).toMatch(/^user-1\/7\/[0-9a-f-]{36}\.png$/);
    expect(passedFile).toBe(file);
    expect(options).toEqual({ contentType: "image/png", upsert: false });
    expect(uploaded).toEqual({
      url: `https://test.supabase.co/storage/v1/object/public/post-attachments/${path}`,
      path,
      name: "고양이.png",
      size: 1234,
      kind: "image",
    });
  });

  test("검증 실패면 업로드 없이 사유 메시지로 reject 한다", async () => {
    const bucket = makeBucket();
    storageFromMock.mockReturnValue(bucket);

    await expect(
      uploadAttachment("user-1", "7", f("logo.svg", "image/svg+xml", 10) as File)
    ).rejects.toThrow("허용되지 않는 파일 형식입니다");
    expect(bucket.upload).not.toHaveBeenCalled();
  });

  test("스토리지 오류면 메시지 그대로 reject 한다", async () => {
    const bucket = makeBucket({
      upload: vi.fn(async () => ({ data: null, error: { message: "업로드 거부" } })),
    });
    storageFromMock.mockReturnValue(bucket);

    await expect(
      uploadAttachment("user-1", "7", f("a.pdf", "application/pdf", 10) as File)
    ).rejects.toThrow("업로드 거부");
  });
});

describe("deletePostAttachments (영구 삭제 후 정리 — throw 금지)", () => {
  test("글 폴더를 list 하고 나온 파일 전부를 remove 한다", async () => {
    const bucket = makeBucket({
      list: vi.fn(async () => ({
        data: [{ name: "a.png" }, { name: "b.pdf" }],
        error: null,
      })),
    });
    storageFromMock.mockReturnValue(bucket);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await deletePostAttachments("user-1", "7");

    expect(bucket.list).toHaveBeenCalledWith("user-1/7");
    expect(bucket.remove).toHaveBeenCalledWith(["user-1/7/a.png", "user-1/7/b.pdf"]);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  test("첨부가 없으면 remove를 부르지 않는다", async () => {
    const bucket = makeBucket();
    storageFromMock.mockReturnValue(bucket);

    await deletePostAttachments("user-1", "7");

    expect(bucket.remove).not.toHaveBeenCalled();
  });

  test("list 실패 시 고정 포맷으로 로깅하고 throw 하지 않는다", async () => {
    const bucket = makeBucket({
      list: vi.fn(async () => ({ data: null, error: { message: "목록 실패" } })),
    });
    storageFromMock.mockReturnValue(bucket);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(deletePostAttachments("user-1", "7")).resolves.toBeUndefined();

    expect(errorSpy).toHaveBeenCalledWith(
      "[attachments] 고아 첨부 발생: 7/user-1/7",
      "목록 실패"
    );
  });

  test("remove 실패 시 파일별 고정 포맷으로 로깅하고 throw 하지 않는다", async () => {
    const bucket = makeBucket({
      list: vi.fn(async () => ({
        data: [{ name: "a.png" }, { name: "b.pdf" }],
        error: null,
      })),
      remove: vi.fn(async () => ({ data: null, error: { message: "삭제 거부" } })),
    });
    storageFromMock.mockReturnValue(bucket);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(deletePostAttachments("user-1", "7")).resolves.toBeUndefined();

    expect(errorSpy).toHaveBeenCalledWith(
      "[attachments] 고아 첨부 발생: 7/user-1/7/a.png",
      "삭제 거부"
    );
    expect(errorSpy).toHaveBeenCalledWith(
      "[attachments] 고아 첨부 발생: 7/user-1/7/b.pdf",
      "삭제 거부"
    );
  });

  test("예기치 못한 예외(네트워크 등)도 삼키고 고정 포맷으로 로깅한다", async () => {
    storageFromMock.mockImplementation(() => {
      throw new Error("network down");
    });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(deletePostAttachments("user-1", "7")).resolves.toBeUndefined();

    expect(errorSpy).toHaveBeenCalledWith(
      "[attachments] 고아 첨부 발생: 7/user-1/7",
      expect.any(Error)
    );
  });
});

describe("첨부 업로드 컨텍스트 (에디터 handleDrop/handlePaste 연결점)", () => {
  test("set/get 왕복 — 상세 화면이 설정하고 에디터 핸들러가 읽는다", () => {
    expect(getAttachmentContext()).toBe(null);
    setAttachmentContext({ userId: "user-1", postId: "7" });
    expect(getAttachmentContext()).toEqual({ userId: "user-1", postId: "7" });
    setAttachmentContext(null);
    expect(getAttachmentContext()).toBe(null);
  });
});
