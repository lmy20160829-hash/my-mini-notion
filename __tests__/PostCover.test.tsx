import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { PostCover } from "@/components/PostCover";

// PostCover 유닛 검증. 실제 <img>의 네이티브 load/error 이벤트를 fireEvent로 발생시켜
// 목 없이 동작을 검증한다(헌법 II). 상태 식별은 data-cover 속성 계약에 결합.
afterEach(cleanup);

// US1 / FR-004 (quickstart V2): 이미지 로드 완료 → 커버 이미지 노출, 스켈레톤 제거.
test("이미지 로드가 완료되면 커버 이미지가 표시된다 (US1/FR-004)", () => {
  const { container } = render(<PostCover />);

  const img = container.querySelector("img");
  expect(img).not.toBeNull();

  fireEvent.load(img!);

  expect(container.querySelector('[data-cover="image"]')).not.toBeNull();
  expect(container.querySelector('[data-cover="skeleton"]')).toBeNull();
});

// US2 / FR-003, SC-002 (quickstart V1): 로딩 중에는 스켈레톤, 스피너는 절대 없음.
test("로딩 중에는 스켈레톤이 보이고 스피너는 나타나지 않는다 (US2/FR-003)", () => {
  const { container } = render(<PostCover />);

  // 로드 이벤트 전 초기 상태 = 스켈레톤
  expect(container.querySelector('[data-cover="skeleton"]')).not.toBeNull();
  // 스피너 금지
  expect(
    container.querySelector('.spinner, [role="progressbar"], [data-cover="spinner"]')
  ).toBeNull();
});

// US3 / FR-006 (quickstart V3): 이미지 오류 → 중립 폴백, 스켈레톤 제거.
test("이미지 로드 오류 시 중립 폴백이 표시된다 (US3/FR-006)", () => {
  const { container } = render(<PostCover />);
  const img = container.querySelector("img");

  fireEvent.error(img!);

  expect(container.querySelector('[data-cover="fallback"]')).not.toBeNull();
  expect(container.querySelector('[data-cover="skeleton"]')).toBeNull();
});

// US3 / FR-009, SC-005 (quickstart V4): 오류 없이 10초 → 타임아웃 폴백.
test("오류 없이 10초가 지나면 타임아웃으로 폴백이 표시된다 (US3/FR-009)", () => {
  vi.useFakeTimers();
  try {
    const { container } = render(<PostCover />);
    expect(container.querySelector('[data-cover="skeleton"]')).not.toBeNull();

    act(() => {
      vi.advanceTimersByTime(10000);
    });

    expect(container.querySelector('[data-cover="fallback"]')).not.toBeNull();
    expect(container.querySelector('[data-cover="skeleton"]')).toBeNull();
  } finally {
    vi.useRealTimers();
  }
});

// US3 불변식 (quickstart V5): 타임아웃 실패 확정 후 늦은 load는 무시.
test("타임아웃으로 실패 확정된 뒤 늦게 도착한 로드는 폴백을 덮지 않는다 (US3)", () => {
  vi.useFakeTimers();
  try {
    const { container } = render(<PostCover />);
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(container.querySelector('[data-cover="fallback"]')).not.toBeNull();

    const img = container.querySelector("img");
    act(() => {
      fireEvent.load(img!);
    });

    expect(container.querySelector('[data-cover="fallback"]')).not.toBeNull();
    expect(container.querySelector('[data-cover="image"]')).toBeNull();
  } finally {
    vi.useRealTimers();
  }
});

// 출력 무결 (quickstart V6): 언마운트 후 타이머가 만료돼도 경고·에러 없음.
test("언마운트 후 타임아웃이 만료돼도 콘솔 경고·에러가 없다 (출력 무결)", () => {
  const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.useFakeTimers();
  try {
    const { unmount } = render(<PostCover />);
    unmount();
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(errSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
  } finally {
    vi.useRealTimers();
    errSpy.mockRestore();
    warnSpy.mockRestore();
  }
});
