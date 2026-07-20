import type { NextConfig } from "next";

// GitHub Pages 프로젝트 사이트는 https://<user>.github.io/<repo>/ 하위 경로로 제공된다.
// 그래서 프로덕션(정적 export) 빌드에서만 basePath를 리포지토리 이름에 맞춘다.
// 로컬 `next dev`(development)에서는 basePath 없이 http://localhost:3000 을 그대로 쓴다.
const repo = "mini-notion-next";
const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  // 정적 HTML/CSS/JS export → GitHub Pages 정적 호스팅. **프로덕션 빌드에서만** 켠다.
  //
  // export 모드는 동적 라우트로 들어오는 모든 param이 generateStaticParams()에
  // 열거돼 있을 것을 요구한다. 이 앱의 글 ID는 런타임 데이터(Supabase page 행)라
  // 빌드 시점에 알 수 없어 placeholder 하나만 열거한다(app/(app)/posts/[id]/page.tsx).
  // 그래서 dev에서 export를 켜두면 /posts/<실제id> 직접 접속·새로고침이 500으로 거부된다
  // (목록에서 클릭하는 SPA 이동은 RSC 요청이라 영향 없음).
  // 참고: node_modules/next/dist/docs/01-app/02-guides/static-exports.md §Unsupported Features
  //
  // dev를 일반 서버로 두면 딥링크·새로고침이 살아난다. export 비호환 코드가 섞이는 위험은
  // CI가 `next build`(=프로덕션)를 돌리므로 거기서 계속 걸린다.
  output: isProd ? "export" : undefined,
  trailingSlash: true, // /posts/x → /posts/x/index.html (정적 호스트에서 안전한 경로)
  images: { unoptimized: true }, // 정적 export에는 이미지 최적화 서버가 없음
  basePath: isProd ? `/${repo}` : undefined,
};

export default nextConfig;
