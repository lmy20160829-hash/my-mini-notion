import { PostDetailClient } from "./PostDetailClient";

// 정적 export(`output: "export"`)에서는 동적 라우트마다 generateStaticParams가 필요하다.
// 이 앱의 글은 Supabase `page` 테이블의 런타임 데이터라 빌드 시점에 실제 ID를 알 수 없다
// (사용자별이고 RLS 뒤에 있으며 실행 중에 생성된다).
// export는 최소 1개의 param을 요구하므로 셸 역할의 placeholder 하나만 생성한다.
// 실제 글은 SPA로서 목록('/')에서 클라이언트 전환으로 열리고, ID는 런타임에
// PostDetailClient의 useParams로 해석한다. placeholder 경로로 직접 들어오면
// 해당 글이 없으므로 PostDetailClient가 '/'로 되돌린다.
export function generateStaticParams() {
  return [{ id: "placeholder" }];
}

export default function Page() {
  return <PostDetailClient />;
}
