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
 * 차단 2겹 중 **런타임 겹**. 빌드 타임 겹은 next.config.ts의 pageExtensions다.
 * 플래그를 켠 채 만든 빌드가 어쩌다 배포되는 경우를 여기서 막는다.
 */
export default function Page() {
  if (process.env.NEXT_PUBLIC_E2E !== "1") notFound();
  return <EditorHarness />;
}
