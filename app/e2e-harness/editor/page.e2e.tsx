import { notFound } from "next/navigation";
import { EditorHarness } from "@/components/e2e/EditorHarness";

/**
 * E2E 하니스 라우트 — /e2e-harness/editor
 *
 * 폴더 이름에 밑줄을 쓰지 않는다. `_foo`는 Next.js의 private folder라
 * 폴더와 모든 하위가 라우팅에서 제외된다
 * (node_modules/next/dist/docs/01-app/01-getting-started/02-project-structure.md:257-261).
 *
 * 이 파일은 서버 컴포넌트다. 클라이언트 컴포넌트로 두고 함수 prop을 넘기면
 * 빌드가 깨지므로(Event handlers cannot be passed to Client Component props),
 * no-op 핸들러는 EditorHarness 내부에 둔다.
 *
 * 프로덕션 노출을 막는 검사는 원래 이 파일 하나였다 — 그런데 그 검사가 실제로는
 * 죽은 코드였다(2026-07-30 최종 브랜치 리뷰에서 발견). `NEXT_PUBLIC_*`는 Next.js가
 * **빌드 타임에 인라인**하고 이후 값이 바뀌어도 "더 이상 반응하지 않는다"
 * (node_modules/next/dist/docs/01-app/02-guides/environment-variables.md:164-166).
 * 즉 플래그를 켠 채 만든 빌드에서는 `process.env.NEXT_PUBLIC_E2E !== "1"`이 컴파일
 * 시점에 `"1" !== "1"`로 굳어버려 절대 참이 되지 않는다 — "플래그를 켠 빌드가 실수로
 * 배포되는 경우"를 막는다는 원래 주석의 주장은 바로 그 경우에 이 검사가 무력하다는
 * 뜻이었다. 실측: `grep -rn --include="*.js" -o "process\.env\.NEXT_PUBLIC_[A-Z_]*"
 * .next/server .next/static` → 0건(인라인됨), 반면 인라인된 값 자체는 청크에 남는다.
 *
 * `next.config.ts`의 `pageExtensions` 게이트(빌드 타임)는 여전히 유효하다 — 플래그가
 * 없는 빌드(CI의 `verify:harness`, 정상적인 Vercel 프로덕션)는 이 파일 자체가 페이지로
 * 컴파일되지 않는다. 문제는 그 하나뿐인 겹이 뚫리는 경로 — Vercel 프로젝트 변수에
 * `NEXT_PUBLIC_E2E=1`이 실수로 설정되는 경우 — 를 아무것도 막지 못했다는 것이다.
 * `verify:harness`는 CI에서만 돌고, Vercel 빌드는 CI와 독립이라 CI가 초록이어도
 * 이 사고를 못 잡는다.
 *
 * 그래서 아래에 `NEXT_PUBLIC_E2E`와 **무관한 입력**을 하나 더 본다: `NODE_ENV`.
 * 프레임워크가 프로덕션 빌드에 설정하며 프로젝트 환경변수로 못 바꾼다 — 플래그가
 * 어떤 값이든 프로덕션 빌드라면 무조건 차단한다.
 *
 * 트레이드오프: 이 조건 때문에 `next build && next start`로는 하니스에 대해 E2E를
 * 못 돌린다(그 경로는 항상 NODE_ENV==="production"). 오늘은 문제 없다 —
 * `playwright.config.ts`의 `webServer`는 `npm run dev`를 쓴다(NODE_ENV==="development").
 * 이 조건을 지우고 싶어지면, 지우는 순간 위에서 설명한 사고를 다시 열어준다는 걸
 * 기억할 것.
 */
export default function Page() {
  if (
    process.env.NODE_ENV === "production" ||
    process.env.NEXT_PUBLIC_E2E !== "1"
  ) {
    notFound();
  }
  return <EditorHarness />;
}
