import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "@/lib/auth";

// OAuth 복귀 실패는 ?error_description= 로 전달된다.
// URLSearchParams.get() 은 퍼센트 인코딩과 '+' 를 **이미** 해제해서 돌려준다.
// 여기에 decodeURIComponent 를 한 번 더 걸면 '%' 가 들어간 메시지에서 URIError 가 나고,
// 그 throw 가 마운트 useEffect 안에서 일어나 onAuthStateChange 등록 전에 터진다
// → ready 가 영원히 false 로 남아 앱 전체가 멈춘다.

vi.mock("@/lib/supabase", () => ({
  isSupabaseConfigured: true,
  getSupabase: () => ({
    auth: {
      getSession: async () => ({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    },
  }),
}));

function Probe() {
  const auth = useAuth();
  return (
    <>
      <span data-testid="ready">{String(auth.ready)}</span>
      <span data-testid="error">{auth.error ?? ""}</span>
    </>
  );
}

function renderAt(search: string) {
  window.history.replaceState({}, "", `/login${search}`);
  return render(
    <AuthProvider>
      <Probe />
    </AuthProvider>
  );
}

beforeEach(() => {
  window.history.replaceState({}, "", "/");
});
afterEach(cleanup);

test("퍼센트 기호가 포함된 오류 메시지에도 인증이 계속 동작한다", async () => {
  renderAt("?error_description=Access%20denied%2050%25");

  // 터지지 않고 초기화가 끝나야 한다.
  await waitFor(() => expect(screen.getByTestId("ready").textContent).toBe("true"));
  expect(screen.getByTestId("error").textContent).toBe("Access denied 50%");
});

test("'+' 로 인코딩된 공백은 한 번만 해제한다", async () => {
  renderAt("?error_description=User+denied+access");

  await waitFor(() => expect(screen.getByTestId("ready").textContent).toBe("true"));
  expect(screen.getByTestId("error").textContent).toBe("User denied access");
});

test("리터럴 %20 을 담은 메시지를 공백으로 뭉개지 않는다", async () => {
  renderAt("?error_description=literal%2520escape");

  await waitFor(() => expect(screen.getByTestId("ready").textContent).toBe("true"));
  expect(screen.getByTestId("error").textContent).toBe("literal%20escape");
});
