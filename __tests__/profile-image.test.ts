import { describe, expect, test } from "vitest";
import {
  MAX_IMAGE_BYTES,
  imageExtension,
  joinStorageUrl,
  newImagePath,
  validateImageFile,
} from "@/lib/profile-image";

// 다운로드 URL 은 앞부분(환경변수)과 뒷부분(profile.image_path)으로 나뉘어 저장된다.
// joinStorageUrl 이 그 둘을 다시 합치는 유일한 지점이라, 경계의 슬래시를 여기서 못 잡으면
// 화면에 깨진 이미지가 뜬다.
describe("joinStorageUrl", () => {
  const base = "https://ref.supabase.co/storage/v1/object/public/profile-image";

  test("앞부분과 뒷부분을 슬래시 하나로 잇는다", () => {
    expect(joinStorageUrl(base, "abc.png")).toBe(`${base}/abc.png`);
  });

  test("base 끝 슬래시나 path 앞 슬래시가 있어도 중복되지 않는다", () => {
    expect(joinStorageUrl(`${base}/`, "abc.png")).toBe(`${base}/abc.png`);
    expect(joinStorageUrl(base, "/abc.png")).toBe(`${base}/abc.png`);
    expect(joinStorageUrl(`${base}//`, "//abc.png")).toBe(`${base}/abc.png`);
  });

  test("경로가 없으면(사진 미설정) null — 구글 기본 사진으로 폴백된다", () => {
    expect(joinStorageUrl(base, null)).toBe(null);
    expect(joinStorageUrl(base, "")).toBe(null);
  });

  test("환경변수가 없으면 null — 깨진 URL 을 만들지 않는다", () => {
    expect(joinStorageUrl(undefined, "abc.png")).toBe(null);
    expect(joinStorageUrl("", "abc.png")).toBe(null);
  });
});

describe("imageExtension", () => {
  test("MIME 타입에서 확장자를 정한다", () => {
    expect(imageExtension({ name: "사진", type: "image/jpeg" })).toBe("jpg");
    expect(imageExtension({ name: "사진", type: "image/png" })).toBe("png");
    expect(imageExtension({ name: "사진", type: "image/webp" })).toBe("webp");
    expect(imageExtension({ name: "사진", type: "image/gif" })).toBe("gif");
  });

  test("타입을 모르면 파일명 확장자를 소문자로 쓴다", () => {
    expect(imageExtension({ name: "photo.JPEG", type: "" })).toBe("jpeg");
  });

  test("타입도 확장자도 없으면 jpg", () => {
    expect(imageExtension({ name: "photo", type: "" })).toBe("jpg");
  });
});

describe("newImagePath", () => {
  test("uuidv4 + 확장자 형태의 경로를 만든다", () => {
    const uuid = "3f2a1b4c-5d6e-4f70-8a91-b2c3d4e5f607";
    expect(newImagePath({ name: "내 사진.png", type: "image/png" }, uuid)).toBe(
      `${uuid}.png`
    );
  });

  test("uuid 를 주지 않으면 매번 다른 uuidv4 를 쓴다(덮어쓰기 방지)", () => {
    const file = { name: "a.png", type: "image/png" };
    const a = newImagePath(file);
    const b = newImagePath(file);
    expect(a).not.toBe(b);
    expect(a).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.png$/
    );
  });

  test("사용자 파일명은 경로에 남기지 않는다(경로 조작·한글 파일명 방지)", () => {
    expect(newImagePath({ name: "../../secret.png", type: "image/png" })).not.toContain(
      ".."
    );
  });
});

describe("validateImageFile", () => {
  test("허용 이미지면 통과한다", () => {
    expect(
      validateImageFile({ name: "a.png", type: "image/png", size: 1024 })
    ).toBe(null);
  });

  test("이미지가 아니면 거절한다", () => {
    expect(
      validateImageFile({ name: "a.pdf", type: "application/pdf", size: 1024 })
    ).toContain("이미지만");
  });

  test("빈 파일은 거절한다", () => {
    expect(
      validateImageFile({ name: "a.png", type: "image/png", size: 0 })
    ).toContain("빈 파일");
  });

  test("용량 한도를 넘으면 거절한다 (경계값 포함)", () => {
    expect(
      validateImageFile({ name: "a.png", type: "image/png", size: MAX_IMAGE_BYTES })
    ).toBe(null);
    expect(
      validateImageFile({
        name: "a.png",
        type: "image/png",
        size: MAX_IMAGE_BYTES + 1,
      })
    ).toContain("MB");
  });
});
